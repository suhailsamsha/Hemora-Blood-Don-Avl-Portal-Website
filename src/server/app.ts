import type Database from 'better-sqlite3';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  ALERT_CHANNELS,
  BLOOD_COMPONENTS,
  BLOOD_GROUPS,
  COOLDOWN_DAYS,
  COORDINATOR_FALLBACK_HOURS,
  INDIAN_CITIES,
  MANGALORE_AREAS,
  REQUEST_EXPIRY_DAYS,
  URGENCY_LEVELS,
  computeDonorEligibility,
  distanceKm,
  type AlertChannel,
  type AvailabilitySummary,
  type BloodCentreView,
  type BloodCentresPayload,
  type BloodGroup,
  type BloodRequest,
  type CentreStockEntry,
  type ContactRequestView,
  type DonationCamp,
  type DonorProfile,
  type DonorPublic,
  type NotificationDispatchReceipt,
  type RequestAlertDispatchSummary,
  type ShortageHighlight,
  type Urgency,
} from '../shared/types.ts';
import { createAdminRouter } from './adminRoutes.ts';
import {
  decryptPhone,
  encryptPhone,
  generateId,
  generateOtpCode,
  hashOtpCode,
  hashPhone,
  maskPhone,
  normalizeIndianPhone,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './crypto.ts';
import {
  dispatchDonorAlert,
  formatContactRequestMessage,
  formatMatchRequestMessage,
} from './notifications.ts';
import { createRateLimiter } from './rateLimit.ts';
import { requireFirebaseAuth, type AuthRequest } from '../middleware/auth.ts';
import {
  createCloudAppointment,
  getOrCreateUser,
  getUserAccountBundle,
  logCloudDonation,
  removeCentreBookmark,
  saveCentreBookmark,
  updateCloudAppointmentStatus,
  updateUserAccountProfile,
} from '../db/users.ts';

interface DonorRow {
  id: string;
  name: string;
  age: number;
  blood_group: BloodGroup;
  city: string;
  area: string;
  phone_hash: string;
  phone_encrypted: string;
  last_donation: string | null;
  available: number;
  verified: number;
  blocked?: number;
  last_confirmed_at: string;
  alert_channel: AlertChannel;
  created_at: string;
  updated_at: string;
}

interface RequestRow {
  id: string;
  requester_name: string;
  requester_phone_hash: string;
  requester_phone_encrypted: string;
  blood_group: BloodGroup;
  units: number;
  hospital: string;
  city: string;
  area: string;
  urgency: Urgency;
  status: 'open' | 'fulfilled' | 'expired' | 'removed';
  notes: string;
  expires_at: string;
  fulfilled_at: string | null;
  created_at: string;
}

interface ContactRequestRow {
  id: string;
  request_id: string;
  donor_id: string;
  requester_name: string;
  requester_phone_encrypted: string;
  hospital: string;
  units: number;
  urgency: Urgency;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  coordinator_fallback_at: string;
  responded_at: string | null;
  created_at: string;
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || 'Donor';
}

function toDonorPublic(row: DonorRow, now: Date = new Date()): DonorPublic {
  const available = row.available === 1;
  return {
    id: row.id,
    firstName: getFirstName(row.name),
    bloodGroup: row.blood_group,
    city: row.city,
    area: row.area,
    lastDonation: row.last_donation,
    available,
    verified: row.verified === 1,
    lastConfirmedAt: row.last_confirmed_at,
    alertChannel: row.alert_channel,
    eligibility: computeDonorEligibility(
      {
        available,
        lastDonation: row.last_donation,
        lastConfirmedAt: row.last_confirmed_at,
      },
      now
    ),
  };
}

function toBloodRequest(row: RequestRow, contactCount?: number): BloodRequest {
  return {
    id: row.id,
    requesterName: row.requester_name,
    bloodGroup: row.blood_group,
    units: row.units,
    hospital: row.hospital,
    city: row.city,
    area: row.area,
    urgency: row.urgency,
    status: row.status,
    notes: row.notes,
    expiresAt: row.expires_at,
    fulfilledAt: row.fulfilled_at,
    createdAt: row.created_at,
    contactCount,
  };
}

function expireStaleRequests(db: Database.Database, nowIso: string): void {
  db.prepare(
    `UPDATE requests SET status = 'expired' WHERE status = 'open' AND expires_at <= ?`
  ).run(nowIso);
}

function getBearerSession(req: Request): SessionPayload | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifySessionToken(auth.slice(7).trim());
}

