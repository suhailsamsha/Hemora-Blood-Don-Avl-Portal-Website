import type Database from 'better-sqlite3';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  BLOOD_GROUPS,
  INDIAN_CITIES,
  computeDonorEligibility,
  type AdminDonationItem,
  type AdminNotificationItem,
  type AdminOverviewPayload,
  type AdminUserSession,
  type BloodGroup,
  type BloodRequest,
  type BloodStockItem,
  type DonationCamp,
  type FaqItem,
  type ManagedUserRecord,
  type ReportEntry,
  type SiteContentItem,
} from '../shared/types.ts';
import {
  decryptPhone,
  generateId,
  hashPassword,
  maskPhone,
  signSessionToken,
  verifyPassword,
  verifySessionToken,
} from './crypto.ts';
import { getNotificationGatewayMode, triggerExternalGatewayAsync } from './notifications.ts';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'donor' | 'recipient' | 'hospital';
  status: 'active' | 'pending' | 'blocked';
  city: string;
  phone: string;
  verified: number;
  created_at: string;
  updated_at: string;
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

function csvEscape(val: unknown): string {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toStockItem(row: {
  id: string;
  blood_group: BloodGroup;
  units: number;
  component: string;
  location: string;
  city: string;
  centre_id?: string | null;
  collection_date: string;
  expiry_date: string;
  updated_at: string;
}): BloodStockItem {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const isExpired = row.expiry_date < today;
  const isExpiringSoon = !isExpired && row.expiry_date <= sevenDaysAhead;
  return {
    id: row.id,
    bloodGroup: row.blood_group,
    units: row.units,
    component: row.component,
    location: row.location,
    city: row.city,
    collectionDate: row.collection_date,
    expiryDate: row.expiry_date,
    isExpired,
    isExpiringSoon,
    isLowStock: row.units <= 3,
    centreId: row.centre_id ?? null,
    updatedAt: row.updated_at,
  };
}

export function createAdminRouter(db: Database.Database) {
  const router = express.Router();

  // Admin authentication middleware enforcing role === 'admin', active DB user, and non-revoked JWT
  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Admin authentication required.' });
      return;
    }

    const token = auth.slice(7).trim();
    const payload = verifySessionToken(token);
    if (!payload || payload.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Admin role required.' });
      return;
    }

    if (payload.jti) {
      const revoked = db
        .prepare('SELECT 1 FROM revoked_tokens WHERE jti = ?')
        .get(payload.jti);
      if (revoked) {
        res.status(401).json({ error: 'Session has been logged out. Please sign in again.' });
        return;
      }
    }

    const adminUser = db
      .prepare('SELECT id, name, email, role, status FROM users WHERE id = ?')
      .get(payload.sub) as
      | { id: string; name: string; email: string; role: string; status: string }
      | undefined;

    if (!adminUser || adminUser.role !== 'admin' || adminUser.status !== 'active') {
      res.status(403).json({ error: 'Access denied. Active admin account required.' });
      return;
    }

    res.locals.adminUser = {
      id: adminUser.id,
      name: adminUser.name,
      email: adminUser.email,
      role: 'admin',
    } satisfies AdminUserSession;
    res.locals.tokenPayload = payload;
    next();
  }

  // POST /api/admin/login
  router.post('/login', (req: Request, res: Response) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      res.status(400).json({ error: 'Enter both admin email and password.' });
      return;
    }

    const user = db
      .prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)')
      .get(email) as AdminUserRow | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Only admin accounts can access /admin.' });
      return;
    }

    if (user.status !== 'active') {
      res.status(403).json({ error: 'This admin account is deactivated.' });
      return;
    }

    const token = signSessionToken(
      {
        role: 'admin',
        sub: user.id,
        email: user.email,
        name: user.name,
      },
      12 * 3600
    );

    recordAudit(db, user.email, 'admin_login', 'admin', user.id, `Admin ${user.email} signed in.`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
      } satisfies AdminUserSession,
    });
  });

  // POST /api/admin/logout
  router.post('/logout', requireAdmin, (_req: Request, res: Response) => {
    const payload = res.locals.tokenPayload as { jti?: string; exp: number };
    const admin = res.locals.adminUser as AdminUserSession;
    if (payload?.jti) {
      db.prepare('INSERT OR IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)').run(
        payload.jti,
        payload.exp
      );
    }
    recordAudit(db, admin.email, 'admin_logout', 'admin', admin.id, `Admin ${admin.email} logged out.`);
    res.json({ loggedOut: true });
  });

  // GET /api/admin/me
  router.get('/me', requireAdmin, (_req: Request, res: Response) => {
    res.json({ user: res.locals.adminUser as AdminUserSession });
  });

  // 1. Dashboard Overview
  router.get('/overview', requireAdmin, (_req: Request, res: Response) => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const donors = db.prepare('SELECT * FROM donors').all() as Array<{
      id: string;
      name: string;
      blood_group: BloodGroup;
      city: string;
      available: number;
      verified: number;
      blocked: number;
      last_donation: string | null;
      last_confirmed_at: string;
    }>;

    const users = db.prepare('SELECT id, role, status, verified FROM users').all() as Array<{
      id: string;
      role: string;
      status: string;
      verified: number;
    }>;

    const requests = db
      .prepare('SELECT * FROM requests ORDER BY created_at DESC')
      .all() as Array<{
      id: string;
      requester_name: string;
      blood_group: BloodGroup;
      units: number;
      hospital: string;
      city: string;
      area: string;
      urgency: 'critical' | 'urgent' | 'standard';
      status: 'open' | 'fulfilled' | 'expired' | 'removed';
      approval_status: 'pending' | 'approved' | 'rejected';
      rejection_reason: string;
      assigned_to: string;
      notes: string;
      expires_at: string;
      fulfilled_at: string | null;
      created_at: string;
    }>;

    const stockRows = db
      .prepare('SELECT * FROM blood_stock ORDER BY expiry_date ASC')
      .all() as Array<{
      id: string;
      blood_group: BloodGroup;
      units: number;
      component: 'Whole Blood' | 'PRBC' | 'Platelets' | 'FFP';
      location: string;
      city: string;
      collection_date: string;
      expiry_date: string;
      updated_at: string;
    }>;

    const donationRows = db
      .prepare(
        `SELECT d.*, dn.name AS donor_name, dn.blood_group AS donor_blood_group,
                dn.city AS donor_city, dn.last_donation AS donor_last_donation,
                dn.available AS donor_available, dn.last_confirmed_at AS donor_confirmed_at
         FROM donations d
         JOIN donors dn ON dn.id = d.donor_id
         ORDER BY d.donated_at DESC, d.created_at DESC
         LIMIT 6`
      )
      .all() as Array<{
      id: string;
      donor_id: string;
      donor_name: string;
      donor_blood_group: BloodGroup;
      donor_city: string;
      donor_last_donation: string | null;
      donor_available: number;
      donor_confirmed_at: string;
      donated_at: string;
      location: string;
      units: number;
      notes: string;
      status: 'scheduled' | 'completed' | 'cancelled';
      created_at: string;
    }>;

    const openReportsRow = db
      .prepare("SELECT COUNT(*) AS count FROM reports WHERE status = 'open'")
      .get() as { count: number };

    const groupStockMap: Record<BloodGroup, number> = {
      'A+': 0,
      'A-': 0,
      'B+': 0,
      'B-': 0,
      'AB+': 0,
      'AB-': 0,
      'O+': 0,
      'O-': 0,
    };

    const stockItems = stockRows.map(toStockItem);
    let totalUnitsAvailable = 0;
    for (const s of stockItems) {
      if (!s.isExpired) {
        groupStockMap[s.bloodGroup] += s.units;
        totalUnitsAvailable += s.units;
      }
    }

    const stockByGroup = BLOOD_GROUPS.map((bloodGroup) => ({
      bloodGroup,
      units: groupStockMap[bloodGroup],
      lowStock: groupStockMap[bloodGroup] <= 3,
    }));

    const lowStockAlerts = stockByGroup
      .filter((g) => g.lowStock)
      .map((g) => ({
        bloodGroup: g.bloodGroup,
        units: g.units,
        reason: g.units === 0 ? 'Out of stock (0 units)' : `Low stock (${g.units} units remaining)`,
      }));

    const expiredOrExpiringStock = stockItems.filter((s) => s.isExpired || s.isExpiringSoon);

    const cityMap = new Map<string, Record<BloodGroup, number>>();
    for (const c of INDIAN_CITIES) {
      cityMap.set(c, { 'O+': 0, 'O-': 0, 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0 });
    }
    let unverifiedDonors = 0;
    for (const d of donors) {
      if (d.blocked === 1) continue;
      if (d.verified === 0) unverifiedDonors += 1;
      const elig = computeDonorEligibility(
        {
          available: d.available === 1,
          lastDonation: d.last_donation,
          lastConfirmedAt: d.last_confirmed_at,
        },
        now
      );
      if (elig.isSearchEligible) {
        if (!cityMap.has(d.city)) {
          cityMap.set(d.city, { 'O+': 0, 'O-': 0, 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0 });
        }
        cityMap.get(d.city)![d.blood_group] += 1;
      }
    }

    const pendingRequests = requests.filter(
      (r) => r.status === 'open' && r.approval_status === 'pending'
    ).length;
    const pendingHospitals = users.filter((u) => u.status === 'pending').length;

    const recentRequests: BloodRequest[] = requests.slice(0, 6).map((r) => ({
      id: r.id,
      requesterName: r.requester_name,
      bloodGroup: r.blood_group,
      units: r.units,
      hospital: r.hospital,
      city: r.city,
      area: r.area,
      urgency: r.urgency,
      status: r.status,
      approvalStatus: r.approval_status,
      rejectionReason: r.rejection_reason,
      assignedTo: r.assigned_to,
      notes: r.notes,
      expiresAt: r.expires_at,
      fulfilledAt: r.fulfilled_at,
      createdAt: r.created_at,
    }));

    const recentDonations: AdminDonationItem[] = donationRows.map((d) => {
      const elig = computeDonorEligibility(
        {
          available: d.donor_available === 1,
          lastDonation: d.donor_last_donation,
          lastConfirmedAt: d.donor_confirmed_at,
        },
        now
      );
      return {
        id: d.id,
        donorId: d.donor_id,
        donorName: d.donor_name,
        donorBloodGroup: d.donor_blood_group,
        donorCity: d.donor_city,
        donatedAt: d.donated_at,
        location: d.location,
        units: d.units,
        notes: d.notes,
        status: d.status,
        nextEligibleDate: elig.nextEligibleDate,
        isCooldownActive: elig.isCooldownActive,
        createdAt: d.created_at,
      };
    });

    const overdueCount = (
      db
        .prepare("SELECT COUNT(*) AS count FROM contact_requests WHERE status = 'pending' AND coordinator_fallback_at <= ?")
        .get(now.toISOString()) as { count: number }
    ).count;

    const payload: AdminOverviewPayload = {
      summary: {
        totalDonors: donors.length,
        totalRecipients: users.filter((u) => u.role === 'recipient').length,
        totalHospitals: users.filter((u) => u.role === 'hospital').length,
        totalRequests: requests.length,
        pendingApprovals: unverifiedDonors + pendingRequests + pendingHospitals,
        totalUnitsAvailable,
        openAbuseReports: openReportsRow.count,
      },
      stockByGroup,
      lowStockAlerts,
      expiredOrExpiringStock,
      recentRequests,
      recentDonations,
      cityHeatmap: Array.from(cityMap.entries()).map(([city, counts]) => ({ city, counts })),
      unreadNotificationsCount: openReportsRow.count + pendingRequests + overdueCount + lowStockAlerts.length,
    };

    void today;
    res.json(payload);
  });

  // 2. User Management (Donors, Recipients, Hospitals/Blood Banks)
  router.get('/users', requireAdmin, (req: Request, res: Response) => {
    const search = String(req.query.search ?? '').trim().toLowerCase();
    const roleFilter = String(req.query.role ?? 'ALL');
    const statusFilter = String(req.query.status ?? 'ALL');
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 10));
    const now = new Date();

    const donorRows = db.prepare('SELECT * FROM donors ORDER BY created_at DESC').all() as Array<{
      id: string;
      name: string;
      blood_group: BloodGroup;
      city: string;
      area: string;
      phone_encrypted: string;
      last_donation: string | null;
      available: number;
      verified: number;
      blocked: number;
      last_confirmed_at: string;
      created_at: string;
    }>;

    const accountRows = db
      .prepare("SELECT * FROM users WHERE role != 'admin' ORDER BY created_at DESC")
      .all() as AdminUserRow[];

    const combined: ManagedUserRecord[] = [
      ...donorRows.map((d) => {
        const elig = computeDonorEligibility(
          {
            available: d.available === 1,
            lastDonation: d.last_donation,
            lastConfirmedAt: d.last_confirmed_at,
          },
          now
        );
        const status: 'active' | 'pending' | 'blocked' =
          d.blocked === 1 ? 'blocked' : d.verified === 1 ? 'active' : 'pending';
        return {
          id: d.id,
          source: 'donor' as const,
          name: d.name,
          emailOrPhone: maskPhone(decryptPhone(d.phone_encrypted)),
          role: 'donor' as const,
          bloodGroup: d.blood_group,
          city: d.city,
          area: d.area,
          verified: d.verified === 1,
          blocked: d.blocked === 1,
          status,
          lastDonation: d.last_donation,
          eligible: elig.isSearchEligible,
          nextEligibleDate: elig.nextEligibleDate,
          createdAt: d.created_at,
        };
      }),
      ...accountRows.map((u) => ({
        id: u.id,
        source: 'user' as const,
        name: u.name,
        emailOrPhone: u.email,
        role: u.role,
        city: u.city,
        verified: u.verified === 1,
        blocked: u.status === 'blocked',
        status: u.status,
        createdAt: u.created_at,
      })),
    ];

    const filtered = combined.filter((item) => {
      if (roleFilter !== 'ALL' && item.role !== roleFilter) return false;
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
      if (search) {
        const hay = `${item.name} ${item.emailOrPhone} ${item.city} ${item.area ?? ''} ${item.bloodGroup ?? ''}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const items = filtered.slice((safePage - 1) * limit, safePage * limit);

    res.json({ users: items, total, page: safePage, totalPages, limit });
  });

  router.patch('/users/:source/:id', requireAdmin, (req: Request, res: Response) => {
    const source = String(req.params.source);
    const id = String(req.params.id);
    const action = String(req.body?.action ?? '');
    const admin = res.locals.adminUser as AdminUserSession;

    if (!['verify', 'unverify', 'block', 'unblock'].includes(action)) {
      res.status(400).json({ error: 'Invalid user moderation action.' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (source === 'donor') {
      const donor = db.prepare('SELECT id, name, blood_group, city FROM donors WHERE id = ?').get(id) as
        | { id: string; name: string; blood_group: string; city: string }
        | undefined;
      if (!donor) {
        res.status(404).json({ error: 'Donor not found.' });
        return;
      }
      if (action === 'verify') {
        db.prepare('UPDATE donors SET verified = 1, updated_at = ? WHERE id = ?').run(nowIso, id);
      } else if (action === 'unverify') {
        db.prepare('UPDATE donors SET verified = 0, updated_at = ? WHERE id = ?').run(nowIso, id);
      } else if (action === 'block') {
        db.prepare('UPDATE donors SET blocked = 1, available = 0, updated_at = ? WHERE id = ?').run(nowIso, id);
      } else if (action === 'unblock') {
        db.prepare('UPDATE donors SET blocked = 0, updated_at = ? WHERE id = ?').run(nowIso, id);
      }
      recordAudit(
        db,
        admin.email,
        `donor_${action}`,
        'donor',
        id,
        `${action} donor ${donor.name} (${donor.blood_group}, ${donor.city}).`
      );
      res.json({ updated: true, id, action });
      return;
    }

    if (source === 'user') {
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id) as
        | { id: string; name: string; email: string; role: string }
        | undefined;
      if (!user || user.role === 'admin') {
        res.status(404).json({ error: 'User account not found.' });
        return;
      }
      if (action === 'verify') {
        db.prepare("UPDATE users SET verified = 1, status = 'active', updated_at = ? WHERE id = ?").run(nowIso, id);
      } else if (action === 'unverify') {
        db.prepare("UPDATE users SET verified = 0, status = 'pending', updated_at = ? WHERE id = ?").run(nowIso, id);
      } else if (action === 'block') {
        db.prepare("UPDATE users SET status = 'blocked', updated_at = ? WHERE id = ?").run(nowIso, id);
      } else if (action === 'unblock') {
        db.prepare("UPDATE users SET status = 'active', updated_at = ? WHERE id = ?").run(nowIso, id);
      }
      recordAudit(db, admin.email, `user_${action}`, 'user', id, `${action} ${user.role} ${user.name}.`);
      res.json({ updated: true, id, action });
      return;
    }

    res.status(400).json({ error: 'Invalid user source.' });
  });

  router.delete('/users/:source/:id', requireAdmin, (req: Request, res: Response) => {
    const source = String(req.params.source);
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;

    if (source === 'donor') {
      const donor = db.prepare('SELECT id, name FROM donors WHERE id = ?').get(id) as
        | { id: string; name: string }
        | undefined;
      if (!donor) {
        res.status(404).json({ error: 'Donor not found.' });
        return;
      }
      db.prepare('DELETE FROM donors WHERE id = ?').run(id);
      recordAudit(db, admin.email, 'delete_donor', 'donor', id, `Deleted donor ${donor.name}.`);
      res.json({ deleted: true });
      return;
    }

    if (source === 'user') {
      const user = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(id) as
        | { id: string; name: string; role: string }
        | undefined;
      if (!user || user.role === 'admin') {
        res.status(404).json({ error: 'User account not found.' });
        return;
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(id);
      recordAudit(db, admin.email, 'delete_user', 'user', id, `Deleted ${user.role} ${user.name}.`);
      res.json({ deleted: true });
      return;
    }

    res.status(400).json({ error: 'Invalid user source.' });
  });

  // 3. Blood Stock Management
  router.get('/stock', requireAdmin, (_req: Request, res: Response) => {
    const rows = db
      .prepare('SELECT * FROM blood_stock ORDER BY expiry_date ASC')
      .all() as Array<{
      id: string;
      blood_group: BloodGroup;
      units: number;
      component: 'Whole Blood' | 'PRBC' | 'Platelets' | 'FFP';
      location: string;
      city: string;
      collection_date: string;
      expiry_date: string;
      updated_at: string;
    }>;
    res.json({ stock: rows.map(toStockItem) });
  });

  router.post('/stock', requireAdmin, (req: Request, res: Response) => {
    const admin = res.locals.adminUser as AdminUserSession;
    const bloodGroup = String(req.body?.bloodGroup ?? '') as BloodGroup;
    const units = Number(req.body?.units);
    const component = String(req.body?.component ?? 'Whole Blood');
    const location = String(req.body?.location ?? '').trim();
    const city = String(req.body?.city ?? '').trim();
    const centreId = req.body?.centreId ? String(req.body.centreId).trim() : null;
    const collectionDate = String(req.body?.collectionDate ?? '').trim();
    const expiryDate = String(req.body?.expiryDate ?? '').trim();

    if (!BLOOD_GROUPS.includes(bloodGroup)) {
      res.status(400).json({ error: 'Select a valid blood group.' });
      return;
    }
    if (!Number.isInteger(units) || units < 0 || units > 500) {
      res.status(400).json({ error: 'Units must be an integer between 0 and 500.' });
      return;
    }
    if (
      ![
        'Whole Blood',
        'Packed Red Cells',
        'PRBC',
        'Platelets',
        'Fresh Frozen Plasma',
        'FFP',
        'Cryoprecipitate',
      ].includes(component)
    ) {
      res.status(400).json({ error: 'Select a valid blood component.' });
      return;
    }
    if (!location || !city || !/^\d{4}-\d{2}-\d{2}$/.test(collectionDate) || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
      res.status(400).json({ error: 'Provide location, city, collection date, and expiry date.' });
      return;
    }
    if (expiryDate < collectionDate) {
      res.status(400).json({ error: 'Expiry date cannot be earlier than collection date.' });
      return;
    }

    const id = generateId('stk');
    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO blood_stock (id, blood_group, units, component, location, city, centre_id, collection_date, expiry_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, bloodGroup, units, component, location, city, centreId, collectionDate, expiryDate, nowIso, nowIso);

    recordAudit(
      db,
      admin.email,
      'add_stock',
      'blood_stock',
      id,
      `Added ${units} unit(s) of ${bloodGroup} (${component}) at ${location}, ${city}.`
    );

    const row = db.prepare('SELECT * FROM blood_stock WHERE id = ?').get(id) as Parameters<typeof toStockItem>[0];
    res.status(201).json({ item: toStockItem(row) });
  });

  router.patch('/stock/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const existing = db.prepare('SELECT * FROM blood_stock WHERE id = ?').get(id) as
      | Parameters<typeof toStockItem>[0]
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Stock entry not found.' });
      return;
    }

    const units = req.body?.units !== undefined ? Number(req.body.units) : existing.units;
    if (!Number.isInteger(units) || units < 0 || units > 500) {
      res.status(400).json({ error: 'Units must be an integer between 0 and 500.' });
      return;
    }
    const location = req.body?.location ? String(req.body.location).trim() : existing.location;
    const city = req.body?.city ? String(req.body.city).trim() : existing.city;
    const expiryDate = req.body?.expiryDate ? String(req.body.expiryDate).trim() : existing.expiry_date;
    const nowIso = new Date().toISOString();

    db.prepare(
      `UPDATE blood_stock SET units = ?, location = ?, city = ?, expiry_date = ?, updated_at = ? WHERE id = ?`
    ).run(units, location, city, expiryDate, nowIso, id);

    recordAudit(
      db,
      admin.email,
      'update_stock',
      'blood_stock',
      id,
      `Updated ${existing.blood_group} stock at ${location} to ${units} unit(s).`
    );

    const updated = db.prepare('SELECT * FROM blood_stock WHERE id = ?').get(id) as Parameters<typeof toStockItem>[0];
    res.json({ item: toStockItem(updated) });
  });

  router.delete('/stock/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const existing = db.prepare('SELECT * FROM blood_stock WHERE id = ?').get(id) as
      | { id: string; blood_group: string; location: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Stock entry not found.' });
      return;
    }
    db.prepare('DELETE FROM blood_stock WHERE id = ?').run(id);
    recordAudit(
      db,
      admin.email,
      'delete_stock',
      'blood_stock',
      id,
      `Deleted ${existing.blood_group} stock batch at ${existing.location}.`
    );
    res.json({ deleted: true });
  });

  // 4. Blood Requests Moderation & Assignment
  router.get('/requests', requireAdmin, (_req: Request, res: Response) => {
    const rows = db
      .prepare('SELECT * FROM requests ORDER BY created_at DESC')
      .all() as Array<{
      id: string;
      requester_name: string;
      blood_group: BloodGroup;
      units: number;
      hospital: string;
      city: string;
      area: string;
      urgency: 'critical' | 'urgent' | 'standard';
      status: 'open' | 'fulfilled' | 'expired' | 'removed';
      approval_status: 'pending' | 'approved' | 'rejected';
      rejection_reason: string;
      assigned_to: string;
      notes: string;
      expires_at: string;
      fulfilled_at: string | null;
      created_at: string;
    }>;

    const requests: BloodRequest[] = rows.map((r) => ({
      id: r.id,
      requesterName: r.requester_name,
      bloodGroup: r.blood_group,
      units: r.units,
      hospital: r.hospital,
      city: r.city,
      area: r.area,
      urgency: r.urgency,
      status: r.status,
      approvalStatus: r.approval_status,
      rejectionReason: r.rejection_reason,
      assignedTo: r.assigned_to,
      notes: r.notes,
      expiresAt: r.expires_at,
      fulfilledAt: r.fulfilled_at,
      createdAt: r.created_at,
    }));

    res.json({ requests });
  });

  router.patch('/requests/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const action = String(req.body?.action ?? '');
    const row = db.prepare('SELECT * FROM requests WHERE id = ?').get(id) as
      | { id: string; blood_group: string; hospital: string; city: string }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Blood request not found.' });
      return;
    }

    const nowIso = new Date().toISOString();

    if (action === 'approve') {
      db.prepare("UPDATE requests SET approval_status = 'approved', status = 'open', rejection_reason = '' WHERE id = ?").run(id);
      recordAudit(db, admin.email, 'approve_request', 'request', id, `Approved ${row.blood_group} request at ${row.hospital}.`);
    } else if (action === 'reject') {
      const reason = String(req.body?.rejectionReason ?? '').trim();
      if (reason.length < 3) {
        res.status(400).json({ error: 'Provide a rejection reason (at least 3 characters).' });
        return;
      }
      db.prepare("UPDATE requests SET approval_status = 'rejected', status = 'removed', rejection_reason = ? WHERE id = ?").run(
        reason,
        id
      );
      recordAudit(
        db,
        admin.email,
        'reject_request',
        'request',
        id,
        `Rejected ${row.blood_group} request at ${row.hospital}. Reason: ${reason}`
      );
    } else if (action === 'assign') {
      const assignedTo = String(req.body?.assignedTo ?? '').trim();
      if (!assignedTo) {
        res.status(400).json({ error: 'Specify donor or blood bank to assign.' });
        return;
      }
      db.prepare("UPDATE requests SET assigned_to = ?, approval_status = 'approved' WHERE id = ?").run(
        assignedTo,
        id
      );
      recordAudit(
        db,
        admin.email,
        'assign_request',
        'request',
        id,
        `Assigned ${row.blood_group} request at ${row.hospital} to ${assignedTo}.`
      );
    } else if (action === 'fulfill') {
      db.prepare("UPDATE requests SET status = 'fulfilled', approval_status = 'approved', fulfilled_at = ? WHERE id = ?").run(
        nowIso,
        id
      );
      recordAudit(db, admin.email, 'fulfill_request', 'request', id, `Marked ${row.blood_group} request at ${row.hospital} fulfilled.`);
    } else {
      res.status(400).json({ error: 'Invalid request action.' });
      return;
    }

    res.json({ updated: true, id, action });
  });

  // 5. Donations & 90-Day Eligibility
  router.get('/donations', requireAdmin, (_req: Request, res: Response) => {
    const now = new Date();
    const rows = db
      .prepare(
        `SELECT d.*, dn.name AS donor_name, dn.blood_group AS donor_blood_group,
                dn.city AS donor_city, dn.last_donation AS donor_last_donation,
                dn.available AS donor_available, dn.last_confirmed_at AS donor_confirmed_at
         FROM donations d
         JOIN donors dn ON dn.id = d.donor_id
         ORDER BY CASE d.status WHEN 'scheduled' THEN 0 WHEN 'completed' THEN 1 ELSE 2 END, d.donated_at DESC`
      )
      .all() as Array<{
      id: string;
      donor_id: string;
      donor_name: string;
      donor_blood_group: BloodGroup;
      donor_city: string;
      donor_last_donation: string | null;
      donor_available: number;
      donor_confirmed_at: string;
      donated_at: string;
      location: string;
      units: number;
      notes: string;
      status: 'scheduled' | 'completed' | 'cancelled';
      created_at: string;
    }>;

    const donations: AdminDonationItem[] = rows.map((d) => {
      const elig = computeDonorEligibility(
        {
          available: d.donor_available === 1,
          lastDonation: d.donor_last_donation,
          lastConfirmedAt: d.donor_confirmed_at,
        },
        now
      );
      return {
        id: d.id,
        donorId: d.donor_id,
        donorName: d.donor_name,
        donorBloodGroup: d.donor_blood_group,
        donorCity: d.donor_city,
        donatedAt: d.donated_at,
        location: d.location,
        units: d.units,
        notes: d.notes,
        status: d.status,
        nextEligibleDate: elig.nextEligibleDate,
        isCooldownActive: elig.isCooldownActive,
        createdAt: d.created_at,
      };
    });

    res.json({ donations });
  });

  router.post('/donations', requireAdmin, (req: Request, res: Response) => {
    const admin = res.locals.adminUser as AdminUserSession;
    const donorId = String(req.body?.donorId ?? '').trim();
    const donatedAt = String(req.body?.donatedAt ?? '').trim();
    const location = String(req.body?.location ?? '').trim();
    const units = Number(req.body?.units ?? 1);
    const notes = String(req.body?.notes ?? '').trim();
    const status = String(req.body?.status ?? 'scheduled');

    if (!donorId || !/^\d{4}-\d{2}-\d{2}$/.test(donatedAt) || !location) {
      res.status(400).json({ error: 'Donor, date (YYYY-MM-DD), and blood bank location are required.' });
      return;
    }
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }

    const donor = db.prepare('SELECT * FROM donors WHERE id = ?').get(donorId) as
      | { id: string; name: string; last_donation: string | null; last_confirmed_at: string; available: number }
      | undefined;
    if (!donor) {
      res.status(404).json({ error: 'Donor not found.' });
      return;
    }

    if (status === 'completed') {
      const elig = computeDonorEligibility(
        {
          available: donor.available === 1,
          lastDonation: donor.last_donation,
          lastConfirmedAt: donor.last_confirmed_at,
        },
        new Date(`${donatedAt}T00:00:00.000Z`)
      );
      if (elig.isCooldownActive && elig.nextEligibleDate) {
        res.status(409).json({
          error: `Donor is within 90-day recovery gap until ${elig.nextEligibleDate}.`,
        });
        return;
      }
    }

    const id = generateId('don');
    const nowIso = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare(
        `INSERT INTO donations (id, donor_id, donated_at, location, units, notes, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, donorId, donatedAt, location, Number.isFinite(units) ? Math.max(1, units) : 1, notes, status, nowIso);

      if (status === 'completed') {
        const latest = !donor.last_donation || donatedAt > donor.last_donation ? donatedAt : donor.last_donation;
        db.prepare('UPDATE donors SET last_donation = ?, last_confirmed_at = ?, updated_at = ? WHERE id = ?').run(
          latest,
          nowIso,
          nowIso,
          donorId
        );
      }
    });
    tx();

    recordAudit(
      db,
      admin.email,
      `donation_${status}`,
      'donation',
      id,
      `Recorded ${status} donation for ${donor.name} at ${location} (${donatedAt}).`
    );

    res.status(201).json({ id });
  });

  router.patch('/donations/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const status = String(req.body?.status ?? '');
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid donation status.' });
      return;
    }

    const row = db
      .prepare('SELECT d.*, dn.name AS donor_name, dn.last_donation FROM donations d JOIN donors dn ON dn.id = d.donor_id WHERE d.id = ?')
      .get(id) as
      | { id: string; donor_id: string; donated_at: string; location: string; donor_name: string; last_donation: string | null }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Donation record not found.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const tx = db.transaction(() => {
      db.prepare('UPDATE donations SET status = ? WHERE id = ?').run(status, id);
      if (status === 'completed') {
        const latest = !row.last_donation || row.donated_at > row.last_donation ? row.donated_at : row.last_donation;
        db.prepare('UPDATE donors SET last_donation = ?, last_confirmed_at = ?, updated_at = ? WHERE id = ?').run(
          latest,
          nowIso,
          nowIso,
          row.donor_id
        );
      }
    });
    tx();

    recordAudit(
      db,
      admin.email,
      `donation_mark_${status}`,
      'donation',
      id,
      `Marked donation for ${row.donor_name} (${row.location}) as ${status}.`
    );

    res.json({ id, status });
  });

  // 6. Donation Camps / Events
  router.get('/camps', requireAdmin, (_req: Request, res: Response) => {
    const rows = db.prepare('SELECT * FROM camps ORDER BY camp_date DESC').all() as Array<{
      id: string;
      title: string;
      city: string;
      venue: string;
      camp_date: string;
      start_time: string;
      end_time: string;
      slots_total: number;
      slots_booked: number;
      organizer: string;
      status: 'upcoming' | 'completed' | 'cancelled';
      camp_category?: 'college' | 'corporate' | 'community';
      units_collected?: number;
      created_at: string;
    }>;

    const camps: DonationCamp[] = rows.map((c) => ({
      id: c.id,
      title: c.title,
      city: c.city,
      venue: c.venue,
      campDate: c.camp_date,
      startTime: c.start_time,
      endTime: c.end_time,
      slotsTotal: c.slots_total,
      slotsBooked: c.slots_booked,
      organizer: c.organizer,
      status: c.status,
      campCategory: c.camp_category ?? 'community',
      unitsCollected: c.units_collected ?? 0,
      createdAt: c.created_at,
    }));

    res.json({ camps });
  });

  router.post('/camps', requireAdmin, (req: Request, res: Response) => {
    const admin = res.locals.adminUser as AdminUserSession;
    const title = String(req.body?.title ?? '').trim();
    const city = String(req.body?.city ?? '').trim();
    const venue = String(req.body?.venue ?? '').trim();
    const campDate = String(req.body?.campDate ?? '').trim();
    const startTime = String(req.body?.startTime ?? '09:00').trim();
    const endTime = String(req.body?.endTime ?? '15:00').trim();
    const slotsTotal = Number(req.body?.slotsTotal ?? 50);
    const organizer = String(req.body?.organizer ?? '').trim();
    const campCategory = ['college', 'corporate', 'community'].includes(String(req.body?.campCategory))
      ? String(req.body.campCategory)
      : 'community';
    const unitsCollected = Math.max(0, Number(req.body?.unitsCollected ?? 0) || 0);

    if (!title || !city || !venue || !/^\d{4}-\d{2}-\d{2}$/.test(campDate)) {
      res.status(400).json({ error: 'Provide camp title, city, venue, and valid date.' });
      return;
    }
    if (!Number.isInteger(slotsTotal) || slotsTotal < 1 || slotsTotal > 5000) {
      res.status(400).json({ error: 'Slots total must be between 1 and 5000.' });
      return;
    }

    const id = generateId('cmp');
    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO camps (id, title, city, venue, camp_date, start_time, end_time, slots_total, slots_booked, organizer, status, camp_category, units_collected, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'upcoming', ?, ?, ?, ?)`
    ).run(id, title, city, venue, campDate, startTime, endTime, slotsTotal, organizer, campCategory, unitsCollected, nowIso, nowIso);

    recordAudit(db, admin.email, 'create_camp', 'camp', id, `Created donation camp "${title}" in ${city} on ${campDate}.`);
    res.status(201).json({ id });
  });

  router.patch('/camps/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const existing = db.prepare('SELECT * FROM camps WHERE id = ?').get(id) as
      | {
          id: string;
          title: string;
          city: string;
          venue: string;
          camp_date: string;
          start_time: string;
          end_time: string;
          slots_total: number;
          slots_booked: number;
          organizer: string;
          status: string;
        }
      | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Camp not found.' });
      return;
    }

    const title = req.body?.title ? String(req.body.title).trim() : existing.title;
    const city = req.body?.city ? String(req.body.city).trim() : existing.city;
    const venue = req.body?.venue ? String(req.body.venue).trim() : existing.venue;
    const campDate = req.body?.campDate ? String(req.body.campDate).trim() : existing.camp_date;
    const startTime = req.body?.startTime ? String(req.body.startTime).trim() : existing.start_time;
    const endTime = req.body?.endTime ? String(req.body.endTime).trim() : existing.end_time;
    const slotsTotal = req.body?.slotsTotal !== undefined ? Number(req.body.slotsTotal) : existing.slots_total;
    const organizer = req.body?.organizer !== undefined ? String(req.body.organizer).trim() : existing.organizer;
    const status = req.body?.status ? String(req.body.status) : existing.status;

    db.prepare(
      `UPDATE camps SET title = ?, city = ?, venue = ?, camp_date = ?, start_time = ?, end_time = ?, slots_total = ?, organizer = ?, status = ?, updated_at = ?
       WHERE id = ?`
    ).run(title, city, venue, campDate, startTime, endTime, slotsTotal, organizer, status, new Date().toISOString(), id);

    recordAudit(db, admin.email, 'update_camp', 'camp', id, `Updated camp "${title}" (${city}).`);
    res.json({ updated: true, id });
  });

  router.delete('/camps/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const existing = db.prepare('SELECT id, title FROM camps WHERE id = ?').get(id) as
      | { id: string; title: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Camp not found.' });
      return;
    }
    db.prepare('DELETE FROM camps WHERE id = ?').run(id);
    recordAudit(db, admin.email, 'delete_camp', 'camp', id, `Deleted camp "${existing.title}".`);
    res.json({ deleted: true });
  });

  // 7. Notifications Broadcast
  router.get('/notifications', requireAdmin, (_req: Request, res: Response) => {
    const rows = db
      .prepare('SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 50')
      .all() as Array<{
      id: string;
      channel: string;
      blood_group: string;
      city: string;
      subject: string;
      message: string;
      recipients_count: number;
      sent_by: string;
      created_at: string;
    }>;

    const notifications: AdminNotificationItem[] = rows.map((n) => ({
      id: n.id,
      channel: n.channel,
      bloodGroup: n.blood_group,
      city: n.city,
      subject: n.subject,
      message: n.message,
      recipientsCount: n.recipients_count,
      sentBy: n.sent_by,
      createdAt: n.created_at,
    }));

    res.json({ notifications, gatewayMode: getNotificationGatewayMode() });
  });

  router.post('/notifications', requireAdmin, (req: Request, res: Response) => {
    const admin = res.locals.adminUser as AdminUserSession;
    const channel = String(req.body?.channel ?? 'in_app');
    const bloodGroup = String(req.body?.bloodGroup ?? 'ALL');
    const city = String(req.body?.city ?? 'ALL').trim();
    const subject = String(req.body?.subject ?? '').trim();
    const message = String(req.body?.message ?? '').trim();

    if (!['email', 'in_app', 'sms', 'whatsapp'].includes(channel)) {
      res.status(400).json({ error: 'Invalid notification channel.' });
      return;
    }
    if (!subject || message.length < 5) {
      res.status(400).json({ error: 'Provide both subject and alert message.' });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const donors = db.prepare('SELECT * FROM donors WHERE blocked = 0').all() as Array<{
      id: string;
      blood_group: BloodGroup;
      city: string;
      phone_encrypted: string;
      available: number;
      last_donation: string | null;
      last_confirmed_at: string;
      alert_channel: string;
    }>;

    const matching = donors.filter((d) => {
      if (bloodGroup !== 'ALL' && d.blood_group !== bloodGroup) return false;
      if (city !== 'ALL' && city !== '' && d.city.toLowerCase() !== city.toLowerCase()) return false;
      const elig = computeDonorEligibility(
        {
          available: d.available === 1,
          lastDonation: d.last_donation,
          lastConfirmedAt: d.last_confirmed_at,
        },
        now
      );
      return elig.isSearchEligible;
    });

    const id = generateId('anf');
    const fullText = `${subject}: ${message}`;
    const tx = db.transaction(() => {
      const insertDonorNotif = db.prepare(
        `INSERT INTO notifications_log (id, donor_id, channel, kind, message, created_at)
         VALUES (?, ?, ?, 'match_alert', ?, ?)`
      );
      for (const d of matching) {
        insertDonorNotif.run(
          generateId('ntf'),
          d.id,
          channel === 'email' ? d.alert_channel : channel,
          fullText,
          nowIso
        );
      }

      db.prepare(
        `INSERT INTO admin_notifications (id, channel, blood_group, city, subject, message, recipients_count, sent_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, channel, bloodGroup, city || 'ALL', subject, message, matching.length, admin.email, nowIso);
    });
    tx();

    const gatewayMode =
      channel === 'sms' || channel === 'whatsapp' ? getNotificationGatewayMode() : 'portal_queue';

    if ((channel === 'sms' || channel === 'whatsapp') && gatewayMode !== 'portal_queue') {
      for (const d of matching) {
        try {
          const toPhone = decryptPhone(d.phone_encrypted);
          triggerExternalGatewayAsync({
            channel,
            toPhone,
            messageText: fullText,
          });
        } catch {
          // Ignore malformed encrypted phone rows without aborting broadcast
        }
      }
    }

    recordAudit(
      db,
      admin.email,
      'send_broadcast_alert',
      'notification',
      id,
      `Sent ${channel} alert (${bloodGroup}, ${city || 'ALL'}) to ${matching.length} eligible donor(s) via ${gatewayMode}.`
    );

    res.status(201).json({ id, recipientsCount: matching.length, gatewayMode });
  });

  // 8. Reports (Date-range Analytics, CSV Export, & Abuse Reports Moderation)
  function queryReportRows(type: string, from: string, to: string) {
    const fromIso = from ? `${from}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z';
    const toIso = to ? `${to}T23:59:59.999Z` : '2999-12-31T23:59:59.999Z';

    if (type === 'donations') {
      return db
        .prepare(
          `SELECT d.id, dn.name AS donorName, dn.blood_group AS bloodGroup, dn.city, d.location, d.units, d.status, d.donated_at AS date
           FROM donations d
           JOIN donors dn ON dn.id = d.donor_id
           WHERE d.donated_at >= ? AND d.donated_at <= ?
           ORDER BY d.donated_at DESC`
        )
        .all(from || '1970-01-01', to || '2999-12-31') as Array<Record<string, unknown>>;
    }
    if (type === 'requests') {
      return db
        .prepare(
          `SELECT id, requester_name AS requesterName, blood_group AS bloodGroup, units, hospital, city, urgency, status, approval_status AS approvalStatus, created_at AS date
           FROM requests
           WHERE created_at >= ? AND created_at <= ?
           ORDER BY created_at DESC`
        )
        .all(fromIso, toIso) as Array<Record<string, unknown>>;
    }
    return db
      .prepare(
        `SELECT id, blood_group AS bloodGroup, component, units, location, city, collection_date AS collectionDate, expiry_date AS expiryDate
         FROM blood_stock
         WHERE collection_date >= ? AND collection_date <= ?
         ORDER BY expiry_date ASC`
      )
      .all(from || '1970-01-01', to || '2999-12-31') as Array<Record<string, unknown>>;
  }

  router.get('/reports-data', requireAdmin, (req: Request, res: Response) => {
    const type = String(req.query.type ?? 'requests');
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    if (!['donations', 'requests', 'stock'].includes(type)) {
      res.status(400).json({ error: 'Report type must be donations, requests, or stock.' });
      return;
    }

    const rows = queryReportRows(type, from, to);

    const abuseRows = db
      .prepare('SELECT * FROM reports ORDER BY status ASC, created_at DESC')
      .all() as Array<{
      id: string;
      target_type: 'donor' | 'request';
      target_id: string;
      reason: string;
      details: string;
      status: 'open' | 'resolved' | 'dismissed';
      created_at: string;
    }>;

    const abuseReports: ReportEntry[] = abuseRows.map((rep) => ({
      id: rep.id,
      targetType: rep.target_type,
      targetId: rep.target_id,
      targetSummary: `${rep.target_type.toUpperCase()} (${rep.target_id})`,
      reason: rep.reason,
      details: rep.details,
      status: rep.status,
      createdAt: rep.created_at,
    }));

    res.json({ type, from, to, rows, abuseReports });
  });

  router.get('/reports/export', requireAdmin, (req: Request, res: Response) => {
    const type = String(req.query.type ?? 'requests');
    const from = String(req.query.from ?? '').trim();
    const to = String(req.query.to ?? '').trim();
    if (!['donations', 'requests', 'stock'].includes(type)) {
      res.status(400).json({ error: 'Invalid export type.' });
      return;
    }
    const rows = queryReportRows(type, from, to);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : ['id'];
    const csvLines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(',')),
    ];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="blood-portal-${type}-report.csv"`);
    res.send(csvLines.join('\n'));
  });

  router.patch('/abuse-reports/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const status = String(req.body?.status ?? '');
    if (!['resolved', 'dismissed'].includes(status)) {
      res.status(400).json({ error: 'Status must be resolved or dismissed.' });
      return;
    }
    const rep = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as
      | { id: string; target_type: string; target_id: string }
      | undefined;
    if (!rep) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(status, id);
    recordAudit(db, admin.email, `abuse_report_${status}`, rep.target_type, rep.target_id, `Marked report ${id} as ${status}.`);
    res.json({ id, status });
  });

  // 9. Content Management (Announcements, Awareness copy, FAQs)
  router.get('/content', requireAdmin, (_req: Request, res: Response) => {
    const contentRows = db.prepare('SELECT * FROM site_content ORDER BY key ASC').all() as Array<{
      key: string;
      title: string;
      body: string;
      active: number;
      updated_by: string;
      updated_at: string;
    }>;
    const faqRows = db.prepare('SELECT * FROM faqs ORDER BY sort_order ASC, updated_at DESC').all() as Array<{
      id: string;
      question: string;
      answer: string;
      sort_order: number;
      updated_at: string;
    }>;

    const contents: SiteContentItem[] = contentRows.map((c) => ({
      key: c.key,
      title: c.title,
      body: c.body,
      active: c.active === 1,
      updatedBy: c.updated_by,
      updatedAt: c.updated_at,
    }));

    const faqs: FaqItem[] = faqRows.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      sortOrder: f.sort_order,
      updatedAt: f.updated_at,
    }));

    res.json({ contents, faqs });
  });

  router.put('/content/:key', requireAdmin, (req: Request, res: Response) => {
    const key = String(req.params.key).trim();
    const admin = res.locals.adminUser as AdminUserSession;
    const title = String(req.body?.title ?? '').trim();
    const body = String(req.body?.body ?? '').trim();
    const active = req.body?.active === false ? 0 : 1;

    if (!key || !title || !body) {
      res.status(400).json({ error: 'Key, title, and body are required.' });
      return;
    }

    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO site_content (key, title, body, active, updated_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET title = excluded.title, body = excluded.body, active = excluded.active, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
    ).run(key, title, body, active, admin.email, nowIso);

    recordAudit(db, admin.email, 'update_content', 'site_content', key, `Updated "${key}" content block.`);
    res.json({ key, title, body, active: active === 1 });
  });

  router.post('/faqs', requireAdmin, (req: Request, res: Response) => {
    const admin = res.locals.adminUser as AdminUserSession;
    const question = String(req.body?.question ?? '').trim();
    const answer = String(req.body?.answer ?? '').trim();
    const sortOrder = Number(req.body?.sortOrder ?? 10);

    if (question.length < 4 || answer.length < 4) {
      res.status(400).json({ error: 'Question and answer must be at least 4 characters.' });
      return;
    }

    const id = generateId('faq');
    const nowIso = new Date().toISOString();
    db.prepare('INSERT INTO faqs (id, question, answer, sort_order, updated_at) VALUES (?, ?, ?, ?, ?)').run(
      id,
      question,
      answer,
      Number.isFinite(sortOrder) ? sortOrder : 10,
      nowIso
    );
    recordAudit(db, admin.email, 'create_faq', 'faq', id, `Added FAQ: "${question}".`);
    res.status(201).json({ id });
  });

  router.patch('/faqs/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const question = String(req.body?.question ?? '').trim();
    const answer = String(req.body?.answer ?? '').trim();
    if (!question || !answer) {
      res.status(400).json({ error: 'Question and answer are required.' });
      return;
    }
    const existing = db.prepare('SELECT id FROM faqs WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({ error: 'FAQ not found.' });
      return;
    }
    db.prepare('UPDATE faqs SET question = ?, answer = ?, updated_at = ? WHERE id = ?').run(
      question,
      answer,
      new Date().toISOString(),
      id
    );
    recordAudit(db, admin.email, 'update_faq', 'faq', id, `Updated FAQ "${question}".`);
    res.json({ updated: true, id });
  });

  router.delete('/faqs/:id', requireAdmin, (req: Request, res: Response) => {
    const id = String(req.params.id);
    const admin = res.locals.adminUser as AdminUserSession;
    const existing = db.prepare('SELECT id, question FROM faqs WHERE id = ?').get(id) as
      | { id: string; question: string }
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'FAQ not found.' });
      return;
    }
    db.prepare('DELETE FROM faqs WHERE id = ?').run(id);
    recordAudit(db, admin.email, 'delete_faq', 'faq', id, `Deleted FAQ "${existing.question}".`);
    res.json({ deleted: true });
  });

  // 10. Activity Logs, Change Password, Manage Other Admins
  router.get('/audit-logs', requireAdmin, (_req: Request, res: Response) => {
    const rows = db
      .prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100')
      .all() as Array<{
      id: string;
      actor: string;
      action: string;
      target_type: string;
      target_id: string;
      summary: string;
      created_at: string;
    }>;

    res.json({
      logs: rows.map((l) => ({
        id: l.id,
        actor: l.actor,
        action: l.action,
        targetType: l.target_type,
        targetId: l.target_id,
        summary: l.summary,
        createdAt: l.created_at,
      })),
    });
  });

  router.post('/settings/password', requireAdmin, (req: Request, res: Response) => {
    const admin = res.locals.adminUser as AdminUserSession;
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters.' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(admin.id) as AdminUserRow | undefined;
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
      hashPassword(newPassword),
      new Date().toISOString(),
      admin.id
    );

    recordAudit(db, admin.email, 'change_password', 'admin', admin.id, `Admin ${admin.email} changed their password.`);
    res.json({ updated: true });
  });

  router.get('/admins', requireAdmin, (_req: Request, res: Response) => {
    const rows = db
      .prepare("SELECT id, name, email, status, created_at FROM users WHERE role = 'admin' ORDER BY created_at ASC")
      .all() as Array<{ id: string; name: string; email: string; status: string; created_at: string }>;

    res.json({ admins: rows });
  });

  router.post('/admins', requireAdmin, (req: Request, res: Response) => {
    const actor = res.locals.adminUser as AdminUserSession;
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (name.length < 2 || !email.includes('@') || password.length < 8) {
      res.status(400).json({ error: 'Provide name, valid email, and password (min 8 characters).' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const id = generateId('usr');
    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO users (id, name, email, password_hash, role, status, city, phone, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'admin', 'active', '', '', 1, ?, ?)`
    ).run(id, name, email, hashPassword(password), nowIso, nowIso);

    recordAudit(db, actor.email, 'create_admin', 'admin', id, `Created new admin account ${email}.`);
    res.status(201).json({ id, name, email, status: 'active' });
  });

  router.patch('/admins/:id', requireAdmin, (req: Request, res: Response) => {
    const actor = res.locals.adminUser as AdminUserSession;
    const id = String(req.params.id);
    const status = String(req.body?.status ?? '');

    if (id === actor.id) {
      res.status(400).json({ error: 'You cannot deactivate your own active admin session.' });
      return;
    }
    if (!['active', 'blocked'].includes(status)) {
      res.status(400).json({ error: 'Status must be active or blocked.' });
      return;
    }
    const target = db.prepare("SELECT id, email FROM users WHERE id = ? AND role = 'admin'").get(id) as
      | { id: string; email: string }
      | undefined;
    if (!target) {
      res.status(404).json({ error: 'Admin account not found.' });
      return;
    }

    db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(
      status,
      new Date().toISOString(),
      id
    );
    recordAudit(db, actor.email, `admin_${status}`, 'admin', id, `Set admin ${target.email} status to ${status}.`);
    res.json({ id, status });
  });

  router.delete('/admins/:id', requireAdmin, (req: Request, res: Response) => {
    const actor = res.locals.adminUser as AdminUserSession;
    const id = String(req.params.id);
    if (id === actor.id) {
      res.status(400).json({ error: 'You cannot delete your own admin account.' });
      return;
    }
    const target = db.prepare("SELECT id, email FROM users WHERE id = ? AND role = 'admin'").get(id) as
      | { id: string; email: string }
      | undefined;
    if (!target) {
      res.status(404).json({ error: 'Admin account not found.' });
      return;
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    recordAudit(db, actor.email, 'delete_admin', 'admin', id, `Removed admin account ${target.email}.`);
    res.json({ deleted: true });
  });

  return router;
}
