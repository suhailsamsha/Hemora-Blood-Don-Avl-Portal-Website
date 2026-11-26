import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import type { AddressInfo } from 'node:net';
import { openDatabase, runMigrations } from '../src/db/index.ts';
import { seedDatabase, ensureAdminSeedData } from '../src/db/seedData.ts';
import { createApp } from '../src/server/app.ts';
import { computeDonorEligibility } from '../src/shared/types.ts';

describe('Donor eligibility & 90-day rules', () => {
  it('marks donor ineligible during 90-day cooldown and eligible after 90 days', () => {
    const now = new Date('2026-11-19T00:00:00.000Z');
    const recent = computeDonorEligibility(
      {
        available: true,
        lastDonation: '2026-10-01',
        lastConfirmedAt: '2026-11-10T00:00:00.000Z',
      },
      now
    );
    expect(recent.isCooldownActive).toBe(true);
    expect(recent.isSearchEligible).toBe(false);
    expect(recent.nextEligibleDate).toBe('2026-12-30');

    const past = computeDonorEligibility(
      {
        available: true,
        lastDonation: '2026-07-01',
        lastConfirmedAt: '2026-11-10T00:00:00.000Z',
      },
      now
    );
    expect(past.isCooldownActive).toBe(false);
    expect(past.isSearchEligible).toBe(true);
  });

  it('hides donors who have not reconfirmed within 90 days', () => {
    const now = new Date('2026-11-19T00:00:00.000Z');
    const stale = computeDonorEligibility(
      {
        available: true,
        lastDonation: null,
        lastConfirmedAt: '2026-06-01T00:00:00.000Z',
      },
      now
    );
    expect(stale.isConfirmationFresh).toBe(false);
    expect(stale.isSearchEligible).toBe(false);
  });
});