function recordAudit(
  db: Database.Database,
  actor: string,
  action: string,
  targetType: string,
  targetId: string,
  summary: string
): void {
  db.prepare(
    `INSERT INTO admin_audit_logs (id, actor, action, target_type, target_id, summary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(generateId('aud'), actor, action, targetType, targetId, summary, new Date().toISOString());
}

export function createApp(db: Database.Database) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  const otpLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyPrefix: 'otp',
  });
  const writeLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 80,
    keyPrefix: 'write',
  });
  const reportLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyPrefix: 'report',
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  // 1. OTP Send & Verify
  app.post('/api/otp/send', otpLimiter, (req: Request, res: Response) => {
    const rawPhone = String(req.body?.phone ?? '');
    const purpose = String(req.body?.purpose ?? 'login');
    const allowedPurposes = ['register', 'login', 'request_contact', 'request_blood', 'respond_request'];
    if (!allowedPurposes.includes(purpose)) {
      res.status(400).json({ error: 'Invalid OTP purpose.' });
      return;
    }

    const normalized = normalizeIndianPhone(rawPhone);
    if (!normalized) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }

    const phoneH = hashPhone(normalized);
    if (purpose === 'register') {
      const existing = db.prepare('SELECT id FROM donors WHERE phone_hash = ?').get(phoneH);
      if (existing) {
        res.status(409).json({
          error: 'This phone number is already registered. Log in to the Donor Dashboard instead.',
        });
        return;
      }
    }

    if (purpose === 'login') {
      const existing = db.prepare('SELECT id FROM donors WHERE phone_hash = ?').get(phoneH);
      if (!existing) {
        res.status(404).json({
          error: 'No donor account found for this phone number. Register as a donor first.',
        });
        return;
      }
    }

    const challengeId = generateId('otp');
    const code = generateOtpCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

    db.prepare(
      `INSERT INTO otp_challenges (id, phone_hash, purpose, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`
    ).run(challengeId, phoneH, purpose, hashOtpCode(challengeId, code), expiresAt, now.toISOString());

    const hideHint = process.env.HIDE_DEV_OTP_HINT === 'true';
    res.json({
      challengeId,
      maskedPhone: maskPhone(normalized),
      expiresInSeconds: 600,
      ...(hideHint ? {} : { devHintCode: code }),
    });
  });

  app.post('/api/otp/verify', otpLimiter, (req: Request, res: Response) => {
    const challengeId = String(req.body?.challengeId ?? '').trim();
    const code = String(req.body?.code ?? '').trim();
    const rawPhone = String(req.body?.phone ?? '').trim();

    if (!challengeId || !/^\d{6}$/.test(code)) {
      res.status(400).json({ error: 'Enter the 6-digit verification code.' });
      return;
    }

    const challenge = db
      .prepare('SELECT * FROM otp_challenges WHERE id = ?')
      .get(challengeId) as
      | {
          id: string;
          phone_hash: string;
          purpose: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          verified_at: string | null;
        }
      | undefined;

    if (!challenge) {
      res.status(404).json({ error: 'Verification session not found. Request a new OTP.' });
      return;
    }
    if (challenge.verified_at) {
      res.status(400).json({ error: 'This OTP code has already been used. Request a new OTP.' });
      return;
    }
    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: 'This OTP has expired. Request a new code.' });
      return;
    }
    if (challenge.attempts >= 5) {
      res.status(429).json({ error: 'Too many wrong attempts. Request a new OTP.' });
      return;
    }

    const expectedHash = hashOtpCode(challengeId, code);
    if (expectedHash !== challenge.code_hash) {
      db.prepare('UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?').run(challengeId);
      res.status(400).json({ error: 'Incorrect 6-digit OTP code.' });
      return;
    }

    if (rawPhone) {
      const normalized = normalizeIndianPhone(rawPhone);
      if (!normalized || hashPhone(normalized) !== challenge.phone_hash) {
        res.status(400).json({ error: 'Phone number does not match the OTP challenge.' });
        return;
      }
    }

    db.prepare('UPDATE otp_challenges SET verified_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      challengeId
    );

    const verificationToken = signSessionToken(
      {
        role: 'requester',
        sub: `${challenge.purpose}:${challenge.phone_hash}`,
      },
      30 * 60
    );

    res.json({ verified: true, verificationToken, purpose: challenge.purpose });
  });

  // 2. Live Availability Summary & Shortages
  app.get('/api/summary', (_req: Request, res: Response) => {
    const now = new Date();
    const rows = db.prepare('SELECT * FROM donors WHERE COALESCE(blocked, 0) = 0').all() as DonorRow[];
    const citySet = new Set<string>(INDIAN_CITIES);
    const groupCounts: Record<BloodGroup, { total: number; verified: number }> = {
      'O+': { total: 0, verified: 0 },
      'O-': { total: 0, verified: 0 },
      'A+': { total: 0, verified: 0 },
      'A-': { total: 0, verified: 0 },
      'B+': { total: 0, verified: 0 },
      'B-': { total: 0, verified: 0 },
      'AB+': { total: 0, verified: 0 },
      'AB-': { total: 0, verified: 0 },
    };

    const cityGroupCounts = new Map<string, number>();
    let totalAvailable = 0;

    for (const row of rows) {
      citySet.add(row.city);
      const pub = toDonorPublic(row, now);
      if (pub.eligibility.isSearchEligible) {
        totalAvailable += 1;
        groupCounts[pub.bloodGroup].total += 1;
        if (pub.verified) {
          groupCounts[pub.bloodGroup].verified += 1;
        }
        const key = `${pub.city}::${pub.bloodGroup}`;
        cityGroupCounts.set(key, (cityGroupCounts.get(key) ?? 0) + 1);
      }
    }

    const openReqRows = db
      .prepare("SELECT city, blood_group FROM requests WHERE status = 'open'")
      .all() as Array<{ city: string; blood_group: BloodGroup }>;
    const openDemandSet = new Set(openReqRows.map((r) => `${r.city}::${r.blood_group}`));

    const shortages: ShortageHighlight[] = [];
    for (const city of Array.from(citySet)) {
      const cityHasAny = BLOOD_GROUPS.some((g) => (cityGroupCounts.get(`${city}::${g}`) ?? 0) > 0);
      if (!cityHasAny) continue;
      for (const bloodGroup of BLOOD_GROUPS) {
        const count = cityGroupCounts.get(`${city}::${bloodGroup}`) ?? 0;
        if (count > 0 && count <= 2) {
          shortages.push({ bloodGroup, city, availableCount: count });
        }
      }
    }

    shortages.sort((a, b) => {
      const aDemand = openDemandSet.has(`${a.city}::${a.bloodGroup}`) ? 0 : 1;
      const bDemand = openDemandSet.has(`${b.city}::${b.bloodGroup}`) ? 0 : 1;
      if (aDemand !== bDemand) return aDemand - bDemand;
      const aNeg = a.bloodGroup.endsWith('-') ? 0 : 1;
      const bNeg = b.bloodGroup.endsWith('-') ? 0 : 1;
      if (aNeg !== bNeg) return aNeg - bNeg;
      return a.availableCount - b.availableCount || a.city.localeCompare(b.city);
    });

    const summary: AvailabilitySummary = {
      totalAvailable,
      totalRegistered: rows.length,
      citiesCount: Array.from(citySet).filter((c) =>
        rows.some((r) => r.city.toLowerCase() === c.toLowerCase())
      ).length,
      byGroup: BLOOD_GROUPS.map((bloodGroup) => ({
        bloodGroup,
        availableCount: groupCounts[bloodGroup].total,
        verifiedAvailableCount: groupCounts[bloodGroup].verified,
      })),
      shortages: shortages.slice(0, 8),
      cityList: Array.from(citySet).sort(),
    };

    res.json(summary);
  });

  // 3. Search Donors (Privacy-preserving: NO phone numbers!)
  app.get('/api/donors', (req: Request, res: Response) => {
    const bloodGroup = String(req.query.bloodGroup ?? '').trim();
    const city = String(req.query.city ?? '').trim().toLowerCase();
    const area = String(req.query.area ?? '').trim().toLowerCase();
    const availableOnly = String(req.query.availableOnly ?? 'true') !== 'false';
    const verifiedOnly = String(req.query.verifiedOnly ?? 'false') === 'true';

    const now = new Date();
    const rows = db
      .prepare('SELECT * FROM donors WHERE COALESCE(blocked, 0) = 0 ORDER BY verified DESC, updated_at DESC')
      .all() as DonorRow[];

    const results: DonorPublic[] = [];
    for (const row of rows) {
      if (bloodGroup && bloodGroup !== 'ALL' && row.blood_group !== bloodGroup) continue;
      if (city && !row.city.toLowerCase().includes(city)) continue;
      if (area && !row.area.toLowerCase().includes(area) && !row.city.toLowerCase().includes(area)) continue;

      const pub = toDonorPublic(row, now);
      // Unconfirmed donors (>90 days without reconfirm) are ALWAYS hidden from search.
      if (!pub.eligibility.isConfirmationFresh) continue;
      if (availableOnly && !pub.eligibility.isSearchEligible) continue;
      if (verifiedOnly && !pub.verified) continue;

      results.push(pub);
    }

    res.json({ donors: results, total: results.length });
  });

  // 4. Donor Registration
  app.post('/api/donors/register', writeLimiter, (req: Request, res: Response) => {
    const name = String(req.body?.name ?? '').trim();
    const age = Number(req.body?.age);
    const bloodGroup = String(req.body?.bloodGroup ?? '').trim() as BloodGroup;
    const city = String(req.body?.city ?? '').trim();
    const area = String(req.body?.area ?? '').trim();
    const rawPhone = String(req.body?.phone ?? '').trim();
    const lastDonationRaw = req.body?.lastDonation ? String(req.body.lastDonation).trim() : null;
    const alertChannel = String(req.body?.alertChannel ?? 'sms') as AlertChannel;
    const consentAccepted = Boolean(req.body?.consentAccepted);
    const verificationToken = String(req.body?.verificationToken ?? '');

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Enter your full name (2 to 80 characters).' });
      return;
    }
    if (!Number.isInteger(age) || age < 18 || age > 65) {
      res.status(400).json({ error: 'Donors must be between 18 and 65 years old.' });
      return;
    }
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      res.status(400).json({ error: 'Select a valid blood group.' });
      return;
    }
    if (!city || !area) {
      res.status(400).json({ error: 'Enter both city and locality/area.' });
      return;
    }
    if (!ALERT_CHANNELS.includes(alertChannel)) {
      res.status(400).json({ error: 'Select SMS or WhatsApp for alert preferences.' });
      return;
    }
    if (!consentAccepted) {
      res.status(400).json({ error: 'Please accept the plain-language consent before registering.' });
      return;
    }

    const normalized = normalizeIndianPhone(rawPhone);
    if (!normalized) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }
    const phoneH = hashPhone(normalized);

    const tokenSession = verifySessionToken(verificationToken);
    if (!tokenSession || tokenSession.sub !== `register:${phoneH}`) {
      res.status(401).json({ error: 'Verify your phone number with OTP before registering.' });
      return;
    }

    if (lastDonationRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(lastDonationRaw)) {
        res.status(400).json({ error: 'Last donation date must be YYYY-MM-DD.' });
        return;
      }
      const d = new Date(`${lastDonationRaw}T00:00:00.000Z`);
      if (Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 86400000) {
        res.status(400).json({ error: 'Last donation date cannot be in the future.' });
        return;
      }
    }

    const existing = db.prepare('SELECT id FROM donors WHERE phone_hash = ?').get(phoneH);
    if (existing) {
      res.status(409).json({
        error: 'This phone number is already registered. Log in to your Donor Dashboard instead.',
      });
      return;
    }

    const id = generateId('dnr');
    const nowIso = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO donors (
          id, name, age, blood_group, city, area, phone_hash, phone_encrypted,
          last_donation, available, verified, last_confirmed_at, alert_channel, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?)`
      ).run(
        id,
        name,
        age,
        bloodGroup,
        city,
        area,
        phoneH,
        encryptPhone(normalized),
        lastDonationRaw,
        nowIso,
        alertChannel,
        nowIso,
        nowIso
      );

      if (lastDonationRaw) {
        db.prepare(
          `INSERT INTO donations (id, donor_id, donated_at, location, units, notes, created_at)
           VALUES (?, ?, ?, ?, 1, ?, ?)`
        ).run(generateId('don'), id, lastDonationRaw, `${city} Blood Bank`, 'Recorded at registration', nowIso);
      }
    });
    tx();

    const row = db.prepare('SELECT * FROM donors WHERE id = ?').get(id) as DonorRow;
    const token = signSessionToken({ role: 'donor', sub: id });

    res.status(201).json({
      token,
      donor: toDonorPublic(row),
    });
  });

  // 5. Donor Login & Dashboard
  app.post('/api/donor/login', otpLimiter, (req: Request, res: Response) => {
    const verificationToken = String(req.body?.verificationToken ?? '');
    const session = verifySessionToken(verificationToken);
    if (!session || !session.sub.startsWith('login:')) {
      res.status(401).json({ error: 'OTP verification required to log in.' });
      return;
    }
    const phoneH = session.sub.slice('login:'.length);
    const row = db.prepare('SELECT * FROM donors WHERE phone_hash = ?').get(phoneH) as DonorRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Donor account not found.' });
      return;
    }
    if (row.blocked === 1) {
      res.status(403).json({ error: 'This donor account has been suspended by an administrator.' });
      return;
    }

    const token = signSessionToken({ role: 'donor', sub: row.id });
    res.json({ token, donorId: row.id });
  });

  function requireDonor(req: Request, res: Response, next: NextFunction) {
    const session = getBearerSession(req);
    if (!session || session.role !== 'donor') {
      res.status(401).json({ error: 'Donor authentication required.' });
      return;
    }
    res.locals.donorId = session.sub;
    next();
  }

  function buildDonorDashboardPayload(donorId: string) {
    const row = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId) as DonorRow | undefined;
    if (!row) return null;

    const now = new Date();
    const pub = toDonorPublic(row, now);
    const donations = db
      .prepare(
        "SELECT * FROM donations WHERE donor_id = ? AND COALESCE(status, 'completed') = 'completed' ORDER BY donated_at DESC, created_at DESC"
      )
      .all(donorId) as Array<{
      id: string;
      donor_id: string;
      donated_at: string;
      location: string;
      units: number;
      notes: string;
      created_at: string;
    }>;

    const appointmentRows = db
      .prepare(
        "SELECT * FROM donations WHERE donor_id = ? AND status = 'scheduled' ORDER BY donated_at ASC, created_at DESC"
      )
      .all(donorId) as Array<{
      id: string;
      donor_id: string;
      donated_at: string;
      time_slot: string | null;
      location: string;
      centre_id: string | null;
      units: number;
      notes: string;
      status: 'scheduled' | 'completed' | 'cancelled';
      created_at: string;
    }>;

    const notifications = db
      .prepare('SELECT * FROM notifications_log WHERE donor_id = ? ORDER BY created_at DESC LIMIT 20')
      .all(donorId) as Array<{
      id: string;
      donor_id: string;
      channel: AlertChannel;
      kind: 'match_alert' | 'reconfirm_reminder' | 'contact_request' | 'appointment_booked';
      message: string;
      created_at: string;
    }>;

    const contactRows = db
      .prepare(
        `SELECT * FROM contact_requests WHERE donor_id = ? ORDER BY created_at DESC LIMIT 25`
      )
      .all(donorId) as ContactRequestRow[];

    const incomingRequests: ContactRequestView[] = contactRows.map((c) => ({
      id: c.id,
      requestId: c.request_id,
      donorId: c.donor_id,
      donorFirstName: pub.firstName,
      donorBloodGroup: pub.bloodGroup,
      donorCity: pub.city,
      donorArea: pub.area,
      donorVerified: pub.verified,
      requesterName: c.requester_name,
      hospital: c.hospital,
      units: c.units,
      urgency: c.urgency,
      status: c.status,
      coordinatorFallbackAt: c.coordinator_fallback_at,
      isFallbackDue:
        c.status === 'pending' && new Date(c.coordinator_fallback_at).getTime() <= now.getTime(),
      requesterPhone: c.status === 'accepted' ? decryptPhone(c.requester_phone_encrypted) : undefined,
      respondedAt: c.responded_at,
      createdAt: c.created_at,
    }));

    const phone = decryptPhone(row.phone_encrypted);

    const profile: DonorProfile = {
      ...pub,
      name: row.name,
      age: row.age,
      phoneMasked: maskPhone(phone),
      createdAt: row.created_at,
      donations: donations.map((d) => ({
        id: d.id,
        donorId: d.donor_id,
        donatedAt: d.donated_at,
        location: d.location,
        units: d.units,
        notes: d.notes,
        createdAt: d.created_at,
      })),
      appointments: appointmentRows.map((a) => ({
        id: a.id,
        donorId: a.donor_id,
        appointmentDate: a.donated_at,
        timeSlot: a.time_slot ?? '',
        location: a.location,
        centreId: a.centre_id ?? null,
        units: a.units,
        notes: a.notes,
        status: a.status,
        createdAt: a.created_at,
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        donorId: n.donor_id,
        channel: n.channel,
        kind: n.kind,
        message: n.message,
        createdAt: n.created_at,
      })),
    };

    return { profile, incomingRequests };
  }

  app.get('/api/donor/me', requireDonor, (_req: Request, res: Response) => {
    const payload = buildDonorDashboardPayload(res.locals.donorId);
    if (!payload) {
      res.status(404).json({ error: 'Donor account not found.' });
      return;
    }
    res.json(payload);
  });

  app.patch('/api/donor/me', requireDonor, writeLimiter, (req: Request, res: Response) => {
    const donorId = res.locals.donorId as string;
    const row = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId) as DonorRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Donor account not found.' });
      return;
    }

    let nextName = row.name;
    if (typeof req.body?.name === 'string') {
      const trimmed = req.body.name.trim();
      if (trimmed.length < 2) {
        res.status(400).json({ error: 'Full name must be at least 2 characters.' });
        return;
      }
      nextName = trimmed;
    }

    let nextAge = row.age;
    if (req.body?.age !== undefined && req.body?.age !== null) {
      const parsedAge = Number(req.body.age);
      if (!Number.isInteger(parsedAge) || parsedAge < 18 || parsedAge > 65) {
        res.status(400).json({ error: 'Donor age must be between 18 and 65.' });
        return;
      }
      nextAge = parsedAge;
    }

    const nextAvailable =
      typeof req.body?.available === 'boolean' ? (req.body.available ? 1 : 0) : row.available;
    const nextChannel =
      req.body?.alertChannel && ALERT_CHANNELS.includes(req.body.alertChannel)
        ? (req.body.alertChannel as AlertChannel)
        : row.alert_channel;
    const nextCity = req.body?.city ? String(req.body.city).trim() : row.city;
    const nextArea = req.body?.area ? String(req.body.area).trim() : row.area;
    const nowIso = new Date().toISOString();
    const nextConfirmedAt = req.body?.reconfirm === true ? nowIso : row.last_confirmed_at;

    db.prepare(
      `UPDATE donors
       SET name = ?, age = ?, available = ?, alert_channel = ?, city = ?, area = ?, last_confirmed_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(nextName, nextAge, nextAvailable, nextChannel, nextCity, nextArea, nextConfirmedAt, nowIso, donorId);

    const payload = buildDonorDashboardPayload(donorId);
    res.json(payload);
  });

  app.post('/api/donor/me/donations', requireDonor, writeLimiter, (req: Request, res: Response) => {
    const donorId = res.locals.donorId as string;
    const donatedAt = String(req.body?.donatedAt ?? '').trim();
    const location = String(req.body?.location ?? '').trim();
    const units = Number(req.body?.units ?? 1);
    const notes = String(req.body?.notes ?? '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(donatedAt)) {
      res.status(400).json({ error: 'Enter a valid donation date (YYYY-MM-DD).' });
      return;
    }
    const dt = new Date(`${donatedAt}T00:00:00.000Z`);
    if (Number.isNaN(dt.getTime()) || dt.getTime() > Date.now() + 86400000) {
      res.status(400).json({ error: 'Donation date cannot be in the future.' });
      return;
    }
    if (location.length < 2) {
      res.status(400).json({ error: 'Enter the blood bank or hospital name.' });
      return;
    }

    const row = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId) as DonorRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Donor account not found.' });
      return;
    }

    // Enforce minimum 90-day recovery gap between whole-blood donations
    const existingDates = db
      .prepare(
        "SELECT donated_at FROM donations WHERE donor_id = ? AND COALESCE(status, 'completed') != 'cancelled'"
      )
      .all(donorId) as Array<{ donated_at: string }>;

    if (row.last_donation && !existingDates.some((e) => e.donated_at === row.last_donation)) {
      existingDates.push({ donated_at: row.last_donation });
    }

    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    for (const ex of existingDates) {
      const exTime = new Date(`${ex.donated_at}T00:00:00.000Z`).getTime();
      if (Number.isNaN(exTime)) continue;
      if (Math.abs(dt.getTime() - exTime) < cooldownMs) {
        const nextEligible = new Date(exTime + cooldownMs).toISOString().slice(0, 10);
        const daysRemaining = Math.max(
          1,
          Math.ceil((exTime + cooldownMs - dt.getTime()) / (24 * 60 * 60 * 1000))
        );
        res.status(409).json({
          error: `You cannot donate within 90 days of your ${ex.donated_at} donation. Next eligible date: ${nextEligible} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`,
          nextEligibleDate: nextEligible,
          daysRemaining,
        });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO donations (id, donor_id, donated_at, location, units, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`
      ).run(generateId('don'), donorId, donatedAt, location, Number.isFinite(units) ? Math.max(1, units) : 1, notes, nowIso);

      const latestDate =
        !row.last_donation || donatedAt > row.last_donation ? donatedAt : row.last_donation;
      db.prepare(
        `UPDATE donors SET last_donation = ?, last_confirmed_at = ?, updated_at = ? WHERE id = ?`
      ).run(latestDate, nowIso, nowIso, donorId);
    });
    tx();

    const payload = buildDonorDashboardPayload(donorId);
    res.status(201).json(payload);
  });

  app.post('/api/donor/me/appointments', requireDonor, writeLimiter, (req: Request, res: Response) => {
    const donorId = res.locals.donorId as string;
    const appointmentDate = String(req.body?.appointmentDate ?? '').trim();
    const timeSlot = String(req.body?.timeSlot ?? '').trim();
    const location = String(req.body?.location ?? '').trim();
    const requestedCentreId = req.body?.centreId ? String(req.body.centreId).trim() : null;
    const notes = String(req.body?.notes ?? '').trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
      res.status(400).json({ error: 'Select a valid appointment date (YYYY-MM-DD).' });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    if (appointmentDate < today) {
      res.status(400).json({ error: 'Appointment date cannot be in the past.' });
      return;
    }
    if (location.length < 2) {
      res.status(400).json({ error: 'Select or enter a nearby blood bank.' });
      return;
    }

    const dt = new Date(`${appointmentDate}T00:00:00.000Z`);
    if (Number.isNaN(dt.getTime())) {
      res.status(400).json({ error: 'Invalid appointment date.' });
      return;
    }

    const row = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId) as DonorRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Donor account not found.' });
      return;
    }

    let resolvedCentreId: string | null = null;
    let resolvedLocation = location;
    if (requestedCentreId) {
      const centre = db
        .prepare('SELECT id, name, area FROM blood_centres WHERE id = ?')
        .get(requestedCentreId) as { id: string; name: string; area: string } | undefined;
      if (centre) {
        resolvedCentreId = centre.id;
        if (!location) {
          resolvedLocation = `${centre.name}, ${centre.area}`;
        }
      }
    }

    // Enforce 90-day cooldown against both completed donations and active scheduled appointments
    const existingDates = db
      .prepare(
        "SELECT donated_at, status FROM donations WHERE donor_id = ? AND COALESCE(status, 'completed') != 'cancelled'"
      )
      .all(donorId) as Array<{ donated_at: string; status: string }>;

    if (row.last_donation && !existingDates.some((e) => e.donated_at === row.last_donation)) {
      existingDates.push({ donated_at: row.last_donation, status: 'completed' });
    }

    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    for (const ex of existingDates) {
      const exTime = new Date(`${ex.donated_at}T00:00:00.000Z`).getTime();
      if (Number.isNaN(exTime)) continue;
      if (Math.abs(dt.getTime() - exTime) < cooldownMs) {
        const nextEligible = new Date(exTime + cooldownMs).toISOString().slice(0, 10);
        const daysRemaining = Math.max(
          1,
          Math.ceil((exTime + cooldownMs - dt.getTime()) / (24 * 60 * 60 * 1000))
        );
        const conflictKind = ex.status === 'scheduled' ? 'scheduled appointment' : 'donation';
        res.status(409).json({
          error: `Selected date (${appointmentDate}) is within 90 days of your ${ex.donated_at} ${conflictKind}. Earliest eligible booking date: ${nextEligible}.`,
          nextEligibleDate: nextEligible,
          daysRemaining,
        });
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const id = generateId('don');
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO donations (id, donor_id, donated_at, time_slot, location, centre_id, units, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'scheduled', ?)`
      ).run(id, donorId, appointmentDate, timeSlot, resolvedLocation, resolvedCentreId, notes, nowIso);

      const slotSuffix = timeSlot ? ` (${timeSlot})` : '';
      db.prepare(
        `INSERT INTO notifications_log (id, donor_id, channel, kind, message, created_at)
         VALUES (?, ?, ?, 'appointment_booked', ?, ?)`
      ).run(
        generateId('ntf'),
        donorId,
        row.alert_channel,
        `Appointment booked at ${resolvedLocation} for ${appointmentDate}${slotSuffix}. Remember to hydrate well before donating.`,
        nowIso
      );
    });
    tx();

    const payload = buildDonorDashboardPayload(donorId);
    res.status(201).json(payload);
  });

  app.patch('/api/donor/me/appointments/:id', requireDonor, writeLimiter, (req: Request, res: Response) => {
    const donorId = res.locals.donorId as string;
    const appointmentId = String(req.params.id);
    const nextStatus = String(req.body?.status ?? '').trim();

    if (nextStatus !== 'completed' && nextStatus !== 'cancelled') {
      res.status(400).json({ error: 'Appointment status must be completed or cancelled.' });
      return;
    }

    const existing = db
      .prepare("SELECT * FROM donations WHERE id = ? AND donor_id = ? AND status = 'scheduled'")
      .get(appointmentId, donorId) as
      | { id: string; donor_id: string; donated_at: string; location: string; status: string }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Scheduled appointment not found.' });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (nextStatus === 'completed' && existing.donated_at > today) {
      res.status(400).json({
        error: `This appointment is scheduled for ${existing.donated_at}. It can only be marked completed on or after that date.`,
      });
      return;
    }

    const donorRow = db.prepare('SELECT last_donation FROM donors WHERE id = ?').get(donorId) as
      | { last_donation: string | null }
      | undefined;
    const nowIso = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare('UPDATE donations SET status = ? WHERE id = ?').run(nextStatus, appointmentId);
      if (nextStatus === 'completed') {
        const latestDate =
          !donorRow?.last_donation || existing.donated_at > donorRow.last_donation
            ? existing.donated_at
            : donorRow.last_donation;
        db.prepare(
          'UPDATE donors SET last_donation = ?, last_confirmed_at = ?, updated_at = ? WHERE id = ?'
        ).run(latestDate, nowIso, nowIso, donorId);
      }
    });
    tx();

    const payload = buildDonorDashboardPayload(donorId);
    res.json(payload);
  });

  app.delete('/api/donor/me', requireDonor, writeLimiter, (_req: Request, res: Response) => {
    const donorId = res.locals.donorId as string;
    const row = db.prepare('SELECT id, city, blood_group FROM donors WHERE id = ?').get(donorId) as
      | { id: string; city: string; blood_group: string }
      | undefined;
    if (!row) {
      res.status(404).json({ error: 'Donor account not found.' });
      return;
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM donors WHERE id = ?').run(donorId);
      recordAudit(
        db,
        'donor_self',
        'delete_donor_data',
        'donor',
        donorId,
        `Donor deleted their profile (${row.city}, ${row.blood_group}).`
      );
    });
    tx();

    res.json({ deleted: true });
  });

  app.post(
    '/api/donor/contact-requests/:id/respond',
    requireDonor,
    writeLimiter,
    (req: Request, res: Response) => {
      const donorId = res.locals.donorId as string;
      const contactId = String(req.params.id);
      const decision = String(req.body?.decision ?? '');
      if (decision !== 'accepted' && decision !== 'declined') {
        res.status(400).json({ error: 'Decision must be accepted or declined.' });
        return;
      }

      const contact = db
        .prepare('SELECT * FROM contact_requests WHERE id = ? AND donor_id = ?')
        .get(contactId, donorId) as ContactRequestRow | undefined;

      if (!contact) {
        res.status(404).json({ error: 'Contact request not found.' });
        return;
      }

      const nowIso = new Date().toISOString();
      db.prepare('UPDATE contact_requests SET status = ?, responded_at = ? WHERE id = ?').run(
        decision,
        nowIso,
        contactId
      );

      const payload = buildDonorDashboardPayload(donorId);
      res.json(payload);
    }
  );

  // 6. Blood Requests Board
  app.get('/api/requests', (req: Request, res: Response) => {
    expireStaleRequests(db, new Date().toISOString());

    const bloodGroup = String(req.query.bloodGroup ?? '').trim();
    const city = String(req.query.city ?? '').trim().toLowerCase();
    const urgency = String(req.query.urgency ?? '').trim();
    const status = String(req.query.status ?? 'open').trim();

    const rows = db
      .prepare(
        `SELECT r.*, (SELECT COUNT(*) FROM contact_requests c WHERE c.request_id = r.id) AS contact_count
         FROM requests r
         WHERE r.status = ? AND COALESCE(r.approval_status, 'pending') != 'rejected'
         ORDER BY
           CASE r.urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END,
           r.created_at DESC`
      )
      .all(status) as Array<RequestRow & { contact_count: number }>;

    const filtered = rows
      .filter((r) => {
        if (bloodGroup && bloodGroup !== 'ALL' && r.blood_group !== bloodGroup) return false;
        if (city && !r.city.toLowerCase().includes(city) && !r.area.toLowerCase().includes(city)) return false;
        if (urgency && urgency !== 'ALL' && r.urgency !== urgency) return false;
        return true;
      })
      .map((r) => toBloodRequest(r, r.contact_count));

    res.json({ requests: filtered, total: filtered.length });
  });

  app.post('/api/requests', writeLimiter, (req: Request, res: Response) => {
    const requesterName = String(req.body?.requesterName ?? '').trim();
    const rawPhone = String(req.body?.phone ?? '').trim();
    const bloodGroup = String(req.body?.bloodGroup ?? '').trim() as BloodGroup;
    const units = Number(req.body?.units);
    const hospital = String(req.body?.hospital ?? '').trim();
    const city = String(req.body?.city ?? '').trim();
    const area = String(req.body?.area ?? '').trim();
    const urgency = String(req.body?.urgency ?? 'urgent').trim() as Urgency;
    const notes = String(req.body?.notes ?? '').trim();
    const verificationToken = String(req.body?.verificationToken ?? '');

    if (requesterName.length < 2) {
      res.status(400).json({ error: 'Enter the patient or family contact name.' });
      return;
    }
    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      res.status(400).json({ error: 'Select a valid blood group.' });
      return;
    }
    if (!Number.isInteger(units) || units < 1 || units > 20) {
      res.status(400).json({ error: 'Units required must be between 1 and 20.' });
      return;
    }
    if (hospital.length < 2 || !city) {
      res.status(400).json({ error: 'Enter hospital name and city.' });
      return;
    }
    if (!URGENCY_LEVELS.includes(urgency)) {
      res.status(400).json({ error: 'Select a valid urgency level.' });
      return;
    }

    const normalized = normalizeIndianPhone(rawPhone);
    if (!normalized) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }
    const phoneH = hashPhone(normalized);
    const session = verifySessionToken(verificationToken);
    if (!session || session.sub !== `request_blood:${phoneH}`) {
      res.status(401).json({ error: 'Verify your phone number with OTP before posting a request.' });
      return;
    }

    const id = generateId('req');
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresAt = new Date(now.getTime() + REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    let matchedNotifiedCount = 0;
    let whatsappCount = 0;
    let smsCount = 0;
    const matchMessage = formatMatchRequestMessage({
      urgency,
      units,
      bloodGroup,
      hospital,
      city,
    });

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO requests (
          id, requester_name, requester_phone_hash, requester_phone_encrypted,
          blood_group, units, hospital, city, area, urgency, status, notes,
          expires_at, fulfilled_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, NULL, ?)`
      ).run(
        id,
        requesterName,
        phoneH,
        encryptPhone(normalized),
        bloodGroup,
        units,
        hospital,
        city,
        area,
        urgency,
        notes,
        expiresAt,
        nowIso
      );

      // Reach principle: notify matching search-eligible donors in the same city via WhatsApp or SMS
      const candidates = db
        .prepare('SELECT * FROM donors WHERE blood_group = ? AND LOWER(city) = LOWER(?)')
        .all(bloodGroup, city) as DonorRow[];

      for (const donor of candidates) {
        const elig = computeDonorEligibility(
          {
            available: donor.available === 1,
            lastDonation: donor.last_donation,
            lastConfirmedAt: donor.last_confirmed_at,
          },
          now
        );
        if (elig.isSearchEligible) {
          dispatchDonorAlert({
            db,
            donorId: donor.id,
            donorFirstName: getFirstName(donor.name),
            donorPhoneNormalized: decryptPhone(donor.phone_encrypted),
            channel: donor.alert_channel,
            kind: 'match_alert',
            messageText: matchMessage,
            createdAt: nowIso,
          });
          matchedNotifiedCount += 1;
          if (donor.alert_channel === 'whatsapp') whatsappCount += 1;
          else smsCount += 1;
        }
      }
    });
    tx();

    const created = db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as RequestRow;
    const requesterToken = signSessionToken({ role: 'requester', sub: `owner:${id}` }, 7 * 24 * 3600);
    const dispatchedSummary: RequestAlertDispatchSummary = {
      total: matchedNotifiedCount,
      whatsappCount,
      smsCount,
      sampleMessage: matchMessage,
      sentAt: nowIso,
    };

    res.status(201).json({
      request: toBloodRequest(created, 0),
      matchedNotifiedCount,
      dispatchedSummary,
      requesterToken,
    });
  });

  app.post('/api/requests/:id/respond', writeLimiter, (req: Request, res: Response) => {
    const requestId = String(req.params.id);
    const requestRow = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as
      | RequestRow
      | undefined;

    if (!requestRow || requestRow.status !== 'open') {
      res.status(404).json({ error: 'Open blood request not found.' });
      return;
    }

    let donor: DonorRow | undefined;
    const donorSession = getBearerSession(req);
    if (donorSession?.role === 'donor') {
      donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorSession.sub) as
        | DonorRow
        | undefined;
    } else if (req.body?.verificationToken) {
      const tokenSession = verifySessionToken(String(req.body.verificationToken));
      if (tokenSession && tokenSession.sub.startsWith('respond_request:')) {
        const phoneH = tokenSession.sub.slice('respond_request:'.length);
        donor = db.prepare('SELECT * FROM donors WHERE phone_hash = ?').get(phoneH) as
          | DonorRow
          | undefined;
      }
    }

    if (!donor) {
      res.status(401).json({
        error: 'Log in as a registered donor or verify your registered donor phone via OTP to respond.',
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const contactId = generateId('creq');
    const fallbackAt = new Date(
      Date.now() + COORDINATOR_FALLBACK_HOURS * 60 * 60 * 1000
    ).toISOString();

    db.prepare(
      `INSERT INTO contact_requests (
        id, request_id, donor_id, requester_name, requester_phone_encrypted,
        hospital, units, urgency, status, coordinator_fallback_at, responded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?, ?, ?)`
    ).run(
      contactId,
      requestRow.id,
      donor.id,
      requestRow.requester_name,
      requestRow.requester_phone_encrypted,
      requestRow.hospital,
      requestRow.units,
      requestRow.urgency,
      fallbackAt,
      nowIso,
      nowIso
    );

    res.status(201).json({
      contactRequestId: contactId,
      requesterName: requestRow.requester_name,
      requesterPhone: decryptPhone(requestRow.requester_phone_encrypted),
      hospital: requestRow.hospital,
      city: requestRow.city,
    });
  });

  app.post('/api/requests/:id/fulfill', writeLimiter, (req: Request, res: Response) => {
    const requestId = String(req.params.id);
    const session = getBearerSession(req);
    const isAdmin = session?.role === 'admin';
    const isOwner = session?.role === 'requester' && session.sub === `owner:${requestId}`;

    if (!isAdmin && !isOwner) {
      res.status(401).json({ error: 'Only the requester or an admin can mark a request fulfilled.' });
      return;
    }

    const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as
      | RequestRow
      | undefined;
    if (!row) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    db.prepare(`UPDATE requests SET status = 'fulfilled', fulfilled_at = ? WHERE id = ?`).run(
      nowIso,
      requestId
    );
    if (isAdmin) {
      recordAudit(
        db,
        'admin',
        'fulfill_request',
        'request',
        requestId,
        `Marked ${row.blood_group} request at ${row.hospital} (${row.city}) fulfilled.`
      );
    }

    const updated = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as RequestRow;
    res.json({ request: toBloodRequest(updated) });
  });

  app.post('/api/requests/:id/renew', writeLimiter, (req: Request, res: Response) => {
    const requestId = String(req.params.id);
    const session = getBearerSession(req);
    const isAdmin = session?.role === 'admin';
    const isOwner = session?.role === 'requester' && session.sub === `owner:${requestId}`;

    if (!isAdmin && !isOwner) {
      res.status(401).json({ error: 'Only the requester or an admin can renew a request.' });
      return;
    }

    const newExpiry = new Date(
      Date.now() + REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    db.prepare(`UPDATE requests SET status = 'open', expires_at = ? WHERE id = ?`).run(
      newExpiry,
      requestId
    );

    const updated = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId) as RequestRow | undefined;
    if (!updated) {
      res.status(404).json({ error: 'Request not found.' });
      return;
    }
    res.json({ request: toBloodRequest(updated) });
  });

  // 7. Request Contact Flow (Family -> Donor with 2h coordinator fallback)
  app.post('/api/contact-requests', writeLimiter, (req: Request, res: Response) => {
    const donorId = String(req.body?.donorId ?? '').trim();
    const requesterName = String(req.body?.requesterName ?? '').trim();
    const rawPhone = String(req.body?.phone ?? '').trim();
    const hospital = String(req.body?.hospital ?? '').trim();
    const units = Number(req.body?.units);
    const urgency = String(req.body?.urgency ?? 'urgent').trim() as Urgency;
    const verificationToken = String(req.body?.verificationToken ?? '');

    if (!donorId || requesterName.length < 2 || hospital.length < 2) {
      res.status(400).json({ error: 'Enter your name, hospital, and select a donor.' });
      return;
    }
    if (!Number.isInteger(units) || units < 1 || units > 10) {
      res.status(400).json({ error: 'Units needed must be between 1 and 10.' });
      return;
    }
    if (!URGENCY_LEVELS.includes(urgency)) {
      res.status(400).json({ error: 'Select a valid urgency level.' });
      return;
    }

    const normalized = normalizeIndianPhone(rawPhone);
    if (!normalized) {
      res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }
    const phoneH = hashPhone(normalized);
    const session = verifySessionToken(verificationToken);
    if (!session || session.sub !== `request_contact:${phoneH}`) {
      res.status(401).json({ error: 'Verify your mobile number via OTP first.' });
      return;
    }

    const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId) as
      | DonorRow
      | undefined;
    if (!donor) {
      res.status(404).json({ error: 'Selected donor not found.' });
      return;
    }

    const now = new Date();
    const elig = computeDonorEligibility(
      {
        available: donor.available === 1,
        lastDonation: donor.last_donation,
        lastConfirmedAt: donor.last_confirmed_at,
      },
      now
    );
    if (!elig.isSearchEligible) {
      res.status(409).json({
        error: 'This donor is currently unavailable or in their 90-day cooldown period.',
      });
      return;
    }

    const nowIso = now.toISOString();
    const requestId = generateId('req');
    const contactRequestId = generateId('creq');
    const expiresAt = new Date(
      now.getTime() + REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    const fallbackAt = new Date(
      now.getTime() + COORDINATOR_FALLBACK_HOURS * 60 * 60 * 1000
    ).toISOString();
    const encryptedPhone = encryptPhone(normalized);

    const contactMessage = formatContactRequestMessage({
      urgency,
      requesterName,
      units,
      bloodGroup: donor.blood_group,
      hospital,
      city: donor.city,
    });
    let notificationDispatch: NotificationDispatchReceipt | undefined;

    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO requests (
          id, requester_name, requester_phone_hash, requester_phone_encrypted,
          blood_group, units, hospital, city, area, urgency, status, notes,
          expires_at, fulfilled_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, NULL, ?)`
      ).run(
        requestId,
        requesterName,
        phoneH,
        encryptedPhone,
        donor.blood_group,
        units,
        hospital,
        donor.city,
        donor.area,
        urgency,
        `Direct contact request initiated for ${hospital}.`,
        expiresAt,
        nowIso
      );

      db.prepare(
        `INSERT INTO contact_requests (
          id, request_id, donor_id, requester_name, requester_phone_encrypted,
          hospital, units, urgency, status, coordinator_fallback_at, responded_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NULL, ?)`
      ).run(
        contactRequestId,
        requestId,
        donor.id,
        requesterName,
        encryptedPhone,
        hospital,
        units,
        urgency,
        fallbackAt,
        nowIso
      );

      notificationDispatch = dispatchDonorAlert({
        db,
        donorId: donor.id,
        donorFirstName: getFirstName(donor.name),
        donorPhoneNormalized: decryptPhone(donor.phone_encrypted),
        channel: donor.alert_channel,
        kind: 'contact_request',
        messageText: contactMessage,
        createdAt: nowIso,
      });
    });
    tx();

    const trackingToken = signSessionToken(
      { role: 'requester', sub: `track:${contactRequestId}` },
      7 * 24 * 3600
    );
    const requesterToken = signSessionToken(
      { role: 'requester', sub: `owner:${requestId}` },
      7 * 24 * 3600
    );

    const view: ContactRequestView = {
      id: contactRequestId,
      requestId,
      donorId: donor.id,
      donorFirstName: getFirstName(donor.name),
      donorBloodGroup: donor.blood_group,
      donorCity: donor.city,
      donorArea: donor.area,
      donorVerified: donor.verified === 1,
      requesterName,
      hospital,
      units,
      urgency,
      status: 'pending',
      coordinatorFallbackAt: fallbackAt,
      isFallbackDue: false,
      respondedAt: null,
      createdAt: nowIso,
    };

    res.status(201).json({
      contactRequest: view,
      trackingToken,
      requesterToken,
      notificationDispatch,
    });
  });

  app.get('/api/contact-requests/:id', (req: Request, res: Response) => {
    const id = String(req.params.id);
    const session = getBearerSession(req);
    const allowed =
      session?.role === 'admin' ||
      (session?.role === 'requester' && session.sub === `track:${id}`);

    if (!allowed) {
      res.status(401).json({ error: 'Tracking token required to view contact status.' });
      return;
    }

    const row = db
      .prepare('SELECT * FROM contact_requests WHERE id = ?')
      .get(id) as ContactRequestRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'Contact request not found.' });
      return;
    }

    const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(row.donor_id) as
      | DonorRow
      | undefined;
    if (!donor) {
      res.status(404).json({ error: 'Donor no longer exists.' });
      return;
    }

    const isFallbackDue =
      row.status === 'pending' && new Date(row.coordinator_fallback_at).getTime() <= Date.now();

    const view: ContactRequestView = {
      id: row.id,
      requestId: row.request_id,
      donorId: row.donor_id,
      donorFirstName: getFirstName(donor.name),
      donorBloodGroup: donor.blood_group,
      donorCity: donor.city,
      donorArea: donor.area,
      donorVerified: donor.verified === 1,
      requesterName: row.requester_name,
      hospital: row.hospital,
      units: row.units,
      urgency: row.urgency,
      status: row.status,
      coordinatorFallbackAt: row.coordinator_fallback_at,
      isFallbackDue,
      // Privacy rule: ONLY share donor phone after donor accepts!
      donorPhone: row.status === 'accepted' ? decryptPhone(donor.phone_encrypted) : undefined,
      respondedAt: row.responded_at,
      createdAt: row.created_at,
    };

    res.json({
      contactRequest: view,
      coordinatorFallback: isFallbackDue
        ? {
            message:
              'No donor response within 2 hours. Contact the duty blood bank coordinator or post directly to the open Blood Requests board.',
            helplineNote:
              '24-hour district blood bank coordinator desk (to be verified against e-RaktKosh / Wenlock District Hospital Blood Bank)',
            stateBloodCellNumber: '104',
          }
        : null,
    });
  });

  // 8. Reports & Feedback
  app.post('/api/reports', reportLimiter, (req: Request, res: Response) => {
    const targetType = String(req.body?.targetType ?? '');
    const targetId = String(req.body?.targetId ?? '').trim();
    const reason = String(req.body?.reason ?? '').trim();
    const details = String(req.body?.details ?? '').trim();

    if ((targetType !== 'donor' && targetType !== 'request') || !targetId || reason.length < 3) {
      res.status(400).json({ error: 'Provide report target and reason.' });
      return;
    }

    const id = generateId('rep');
    db.prepare(
      `INSERT INTO reports (id, target_type, target_id, reason, details, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`
    ).run(id, targetType, targetId, reason, details, new Date().toISOString());

    res.status(201).json({ id, status: 'open' });
  });

  app.post('/api/feedback', reportLimiter, (req: Request, res: Response) => {
    const name = String(req.body?.name ?? 'Anonymous').trim() || 'Anonymous';
    const message = String(req.body?.message ?? '').trim();
    const page = String(req.body?.page ?? 'awareness').trim();

    if (message.length < 4) {
      res.status(400).json({ error: 'Enter at least a short message.' });
      return;
    }

    const id = generateId('fbk');
    db.prepare(
      `INSERT INTO feedback (id, name, message, page, created_at) VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, message, page, new Date().toISOString());

    res.status(201).json({ id });
  });

  // 9. Mangalore Blood Banks, Hospitals, Live Component Stock & Donation Camps Directory
  app.get('/api/centres', (req: Request, res: Response) => {
    const bloodGroup = String(req.query.bloodGroup ?? 'ALL').trim();
    const component = String(req.query.component ?? 'ALL').trim();
    const area = String(req.query.area ?? '').trim().toLowerCase();
    const zone = String(req.query.zone ?? 'ALL').trim();
    const centreType = String(req.query.centreType ?? 'ALL').trim();
    const only24Hour = String(req.query.only24Hour ?? 'false') === 'true';
    const nearestToArea = String(req.query.nearestToArea ?? '').trim();

    const normalizeComponentName = (raw: string): string => {
      if (raw === 'PRBC') return 'Packed Red Cells';
      if (raw === 'FFP') return 'Fresh Frozen Plasma';
      return raw;
    };

    const today = new Date().toISOString().slice(0, 10);
    const centreRows = db
      .prepare('SELECT * FROM blood_centres ORDER BY priority ASC, name ASC')
      .all() as Array<{
      id: string;
      priority: number;
      name: string;
      centre_type: 'Blood bank' | 'Hospital';
      zone: string;
      area: string;
      city: string;
      address: string;
      contact_phone: string;
      is_24_hour: number;
      licence_info: string;
      verification_note: string;
      notes: string;
      lat: number;
      lng: number;
      updated_at: string;
    }>;

    const stockRows = db
      .prepare(
        `SELECT * FROM blood_stock
         WHERE city = 'Mangaluru' AND expiry_date >= ?
         ORDER BY updated_at DESC`
      )
      .all(today) as Array<{
      id: string;
      blood_group: BloodGroup;
      units: number;
      component: string;
      location: string;
      city: string;
      centre_id: string | null;
      collection_date: string;
      expiry_date: string;
      updated_at: string;
    }>;

    const cityGroupTotals: Record<BloodGroup, number> = {
      'O+': 0,
      'O-': 0,
      'A+': 0,
      'A-': 0,
      'B+': 0,
      'B-': 0,
      'AB+': 0,
      'AB-': 0,
    };

    for (const s of stockRows) {
      if (s.units > 0) {
        cityGroupTotals[s.blood_group] = (cityGroupTotals[s.blood_group] ?? 0) + s.units;
      }
    }

    const originArea = nearestToArea
      ? MANGALORE_AREAS.find((a) => a.name.toLowerCase() === nearestToArea.toLowerCase())
      : undefined;

    const requestedComponent = component && component !== 'ALL' ? normalizeComponentName(component) : null;
    const requestedGroup = bloodGroup && bloodGroup !== 'ALL' ? (bloodGroup as BloodGroup) : null;

    const mappedCentres: BloodCentreView[] = centreRows.map((c) => {
      const matchingStock = stockRows.filter(
        (s) =>
          s.units > 0 &&
          (s.centre_id === c.id || s.location.trim().toLowerCase() === c.name.trim().toLowerCase())
      );

      const stockByGroup: Record<BloodGroup, number> = {
        'O+': 0,
        'O-': 0,
        'A+': 0,
        'A-': 0,
        'B+': 0,
        'B-': 0,
        'AB+': 0,
        'AB-': 0,
      };
      const stockByComponent: Record<string, number> = {};
      for (const compName of BLOOD_COMPONENTS) {
        stockByComponent[compName] = 0;
      }

      const entries: CentreStockEntry[] = matchingStock.map((s) => {
        const comp = normalizeComponentName(s.component);
        stockByGroup[s.blood_group] = (stockByGroup[s.blood_group] ?? 0) + s.units;
        stockByComponent[comp] = (stockByComponent[comp] ?? 0) + s.units;
        return {
          id: s.id,
          bloodGroup: s.blood_group,
          component: comp,
          units: s.units,
          isLowStock: s.units <= 2,
          expiryDate: s.expiry_date,
          updatedAt: s.updated_at,
        };
      });

      const totalUnits = entries.reduce((sum, item) => sum + item.units, 0);
      const lastUpdated =
        entries.length > 0
          ? entries.reduce((latest, cur) => (cur.updatedAt > latest ? cur.updatedAt : latest), entries[0].updatedAt)
          : c.updated_at;

      const lowStockGroups = BLOOD_GROUPS.filter((g) => stockByGroup[g] > 0 && stockByGroup[g] <= 2);

      return {
        id: c.id,
        priority: c.priority,
        name: c.name,
        centreType: c.centre_type,
        zone: c.zone,
        area: c.area,
        city: c.city,
        address: c.address,
        contactPhone: c.contact_phone,
        is24Hour: c.is_24_hour === 1,
        licenceInfo: c.licence_info,
        verificationNote: c.verification_note,
        notes: c.notes,
        lat: c.lat,
        lng: c.lng,
        ...(originArea ? { distanceKm: distanceKm(originArea.lat, originArea.lng, c.lat, c.lng) } : {}),
        totalUnits,
        lastUpdated,
        lowStockGroups,
        stockByGroup,
        stockByComponent,
        stockEntries: entries,
      };
    });

    const filteredCentres = mappedCentres.filter((c) => {
      if (area && area !== 'all' && !c.area.toLowerCase().includes(area) && !c.zone.toLowerCase().includes(area)) {
        return false;
      }
      if (zone && zone !== 'ALL' && c.zone !== zone) return false;
      if (centreType && centreType !== 'ALL' && c.centreType !== centreType) return false;
      if (only24Hour && !c.is24Hour) return false;

      if (requestedGroup || requestedComponent) {
        const hasMatch = c.stockEntries.some((entry) => {
          if (requestedGroup && entry.bloodGroup !== requestedGroup) return false;
          if (requestedComponent && entry.component !== requestedComponent) return false;
          return entry.units > 0;
        });
        if (!hasMatch) return false;
      }

      return true;
    });

    if (originArea) {
      filteredCentres.sort((a, b) => {
        const da = a.distanceKm ?? 9999;
        const dbDist = b.distanceKm ?? 9999;
        if (da !== dbDist) return da - dbDist;
        return a.priority - b.priority || a.name.localeCompare(b.name);
      });
    }

    const camps = db
      .prepare(
        `SELECT id, title, city, venue, camp_date AS campDate, start_time AS startTime, end_time AS endTime,
                slots_total AS slotsTotal, slots_booked AS slotsBooked, organizer, status,
                COALESCE(camp_category, 'community') AS campCategory,
                COALESCE(units_collected, 0) AS unitsCollected,
                created_at AS createdAt
         FROM camps
         WHERE city = 'Mangaluru' AND status != 'cancelled'
         ORDER BY CASE status WHEN 'upcoming' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END, camp_date ASC`
      )
      .all() as DonationCamp[];

    const payload: BloodCentresPayload = {
      city: 'Mangaluru',
      centres: filteredCentres,
      cityStockByGroup: BLOOD_GROUPS.map((g) => {
        const units = cityGroupTotals[g] ?? 0;
        const historicalShortageNote =
          g === 'A+' || g === 'AB+'
            ? `${g} has run short in Mangaluru previously — verify stock by phone before travel.`
            : undefined;
        return {
          bloodGroup: g,
          units,
          lowStock: units <= 6,
          ...(historicalShortageNote ? { historicalShortageNote } : {}),
        };
      }),
      camps,
      eRaktKoshUrl: 'https://eraktkosh.mohfw.gov.in',
      verificationNotice:
        'Phone numbers, addresses, and licence details are placeholders marked "to be verified" until confirmed with each blood bank. Cross-check against the national e-RaktKosh directory of licensed blood banks before going live.',
    };

    res.json(payload);
  });

  // 10. Public CMS & Camps read-only feed
  app.get('/api/public/content', (_req: Request, res: Response) => {
    const contents = db
      .prepare('SELECT key, title, body, active, updated_at AS updatedAt FROM site_content WHERE active = 1')
      .all();
    const faqs = db
      .prepare('SELECT id, question, answer, sort_order AS sortOrder FROM faqs ORDER BY sort_order ASC')
      .all();
    const camps = db
      .prepare(
        `SELECT id, title, city, venue, camp_date AS campDate, start_time AS startTime, end_time AS endTime,
                slots_total AS slotsTotal, slots_booked AS slotsBooked, organizer, status,
                COALESCE(camp_category, 'community') AS campCategory,
                COALESCE(units_collected, 0) AS unitsCollected
         FROM camps
         WHERE status IN ('upcoming', 'completed')
         ORDER BY CASE status WHEN 'upcoming' THEN 0 ELSE 1 END, camp_date ASC`
      )
      .all();
    res.json({ contents, faqs, camps });
  });

  // 11. Firebase Auth + Cloud SQL PostgreSQL Account Sync APIs (/api/account/*)
  app.get('/api/account/me', requireFirebaseAuth, async (req: AuthRequest, res: Response) => {
    const uid = req.user?.uid;
    const email = req.user?.email || '';
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized: Missing user identity' });
      return;
    }
    try {
      await getOrCreateUser({
        uid,
        email,
        displayName: typeof req.user?.name === 'string' ? req.user.name : '',
        photoUrl: typeof req.user?.picture === 'string' ? req.user.picture : '',
      });
      const bundle = await getUserAccountBundle(uid);
      res.json(bundle);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unable to sync account data.',
      });
    }
  });

  app.patch(
    '/api/account/profile',
    requireFirebaseAuth,
    writeLimiter,
    async (req: AuthRequest, res: Response) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const displayName =
        typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : undefined;
      const bloodGroup =
        typeof req.body?.bloodGroup === 'string' ? req.body.bloodGroup.trim() : undefined;
      const city = typeof req.body?.city === 'string' ? req.body.city.trim() : undefined;
      const area = typeof req.body?.area === 'string' ? req.body.area.trim() : undefined;
      const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : undefined;
      const alertChannel =
        typeof req.body?.alertChannel === 'string' ? req.body.alertChannel.trim() : undefined;

      if (bloodGroup && !BLOOD_GROUPS.includes(bloodGroup as BloodGroup)) {
        res.status(400).json({ error: 'Invalid blood group selected.' });
        return;
      }
      if (alertChannel && !ALERT_CHANNELS.includes(alertChannel as AlertChannel)) {
        res.status(400).json({ error: 'Alert channel must be sms or whatsapp.' });
        return;
      }

      try {
        await getOrCreateUser({ uid, email: req.user?.email || '' });
        await updateUserAccountProfile(uid, {
          displayName,
          bloodGroup,
          city,
          area,
          phone,
          alertChannel,
        });
        const bundle = await getUserAccountBundle(uid);
        res.json(bundle);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unable to update profile.',
        });
      }
    }
  );

  app.post(
    '/api/account/saved-centres',
    requireFirebaseAuth,
    writeLimiter,
    async (req: AuthRequest, res: Response) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const centreId = String(req.body?.centreId ?? '').trim();
      const centreName = String(req.body?.centreName ?? '').trim();
      const centreArea = String(req.body?.centreArea ?? '').trim();
      const notes = String(req.body?.notes ?? '').trim();

      if (!centreId || !centreName) {
        res.status(400).json({ error: 'Centre ID and name are required.' });
        return;
      }

      try {
        await getOrCreateUser({ uid, email: req.user?.email || '' });
        await saveCentreBookmark(uid, { centreId, centreName, centreArea, notes });
        const bundle = await getUserAccountBundle(uid);
        res.status(201).json(bundle);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unable to save centre bookmark.',
        });
      }
    }
  );

  app.delete(
    '/api/account/saved-centres/:centreId',
    requireFirebaseAuth,
    writeLimiter,
    async (req: AuthRequest, res: Response) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const centreId = String(req.params.centreId ?? '').trim();
      try {
        await removeCentreBookmark(uid, centreId);
        const bundle = await getUserAccountBundle(uid);
        res.json(bundle);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unable to remove saved centre.',
        });
      }
    }
  );

  app.post(
    '/api/account/appointments',
    requireFirebaseAuth,
    writeLimiter,
    async (req: AuthRequest, res: Response) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const centreId = req.body?.centreId ? String(req.body.centreId).trim() : null;
      const centreName = String(req.body?.centreName ?? '').trim();
      const appointmentDate = String(req.body?.appointmentDate ?? '').trim();
      const timeSlot = String(req.body?.timeSlot ?? '').trim();
      const notes = String(req.body?.notes ?? '').trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
        res.status(400).json({ error: 'Enter a valid appointment date (YYYY-MM-DD).' });
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (appointmentDate < today) {
        res.status(400).json({ error: 'Appointment date cannot be in the past.' });
        return;
      }
      if (centreName.length < 2 || !timeSlot) {
        res.status(400).json({ error: 'Select a blood bank and time slot.' });
        return;
      }

      try {
        await getOrCreateUser({ uid, email: req.user?.email || '' });
        await createCloudAppointment(uid, {
          centreId,
          centreName,
          appointmentDate,
          timeSlot,
          notes,
        });
        const bundle = await getUserAccountBundle(uid);
        res.status(201).json(bundle);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unable to schedule appointment.';
        if (msg.startsWith('COOLDOWN_CONFLICT:')) {
          res.status(409).json({ error: msg.slice('COOLDOWN_CONFLICT:'.length) });
          return;
        }
        res.status(500).json({ error: msg });
      }
    }
  );

  app.patch(
    '/api/account/appointments/:id',
    requireFirebaseAuth,
    writeLimiter,
    async (req: AuthRequest, res: Response) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const apptId = Number(req.params.id);
      const status = String(req.body?.status ?? '').trim();
      if (!Number.isInteger(apptId) || apptId <= 0) {
        res.status(400).json({ error: 'Invalid appointment ID.' });
        return;
      }
      if (status !== 'completed' && status !== 'cancelled') {
        res.status(400).json({ error: 'Status must be completed or cancelled.' });
        return;
      }

      try {
        const updated = await updateCloudAppointmentStatus(uid, apptId, status);
        if (!updated) {
          res.status(404).json({ error: 'Appointment not found.' });
          return;
        }
        const bundle = await getUserAccountBundle(uid);
        res.json(bundle);
      } catch (error) {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Unable to update appointment.',
        });
      }
    }
  );

  app.post(
    '/api/account/donations',
    requireFirebaseAuth,
    writeLimiter,
    async (req: AuthRequest, res: Response) => {
      const uid = req.user?.uid;
      if (!uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const donatedAt = String(req.body?.donatedAt ?? '').trim();
      const location = String(req.body?.location ?? '').trim();
      const units = Number(req.body?.units ?? 1);
      const notes = String(req.body?.notes ?? '').trim();

      if (!/^\d{4}-\d{2}-\d{2}$/.test(donatedAt)) {
        res.status(400).json({ error: 'Enter a valid donation date (YYYY-MM-DD).' });
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (donatedAt > today) {
        res.status(400).json({ error: 'Donation date cannot be in the future.' });
        return;
      }
      if (location.length < 2) {
        res.status(400).json({ error: 'Enter a valid blood bank or hospital name.' });
        return;
      }

      try {
        await getOrCreateUser({ uid, email: req.user?.email || '' });
        await logCloudDonation(uid, { donatedAt, location, units, notes });
        const bundle = await getUserAccountBundle(uid);
        res.status(201).json(bundle);
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unable to save donation.';
        if (msg.startsWith('COOLDOWN_CONFLICT:')) {
          res.status(409).json({ error: msg.slice('COOLDOWN_CONFLICT:'.length) });
          return;
        }
        res.status(500).json({ error: msg });
      }
    }
  );

  // 12. Role-Based Admin API (/api/admin/*)
  app.use('/api/admin', createAdminRouter(db));

  return app;
}