describe('Blood Donation Portal API end-to-end', () => {
  let db: Database.Database;
  let baseUrl: string;
  let closeServer: () => Promise<void>;

  beforeEach(async () => {
    process.env.DISABLE_RATE_LIMIT = 'true';
    db = openDatabase(':memory:');
    runMigrations(db);
    seedDatabase(db);
    ensureAdminSeedData(db);
    const app = createApp(db);
    await new Promise<void>((resolve) => {
      const server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        closeServer = () => new Promise((r) => server.close(() => r()));
        resolve();
      });
    });
  });

  afterEach(async () => {
    await closeServer();
    db.close();
  });

  async function verifyOtp(phone: string, purpose: string) {
    const sendRes = await fetch(`${baseUrl}/api/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, purpose }),
    });
    const sendData = (await sendRes.json()) as { challengeId: string; devHintCode: string };
    expect(sendRes.status).toBe(200);

    const verRes = await fetch(`${baseUrl}/api/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: sendData.challengeId,
        code: sendData.devHintCode,
        phone,
      }),
    });
    const verData = (await verRes.json()) as { verificationToken: string };
    expect(verRes.status).toBe(200);
    return verData.verificationToken;
  }

  it('never leaks phone numbers in public donor search and hides unconfirmed donors', async () => {
    const res = await fetch(`${baseUrl}/api/donors?city=Chennai&availableOnly=false`);
    expect(res.status).toBe(200);
    const bodyText = await res.text();
    expect(bodyText).not.toContain('9840112201');
    expect(bodyText).not.toContain('phone_hash');
    expect(bodyText).not.toContain('phone_encrypted');

    const data = JSON.parse(bodyText) as { donors: Array<{ id: string }> };
    // dnr_chn_07 is overdue (>90d without reconfirm), must be hidden even when availableOnly=false
    expect(data.donors.some((d) => d.id === 'dnr_chn_07')).toBe(false);
    // dnr_chn_03 is in 90-day cooldown -> hidden when availableOnly=true, shown when availableOnly=false
    expect(data.donors.some((d) => d.id === 'dnr_chn_03')).toBe(true);
  });

  it('blocks duplicate phone registration and registers new donor with OTP verification', async () => {
    const dupRes = await fetch(`${baseUrl}/api/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '9840112201', purpose: 'register' }),
    });
    expect(dupRes.status).toBe(409);

    const token = await verifyOtp('9840554433', 'register');
    const regRes = await fetch(`${baseUrl}/api/donors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anand Venkatesh',
        age: 28,
        bloodGroup: 'O-',
        city: 'Chennai',
        area: 'Guindy',
        phone: '9840554433',
        alertChannel: 'whatsapp',
        consentAccepted: true,
        verificationToken: token,
      }),
    });
    expect(regRes.status).toBe(201);
    const regData = (await regRes.json()) as { donor: { verified: boolean; firstName: string } };
    expect(regData.donor.verified).toBe(false);
    expect(regData.donor.firstName).toBe('Anand');
  });

  it('reveals donor phone ONLY after donor accepts contact request', async () => {
    // Family sends contact request to dnr_chn_01 (phone 9840112201)
    const familyToken = await verifyOtp('9840887766', 'request_contact');
    const createRes = await fetch(`${baseUrl}/api/contact-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorId: 'dnr_chn_01',
        requesterName: 'Latha Mohan',
        phone: '9840887766',
        hospital: 'Apollo Main Hospital',
        units: 1,
        urgency: 'critical',
        verificationToken: familyToken,
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      contactRequest: { id: string };
      trackingToken: string;
    };

    // Before donor accepts: donorPhone must NOT be present
    const beforeRes = await fetch(`${baseUrl}/api/contact-requests/${created.contactRequest.id}`, {
      headers: { Authorization: `Bearer ${created.trackingToken}` },
    });
    const beforeData = (await beforeRes.json()) as { contactRequest: { donorPhone?: string; status: string } };
    expect(beforeData.contactRequest.status).toBe('pending');
    expect(beforeData.contactRequest.donorPhone).toBeUndefined();

    // Donor logs in via OTP and accepts
    const donorOtpToken = await verifyOtp('9840112201', 'login');
    const loginRes = await fetch(`${baseUrl}/api/donor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken: donorOtpToken }),
    });
    const loginData = (await loginRes.json()) as { token: string };

    const acceptRes = await fetch(
      `${baseUrl}/api/donor/contact-requests/${created.contactRequest.id}/respond`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${loginData.token}`,
        },
        body: JSON.stringify({ decision: 'accepted' }),
      }
    );
    expect(acceptRes.status).toBe(200);

    // After donor accepts: donorPhone is now shared
    const afterRes = await fetch(`${baseUrl}/api/contact-requests/${created.contactRequest.id}`, {
      headers: { Authorization: `Bearer ${created.trackingToken}` },
    });
    const afterData = (await afterRes.json()) as { contactRequest: { donorPhone?: string; status: string } };
    expect(afterData.contactRequest.status).toBe('accepted');
    expect(afterData.contactRequest.donorPhone).toBe('+919840112201');
  });

  it('enforces RBAC on /api/admin/* and supports full admin platform workflows', async () => {
    const summaryRes = await fetch(`${baseUrl}/api/summary`);
    const summary = (await summaryRes.json()) as { shortages: Array<{ bloodGroup: string; city: string }> };
    expect(summary.shortages.some((s) => s.city === 'Madurai' && s.bloodGroup === 'O-')).toBe(true);

    // Non-admin user role cannot log in to /api/admin/login
    const nonAdminLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ramesh.mdu@example.org', password: 'PortalUser@2026' }),
    });
    expect(nonAdminLogin.status).toBe(403);

    // Donor JWT cannot access /api/admin/overview
    const donorOtp = await verifyOtp('9840112201', 'login');
    const donorLoginRes = await fetch(`${baseUrl}/api/donor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verificationToken: donorOtp }),
    });
    const { token: donorToken } = (await donorLoginRes.json()) as { token: string };
    const blockedAdminOverview = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    expect(blockedAdminOverview.status).toBe(403);

    // Admin login with seeded email & password
    const adminLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@bloodportal.org',
        password: process.env.ADMIN_PASSWORD || 'ishu240707',
      }),
    });
    expect(adminLogin.status).toBe(200);
    const { token: adminToken, user: adminUser } = (await adminLogin.json()) as {
      token: string;
      user: { role: string; email: string };
    };
    expect(adminUser.role).toBe('admin');

    // Overview KPIs & stock by group
    const overviewRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(overviewRes.status).toBe(200);
    const overview = (await overviewRes.json()) as {
      summary: { totalDonors: number; totalUnitsAvailable: number };
      stockByGroup: Array<{ bloodGroup: string; units: number }>;
    };
    expect(overview.summary.totalDonors).toBeGreaterThanOrEqual(15);
    expect(overview.stockByGroup).toHaveLength(8);

    // Verify a donor via User Management API
    const verifyRes = await fetch(`${baseUrl}/api/admin/users/donor/dnr_chn_05`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'verify' }),
    });
    expect(verifyRes.status).toBe(200);

    // Blood Stock CRUD
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const addStockRes = await fetch(`${baseUrl}/api/admin/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bloodGroup: 'O-',
        units: 4,
        component: 'PRBC',
        location: 'Apollo Blood Centre',
        city: 'Chennai',
        collectionDate: today,
        expiryDate: nextMonth,
      }),
    });
    expect(addStockRes.status).toBe(201);

    // Donations 90-day gap enforcement (dnr_chn_03 donated 20 days ago)
    const cooldownViolation = await fetch(`${baseUrl}/api/admin/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        donorId: 'dnr_chn_03',
        donatedAt: today,
        location: 'RGGGH Blood Bank',
        units: 1,
        status: 'completed',
      }),
    });
    expect(cooldownViolation.status).toBe(409);

    // CSV Export
    const csvRes = await fetch(`${baseUrl}/api/admin/reports/export?type=requests`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get('content-type')).toContain('text/csv');

    // Logout revokes token
    const logoutRes = await fetch(`${baseUrl}/api/admin/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(logoutRes.status).toBe(200);

    const afterLogoutMe = await fetch(`${baseUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(afterLogoutMe.status).toBe(401);
  });

  it('serves Mangaluru blood banks, hospitals, component stock, nearest sorting, camps, and donor registry', async () => {
    const allRes = await fetch(`${baseUrl}/api/centres`);
    expect(allRes.status).toBe(200);
    const payload = (await allRes.json()) as {
      city: string;
      centres: Array<{
        id: string;
        priority: number;
        name: string;
        centreType: string;
        area: string;
        is24Hour: boolean;
        contactPhone: string;
        lastUpdated: string;
        distanceKm?: number;
        stockEntries: Array<{ bloodGroup: string; component: string; units: number; updatedAt: string }>;
      }>;
      cityStockByGroup: Array<{
        bloodGroup: string;
        units: number;
        lowStock: boolean;
        historicalShortageNote?: string;
      }>;
      camps: Array<{ id: string; title: string; campCategory?: string; unitsCollected?: number }>;
      eRaktKoshUrl: string;
      verificationNotice: string;
    };

    expect(payload.city).toBe('Mangaluru');
    expect(payload.centres).toHaveLength(12);
    expect(payload.eRaktKoshUrl).toContain('eraktkosh');
    expect(payload.verificationNotice.toLowerCase()).toContain('to be verified');

    const wenlock = payload.centres.find((c) => c.name.includes('Wenlock'));
    expect(wenlock?.priority).toBe(1);
    expect(wenlock?.centreType).toBe('Blood bank');
    expect(wenlock?.area).toBe('Hampankatta');
    expect(wenlock?.is24Hour).toBe(true);
    expect(wenlock?.stockEntries.every((e) => Boolean(e.updatedAt))).toBe(true);

    const aPlus = payload.cityStockByGroup.find((g) => g.bloodGroup === 'A+');
    const abPlus = payload.cityStockByGroup.find((g) => g.bloodGroup === 'AB+');
    expect(aPlus?.lowStock).toBe(true);
    expect(aPlus?.historicalShortageNote).toContain('A+');
    expect(abPlus?.lowStock).toBe(true);
    expect(abPlus?.historicalShortageNote).toContain('AB+');

    // Filter by Cryoprecipitate component
    const cryoRes = await fetch(`${baseUrl}/api/centres?component=Cryoprecipitate`);
    expect(cryoRes.status).toBe(200);
    const cryoData = (await cryoRes.json()) as { centres: Array<{ name: string }> };
    expect(cryoData.centres.length).toBeGreaterThanOrEqual(2);
    expect(cryoData.centres.some((c) => c.name.includes('Father Muller'))).toBe(true);

    // Filter by bloodGroup + component + 24-hour
    const plateletsRes = await fetch(`${baseUrl}/api/centres?bloodGroup=A%2B&component=Platelets&only24Hour=true`);
    expect(plateletsRes.status).toBe(200);
    const plateletsData = (await plateletsRes.json()) as { centres: Array<{ name: string }> };
    expect(plateletsData.centres.some((c) => c.name.includes('Father Muller'))).toBe(true);

    // Nearest blood bank sorting from Deralakatte puts Yenepoya / KS Hegde first
    const nearestRes = await fetch(`${baseUrl}/api/centres?nearestToArea=Deralakatte`);
    expect(nearestRes.status).toBe(200);
    const nearestData = (await nearestRes.json()) as {
      centres: Array<{ area: string; distanceKm?: number }>;
    };
    expect(nearestData.centres[0].area).toBe('Deralakatte');
    expect(typeof nearestData.centres[0].distanceKm).toBe('number');
    expect((nearestData.centres[0].distanceKm ?? 99) <= (nearestData.centres[5].distanceKm ?? 0)).toBe(true);

    // Camps include Infosys 218 units collected + NITK Surathkal + MRPL
    const infosysCamp = payload.camps.find((c) => c.id === 'cmp_mng_infosys');
    expect(infosysCamp?.unitsCollected).toBe(218);
    expect(infosysCamp?.campCategory).toBe('corporate');
    expect(payload.camps.some((c) => c.id === 'cmp_mng_nitk' && c.campCategory === 'college')).toBe(true);

    // Voluntary donors searchable in Surathkal and Mulki
    const surathkalDonorsRes = await fetch(`${baseUrl}/api/donors?city=Mangaluru&area=Surathkal`);
    expect(surathkalDonorsRes.status).toBe(200);
    const surathkalDonors = (await surathkalDonorsRes.json()) as { donors: Array<{ area: string }> };
    expect(surathkalDonors.donors.length).toBeGreaterThanOrEqual(2);

    // Public CMS content endpoint serves announcements, FAQs, and Mangaluru camps
    const contentRes = await fetch(`${baseUrl}/api/public/content`);
    expect(contentRes.status).toBe(200);
    const contentData = (await contentRes.json()) as {
      contents: Array<{ key: string; title: string }>;
      faqs: Array<{ question: string }>;
      camps: Array<{ id: string; unitsCollected?: number }>;
    };
    expect(contentData.contents.length).toBeGreaterThan(0);
    expect(contentData.faqs.length).toBeGreaterThan(0);
    expect(contentData.camps.some((c) => c.id === 'cmp_mng_infosys' && c.unitsCollected === 218)).toBe(true);
  });

  it('links admin stock batches via centreId directly to Mangaluru centres directory', async () => {
    const adminLogin = await fetch(`${baseUrl}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.ADMIN_EMAIL || 'admin@bloodportal.org',
        password: process.env.ADMIN_PASSWORD || 'ishu240707',
      }),
    });
    expect(adminLogin.status).toBe(200);
    const { token: adminToken } = (await adminLogin.json()) as { token: string };

    const today = new Date().toISOString().slice(0, 10);
    const nextYear = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);
    const addStockRes = await fetch(`${baseUrl}/api/admin/stock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bloodGroup: 'B-',
        units: 5,
        component: 'Cryoprecipitate',
        centreId: 'ctr_mng_01',
        location: 'Wenlock District Hospital Blood Bank, Hampankatta',
        city: 'Mangaluru',
        collectionDate: today,
        expiryDate: nextYear,
      }),
    });
    expect(addStockRes.status).toBe(201);

    const centresRes = await fetch(`${baseUrl}/api/centres?bloodGroup=B-&component=Cryoprecipitate`);
    expect(centresRes.status).toBe(200);
    const centresData = (await centresRes.json()) as {
      centres: Array<{ id: string; stockEntries: Array<{ bloodGroup: string; component: string; units: number }> }>;
    };
    const wenlock = centresData.centres.find((c) => c.id === 'ctr_mng_01');
    expect(wenlock).toBeDefined();
    expect(
      wenlock?.stockEntries.some(
        (e) => e.bloodGroup === 'B-' && e.component === 'Cryoprecipitate' && e.units >= 5
      )
    ).toBe(true);
  });

  it('handles changed ADMIN_EMAIL in ensureAdminSeedData without UNIQUE constraint error', () => {
    const prevEmail = process.env.ADMIN_EMAIL;
    try {
      process.env.ADMIN_EMAIL = 'coordinator2@bloodportal.org';
      expect(() => ensureAdminSeedData(db)).not.toThrow();
      const row = db
        .prepare('SELECT id, role, status FROM users WHERE LOWER(email) = LOWER(?)')
        .get('coordinator2@bloodportal.org') as { id: string; role: string; status: string } | undefined;
      expect(row?.role).toBe('admin');
      expect(row?.status).toBe('active');
    } finally {
      if (prevEmail === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = prevEmail;
    }
  });

  it('enforces 90-day cooldown on donor self-logged donations, saves profile edits, and dispatches WhatsApp/SMS alerts on blood requests', async () => {
    // 1. Register new donor with no prior donations
    const regOtp = await verifyOtp('9845799887', 'register');
    const regRes = await fetch(`${baseUrl}/api/donors/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vikram Shetty',
        age: 29,
        bloodGroup: 'A+',
        city: 'Mangaluru',
        area: 'Hampankatta',
        phone: '9845799887',
        alertChannel: 'whatsapp',
        consentAccepted: true,
        verificationToken: regOtp,
      }),
    });
    expect(regRes.status).toBe(201);
    const { token: donorToken } = (await regRes.json()) as { token: string };

    // 2. Save updated profile fields via PATCH /api/donor/me
    const patchRes = await fetch(`${baseUrl}/api/donor/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        name: 'Vikram K Shetty',
        age: 30,
        city: 'Mangaluru',
        area: 'Kankanady',
        alertChannel: 'whatsapp',
      }),
    });
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()) as {
      profile: { id: string; name: string; age: number; area: string };
    };
    expect(patched.profile.name).toBe('Vikram K Shetty');
    expect(patched.profile.age).toBe(30);
    expect(patched.profile.area).toBe('Kankanady');

    // 3. Log a donation 120 days ago (allowed -> 201), then attempt another 30 days later (blocked -> 409)
    const daysAgo120 = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
    const daysAgo90Minus = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const firstDonRes = await fetch(`${baseUrl}/api/donor/me/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        donatedAt: daysAgo120,
        location: 'Wenlock District Hospital Blood Bank',
        units: 1,
      }),
    });
    expect(firstDonRes.status).toBe(201);

    const blockedDonRes = await fetch(`${baseUrl}/api/donor/me/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        donatedAt: daysAgo90Minus,
        location: 'Father Muller Blood Bank',
        units: 1,
      }),
    });
    expect(blockedDonRes.status).toBe(409);

    // 120 days ago -> today is >= 90 days, so donating today succeeds
    const secondDonRes = await fetch(`${baseUrl}/api/donor/me/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        donatedAt: today,
        location: 'KMC Hospital Blood Centre, Attavar',
        units: 1,
      }),
    });
    expect(secondDonRes.status).toBe(201);

    // Immediately attempting another donation today is blocked by 90-day rule
    const repeatTodayRes = await fetch(`${baseUrl}/api/donor/me/donations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        donatedAt: today,
        location: 'KMC Hospital Blood Centre, Attavar',
        units: 1,
      }),
    });
    expect(repeatTodayRes.status).toBe(409);

    // 4. Direct contact request to an eligible Mangaluru donor returns WhatsApp/SMS notificationDispatch receipt
    const reqOtp = await verifyOtp('9845711223', 'request_contact');
    const contactRes = await fetch(`${baseUrl}/api/contact-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donorId: 'dnr_mng_01',
        requesterName: 'Suresh Pai',
        phone: '9845711223',
        hospital: 'Father Muller Hospital, Kankanady',
        units: 2,
        urgency: 'critical',
        verificationToken: reqOtp,
      }),
    });
    expect(contactRes.status).toBe(201);
    const contactData = (await contactRes.json()) as {
      notificationDispatch?: { channel: string; messageText: string; recipientMasked: string };
    };
    expect(contactData.notificationDispatch).toBeDefined();
    expect(contactData.notificationDispatch?.messageText).toContain('Father Muller Hospital');
    expect(['whatsapp', 'sms']).toContain(contactData.notificationDispatch?.channel);

    // 5. City-wide blood request returns dispatchedSummary with WhatsApp/SMS counts
    const broadcastOtp = await verifyOtp('9845722334', 'request_blood');
    const reqCreateRes = await fetch(`${baseUrl}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requesterName: 'Divya Hegde',
        phone: '9845722334',
        bloodGroup: 'O+',
        units: 1,
        hospital: 'Wenlock District Hospital',
        city: 'Mangaluru',
        area: 'Hampankatta',
        urgency: 'urgent',
        verificationToken: broadcastOtp,
      }),
    });
    expect(reqCreateRes.status).toBe(201);
    const reqCreateData = (await reqCreateRes.json()) as {
      matchedNotifiedCount: number;
      dispatchedSummary?: { total: number; whatsappCount: number; smsCount: number; sampleMessage: string };
    };
    expect(reqCreateData.matchedNotifiedCount).toBeGreaterThanOrEqual(1);
    expect(reqCreateData.dispatchedSummary?.total).toBe(reqCreateData.matchedNotifiedCount);
    expect(reqCreateData.dispatchedSummary?.sampleMessage).toContain('Wenlock District Hospital');

    // 6. Future donation appointment booking enforces 90-day recovery window & keeps chart history clean
    const plus30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const plus95Days = new Date(Date.now() + 95 * 86400000).toISOString().slice(0, 10);

    const blockedApptRes = await fetch(`${baseUrl}/api/donor/me/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        appointmentDate: plus30Days,
        timeSlot: '09:00 AM – 11:00 AM',
        location: 'Wenlock District Hospital Blood Bank',
      }),
    });
    expect(blockedApptRes.status).toBe(409);

    const validApptRes = await fetch(`${baseUrl}/api/donor/me/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${donorToken}`,
      },
      body: JSON.stringify({
        appointmentDate: plus95Days,
        timeSlot: '11:00 AM – 01:00 PM',
        location: 'Indian Red Cross Society Blood Centre, Hampankatta',
        notes: 'Scheduled morning slot',
      }),
    });
    expect(validApptRes.status).toBe(201);
    const apptPayload = (await validApptRes.json()) as {
      profile: {
        donations: Array<{ id: string }>;
        appointments: Array<{ id: string; appointmentDate: string; status: string }>;
      };
    };
    expect(apptPayload.profile.donations.length).toBe(2);
    expect(apptPayload.profile.appointments.length).toBe(1);
    expect(apptPayload.profile.appointments[0].appointmentDate).toBe(plus95Days);

    const cancelApptRes = await fetch(
      `${baseUrl}/api/donor/me/appointments/${apptPayload.profile.appointments[0].id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${donorToken}`,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      }
    );
    expect(cancelApptRes.status).toBe(200);
    const afterCancel = (await cancelApptRes.json()) as {
      profile: { appointments: Array<{ id: string }> };
    };
    expect(afterCancel.profile.appointments.length).toBe(0);
  });
});



