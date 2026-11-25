import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import { encryptPhone, hashPassword, hashPhone, normalizeIndianPhone } from '../server/crypto.ts';
import { ensureMangaloreSeedData } from './mangaloreSeed.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function daysAgoDate(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function daysAheadIso(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString();
}

interface SeedDonor {
  id: string;
  name: string;
  age: number;
  bloodGroup: string;
  city: string;
  area: string;
  phone: string;
  lastDonation: string | null;
  available: number;
  verified: number;
  lastConfirmedAt: string;
  alertChannel: 'sms' | 'whatsapp';
}

export function seedDatabase(db: Database.Database, options?: { force?: boolean }): boolean {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM donors').get() as { count: number };
  if (countRow.count > 0 && !options?.force) {
    return false;
  }

  const tx = db.transaction(() => {
    if (options?.force) {
      db.exec(`
        DELETE FROM notifications_log;
        DELETE FROM contact_requests;
        DELETE FROM donations;
        DELETE FROM reports;
        DELETE FROM requests;
        DELETE FROM donors;
        DELETE FROM admin_audit_logs;
        DELETE FROM feedback;
      `);
    }

    const donors: SeedDonor[] = [
      // Chennai (multiple groups, including 1 in 90-day cooldown and 1 overdue reconfirm)
      {
        id: 'dnr_chn_01',
        name: 'Karthik Subramanian',
        age: 29,
        bloodGroup: 'O+',
        city: 'Chennai',
        area: 'Adyar',
        phone: '9840112201',
        lastDonation: daysAgoDate(124),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(12),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_chn_02',
        name: 'Priya Narayanan',
        age: 26,
        bloodGroup: 'O-',
        city: 'Chennai',
        area: 'T. Nagar',
        phone: '9840112202',
        lastDonation: daysAgoDate(160),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(5),
        alertChannel: 'sms',
      },
      {
        id: 'dnr_chn_03',
        name: 'Aravind Rajagopal',
        age: 34,
        bloodGroup: 'A+',
        city: 'Chennai',
        area: 'Anna Nagar',
        phone: '9840112203',
        lastDonation: daysAgoDate(42), // in 90-day cooldown
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(42),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_chn_04',
        name: 'Meenakshi Sundaram',
        age: 31,
        bloodGroup: 'B+',
        city: 'Chennai',
        area: 'Velachery',
        phone: '9840112204',
        lastDonation: daysAgoDate(108),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(18),
        alertChannel: 'sms',
      },
      {
        id: 'dnr_chn_05',
        name: 'Suresh Babu',
        age: 41,
        bloodGroup: 'AB+',
        city: 'Chennai',
        area: 'Mylapore',
        phone: '9840112205',
        lastDonation: null,
        available: 1,
        verified: 0, // unverified for admin queue
        lastConfirmedAt: daysAgoIso(3),
        alertChannel: 'sms',
      },
      {
        id: 'dnr_chn_06',
        name: 'Divya Krishnan',
        age: 24,
        bloodGroup: 'A-',
        city: 'Chennai',
        area: 'Tambaram',
        phone: '9840112206',
        lastDonation: daysAgoDate(200),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(8),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_chn_07',
        name: 'Vigneshwaran M',
        age: 33,
        bloodGroup: 'B-',
        city: 'Chennai',
        area: 'Porur',
        phone: '9840112207',
        lastDonation: daysAgoDate(140),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(110), // overdue 90-day reconfirmation -> hidden from search!
        alertChannel: 'sms',
      },

      // Madurai (O- shortage: only 2 available!)
      {
        id: 'dnr_mdu_01',
        name: 'Muthukumar Selvam',
        age: 32,
        bloodGroup: 'O-',
        city: 'Madurai',
        area: 'KK Nagar',
        phone: '9842113301',
        lastDonation: daysAgoDate(135),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(10),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_mdu_02',
        name: 'Anitha Pandian',
        age: 27,
        bloodGroup: 'O-',
        city: 'Madurai',
        area: 'Anna Nagar',
        phone: '9842113302',
        lastDonation: null,
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(21),
        alertChannel: 'sms',
      },
      {
        id: 'dnr_mdu_03',
        name: 'Senthil Nathan',
        age: 38,
        bloodGroup: 'O+',
        city: 'Madurai',
        area: 'Tallakulam',
        phone: '9842113303',
        lastDonation: daysAgoDate(95),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(14),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_mdu_04',
        name: 'Revathi Balasubramanian',
        age: 28,
        bloodGroup: 'B+',
        city: 'Madurai',
        area: 'Simmakkal',
        phone: '9842113304',
        lastDonation: daysAgoDate(180),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(9),
        alertChannel: 'sms',
      },

      // Coimbatore (AB- shortage: only 1 available)
      {
        id: 'dnr_cbe_01',
        name: 'Pradeep Kumar',
        age: 30,
        bloodGroup: 'AB-',
        city: 'Coimbatore',
        area: 'RS Puram',
        phone: '9843114401',
        lastDonation: daysAgoDate(115),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(6),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_cbe_02',
        name: 'Kavitha Ramasamy',
        age: 35,
        bloodGroup: 'O+',
        city: 'Coimbatore',
        area: 'Gandhipuram',
        phone: '9843114402',
        lastDonation: daysAgoDate(150),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(4),
        alertChannel: 'sms',
      },
      {
        id: 'dnr_cbe_03',
        name: 'Harishankar V',
        age: 25,
        bloodGroup: 'A+',
        city: 'Coimbatore',
        area: 'Peelamedu',
        phone: '9843114403',
        lastDonation: null,
        available: 1,
        verified: 0,
        lastConfirmedAt: daysAgoIso(2),
        alertChannel: 'whatsapp',
      },

      // Bengaluru
      {
        id: 'dnr_blr_01',
        name: 'Rohan Kulkarni',
        age: 29,
        bloodGroup: 'O+',
        city: 'Bengaluru',
        area: 'Indiranagar',
        phone: '9845115501',
        lastDonation: daysAgoDate(110),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(11),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_blr_02',
        name: 'Deepa Hegde',
        age: 33,
        bloodGroup: 'B-',
        city: 'Bengaluru',
        area: 'Jayanagar',
        phone: '9845115502',
        lastDonation: daysAgoDate(190),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(7),
        alertChannel: 'sms',
      },
      {
        id: 'dnr_blr_03',
        name: 'Nikhil Gowda',
        age: 27,
        bloodGroup: 'A+',
        city: 'Bengaluru',
        area: 'Koramangala',
        phone: '9845115503',
        lastDonation: daysAgoDate(25), // in 90-day cooldown
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(25),
        alertChannel: 'whatsapp',
      },

      // Hyderabad
      {
        id: 'dnr_hyd_01',
        name: 'Farhan Siddiqui',
        age: 31,
        bloodGroup: 'A+',
        city: 'Hyderabad',
        area: 'Jubilee Hills',
        phone: '9849116601',
        lastDonation: daysAgoDate(130),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(16),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_hyd_02',
        name: 'Lakshmi Prasanna',
        age: 28,
        bloodGroup: 'O+',
        city: 'Hyderabad',
        area: 'Madhapur',
        phone: '9849116602',
        lastDonation: daysAgoDate(102),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(13),
        alertChannel: 'sms',
      },

      // Mumbai
      {
        id: 'dnr_bom_01',
        name: 'Siddharth Deshmukh',
        age: 36,
        bloodGroup: 'B+',
        city: 'Mumbai',
        area: 'Dadar West',
        phone: '9820117701',
        lastDonation: daysAgoDate(145),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(15),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_bom_02',
        name: 'Neha Joshi',
        age: 29,
        bloodGroup: 'O-',
        city: 'Mumbai',
        area: 'Andheri East',
        phone: '9820117702',
        lastDonation: daysAgoDate(175),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(19),
        alertChannel: 'sms',
      },

      // Delhi
      {
        id: 'dnr_del_01',
        name: 'Amitabh Sharma',
        age: 37,
        bloodGroup: 'AB+',
        city: 'Delhi',
        area: 'Lajpat Nagar',
        phone: '9811118801',
        lastDonation: daysAgoDate(122),
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(8),
        alertChannel: 'whatsapp',
      },
      {
        id: 'dnr_del_02',
        name: 'Gurpreet Kaur',
        age: 30,
        bloodGroup: 'A-',
        city: 'Delhi',
        area: 'Rohini Sector 7',
        phone: '9811118802',
        lastDonation: null,
        available: 1,
        verified: 1,
        lastConfirmedAt: daysAgoIso(4),
        alertChannel: 'sms',
      },
    ];

    const insertDonor = db.prepare(`
      INSERT INTO donors (
        id, name, age, blood_group, city, area, phone_hash, phone_encrypted,
        last_donation, available, verified, last_confirmed_at, alert_channel, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertDonation = db.prepare(`
      INSERT INTO donations (id, donor_id, donated_at, location, units, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const nowIso = new Date().toISOString();
    for (const d of donors) {
      const normalized = normalizeIndianPhone(d.phone);
      if (!normalized) throw new Error(`Invalid seed phone ${d.phone}`);
      insertDonor.run(
        d.id,
        d.name,
        d.age,
        d.bloodGroup,
        d.city,
        d.area,
        hashPhone(normalized),
        encryptPhone(normalized),
        d.lastDonation,
        d.available,
        d.verified,
        d.lastConfirmedAt,
        d.alertChannel,
        daysAgoIso(220),
        nowIso
      );

      if (d.lastDonation) {
        insertDonation.run(
          `don_${d.id}`,
          d.id,
          d.lastDonation,
          `${d.city} Government Blood Bank`,
          1,
          'Voluntary whole blood donation',
          nowIso
        );
      }
    }

    const insertRequest = db.prepare(`
      INSERT INTO requests (
        id, requester_name, requester_phone_hash, requester_phone_encrypted,
        blood_group, units, hospital, city, area, urgency, status, notes,
        expires_at, fulfilled_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const reqPhones = {
      r1: normalizeIndianPhone('9840990001')!,
      r2: normalizeIndianPhone('9842990002')!,
      r3: normalizeIndianPhone('9845990003')!,
      r4: normalizeIndianPhone('9820990004')!,
      r5: normalizeIndianPhone('9840990005')!,
      r6: normalizeIndianPhone('9849990006')!,
    };

    // Open requests
    insertRequest.run(
      'req_mdu_01',
      'Ramesh Kumar',
      hashPhone(reqPhones.r2),
      encryptPhone(reqPhones.r2),
      'O-',
      2,
      'Government Rajaji Hospital',
      'Madurai',
      'Goripalayam',
      'critical',
      'open',
      'Post-operative emergency ward, please ask for Casualty Blood Desk.',
      daysAheadIso(5),
      null,
      hoursAgoIso(3)
    );

    insertRequest.run(
      'req_chn_01',
      'Selvi Natarajan',
      hashPhone(reqPhones.r1),
      encryptPhone(reqPhones.r1),
      'A-',
      1,
      'Rajiv Gandhi Government General Hospital',
      'Chennai',
      'Park Town',
      'urgent',
      'open',
      'Thalassemia scheduled transfusion, needed by tomorrow morning.',
      daysAheadIso(6),
      null,
      hoursAgoIso(6)
    );

    insertRequest.run(
      'req_blr_01',
      'Mahesh Bhat',
      hashPhone(reqPhones.r3),
      encryptPhone(reqPhones.r3),
      'B-',
      2,
      'Victoria Hospital',
      'Bengaluru',
      'KR Market',
      'standard',
      'open',
      'Orthopaedic surgery scheduled later this week.',
      daysAheadIso(4),
      null,
      hoursAgoIso(28)
    );

    // Historical fulfilled requests (for Admin Impact Stats)
    insertRequest.run(
      'req_bom_01',
      'Vandana Patil',
      hashPhone(reqPhones.r4),
      encryptPhone(reqPhones.r4),
      'B+',
      1,
      'KEM Hospital',
      'Mumbai',
      'Parel',
      'critical',
      'fulfilled',
      'Fulfilled by local donor within 3 hours.',
      daysAheadIso(2),
      hoursAgoIso(45),
      hoursAgoIso(48)
    );

    insertRequest.run(
      'req_chn_02',
      'Sundar Raman',
      hashPhone(reqPhones.r5),
      encryptPhone(reqPhones.r5),
      'O+',
      2,
      'Stanley Medical College Hospital',
      'Chennai',
      'Royapuram',
      'urgent',
      'fulfilled',
      'Fulfilled via donor contact match.',
      daysAheadIso(1),
      hoursAgoIso(68),
      hoursAgoIso(74)
    );

    insertRequest.run(
      'req_hyd_01',
      'Srinivas Rao',
      hashPhone(reqPhones.r6),
      encryptPhone(reqPhones.r6),
      'A+',
      1,
      'Osmania General Hospital',
      'Hyderabad',
      'Afzal Gunj',
      'standard',
      'fulfilled',
      'Donor confirmed at hospital blood bank.',
      daysAheadIso(1),
      hoursAgoIso(86),
      hoursAgoIso(96)
    );

    // Contact requests (one > 2h pending to demonstrate coordinator fallback)
    const insertContact = db.prepare(`
      INSERT INTO contact_requests (
        id, request_id, donor_id, requester_name, requester_phone_encrypted,
        hospital, units, urgency, status, coordinator_fallback_at, responded_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertContact.run(
      'creq_01',
      'req_mdu_01',
      'dnr_mdu_01',
      'Ramesh Kumar',
      encryptPhone(reqPhones.r2),
      'Government Rajaji Hospital',
      2,
      'critical',
      'pending',
      hoursAgoIso(1), // created 3 hours ago, fallback was 1 hour ago -> overdue!
      null,
      hoursAgoIso(3)
    );

    insertContact.run(
      'creq_02',
      'req_chn_01',
      'dnr_chn_06',
      'Selvi Natarajan',
      encryptPhone(reqPhones.r1),
      'Rajiv Gandhi Government General Hospital',
      1,
      'urgent',
      'pending',
      daysAheadIso(0).slice(0, 10) === new Date().toISOString().slice(0, 10)
        ? new Date(Date.now() + 90 * 60 * 1000).toISOString()
        : new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      null,
      hoursAgoIso(0.5)
    );

    // Seed sample report for admin moderation
    db.prepare(`
      INSERT INTO reports (id, target_type, target_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'rep_01',
      'donor',
      'dnr_chn_05',
      'Needs verification check',
      'Locality pin code mismatch reported by caller; verify before marking Verified.',
      'open',
      hoursAgoIso(5)
    );

    // Seed notifications log for donors
    db.prepare(`
      INSERT INTO notifications_log (id, donor_id, channel, kind, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'ntf_01',
      'dnr_mdu_01',
      'whatsapp',
      'contact_request',
      'Urgent O- request at Government Rajaji Hospital, Madurai (2 units). Open your Donor Dashboard to accept or decline.',
      hoursAgoIso(3)
    );

    db.prepare(`
      INSERT INTO notifications_log (id, donor_id, channel, kind, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'ntf_02',
      'dnr_chn_07',
      'sms',
      'reconfirm_reminder',
      '90-day reminder: Please log in to Blood Donation Portal and reconfirm your availability to remain listed.',
      daysAgoIso(2)
    );

    // Seed audit log
    db.prepare(`
      INSERT INTO admin_audit_logs (id, actor, action, target_type, target_id, summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'aud_01',
      'coordinator',
      'verify_donor',
      'donor',
      'dnr_chn_01',
      'Verified Karthik Subramanian (Chennai, O+) after phone check.',
      daysAgoIso(12)
    );
  });

  tx();
  ensureAdminSeedData(db);
  return true;
}

export function ensureAdminSeedData(db: Database.Database): void {
  const nowIso = new Date().toISOString();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@bloodportal.org').trim().toLowerCase();
  const adminPass = process.env.ADMIN_PASSWORD || 'Admin@2026';
  const adminName = process.env.ADMIN_NAME || 'Portal Coordinator';

  const tx = db.transaction(() => {
    const existingAdmin = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
      .get(adminEmail) as { id: string } | undefined;

    if (!existingAdmin) {
      const existingDefaultId = db
        .prepare('SELECT id FROM users WHERE id = ?')
        .get('usr_admin_01') as { id: string } | undefined;
      const adminId = existingDefaultId
        ? `usr_admin_${crypto.createHash('sha256').update(adminEmail).digest('hex').slice(0, 8)}`
        : 'usr_admin_01';

      db.prepare(
        `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, city, phone, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'admin', 'active', 'Mangaluru', '+919840000001', 1, ?, ?)`
      ).run(adminId, adminName, adminEmail, hashPassword(adminPass), nowIso, nowIso);
    }

    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
    if (userCount.count <= 1) {
      const demoPass = hashPassword('PortalUser@2026');
      const insertUser = db.prepare(
        `INSERT OR IGNORE INTO users (id, name, email, password_hash, role, status, city, phone, verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      insertUser.run(
        'usr_hosp_01',
        'Rajiv Gandhi Govt General Hospital Blood Bank',
        'bloodbank.rgggh@tnhealth.example',
        demoPass,
        'hospital',
        'active',
        'Chennai',
        '+914425305000',
        1,
        daysAgoIso(90),
        nowIso
      );
      insertUser.run(
        'usr_hosp_02',
        'Government Rajaji Hospital Blood Centre',
        'bloodbank.grh@tnhealth.example',
        demoPass,
        'hospital',
        'active',
        'Madurai',
        '+914522532535',
        1,
        daysAgoIso(65),
        nowIso
      );
      insertUser.run(
        'usr_hosp_03',
        'Victoria Hospital Blood Bank',
        'bloodbank.victoria@kahealth.example',
        demoPass,
        'hospital',
        'pending',
        'Bengaluru',
        '+918026701150',
        0,
        daysAgoIso(12),
        nowIso
      );
      insertUser.run(
        'usr_rec_01',
        'Ramesh Kumar (Patient Attendant)',
        'ramesh.mdu@example.org',
        demoPass,
        'recipient',
        'active',
        'Madurai',
        '+919842990002',
        1,
        daysAgoIso(5),
        nowIso
      );
      insertUser.run(
        'usr_rec_02',
        'Selvi Natarajan (Patient Attendant)',
        'selvi.chn@example.org',
        demoPass,
        'recipient',
        'active',
        'Chennai',
        '+919840990001',
        1,
        daysAgoIso(3),
        nowIso
      );
    }

    const stockCount = db.prepare('SELECT COUNT(*) AS count FROM blood_stock').get() as { count: number };
    if (stockCount.count === 0) {
      const insertStock = db.prepare(
        `INSERT OR IGNORE INTO blood_stock (id, blood_group, units, component, location, city, collection_date, expiry_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      insertStock.run('stk_01', 'O+', 14, 'Whole Blood', 'RGGGH Blood Bank', 'Chennai', daysAgoDate(6), daysAheadIso(29).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_02', 'O-', 2, 'PRBC', 'Govt Rajaji Blood Centre', 'Madurai', daysAgoDate(10), daysAheadIso(25).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_03', 'A+', 9, 'Whole Blood', 'RGGGH Blood Bank', 'Chennai', daysAgoDate(4), daysAheadIso(31).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_04', 'A-', 3, 'PRBC', 'Victoria Blood Bank', 'Bengaluru', daysAgoDate(15), daysAheadIso(20).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_05', 'B+', 11, 'Whole Blood', 'KEM Blood Bank', 'Mumbai', daysAgoDate(8), daysAheadIso(27).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_06', 'B-', 2, 'PRBC', 'Osmania Blood Bank', 'Hyderabad', daysAgoDate(12), daysAheadIso(23).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_07', 'AB+', 6, 'FFP', 'AIIMS Blood Bank', 'Delhi', daysAgoDate(20), daysAheadIso(90).slice(0, 10), nowIso, nowIso);
      insertStock.run('stk_08', 'AB-', 1, 'Platelets', 'Coimbatore Medical College Bank', 'Coimbatore', daysAgoDate(7), daysAgoDate(2), nowIso, nowIso); // Expired!
    }

    const campCount = db.prepare('SELECT COUNT(*) AS count FROM camps').get() as { count: number };
    if (campCount.count === 0) {
      const insertCamp = db.prepare(
        `INSERT OR IGNORE INTO camps (id, title, city, venue, camp_date, start_time, end_time, slots_total, slots_booked, organizer, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      insertCamp.run(
        'cmp_01',
        'Anna University NSS Voluntary Blood Camp',
        'Chennai',
        'CEG Vivek Auditorium, Guindy',
        daysAheadIso(6).slice(0, 10),
        '09:00',
        '15:30',
        80,
        46,
        'Anna University NSS & RGGGH Blood Bank',
        'upcoming',
        nowIso,
        nowIso
      );
      insertCamp.run(
        'cmp_02',
        'Madurai District Red Ribbon Drive',
        'Madurai',
        'Gandhi Memorial Museum Hall, Tallakulam',
        daysAheadIso(12).slice(0, 10),
        '09:30',
        '14:30',
        60,
        24,
        'Govt Rajaji Hospital Blood Centre',
        'upcoming',
        nowIso,
        nowIso
      );
    }

    const schedCount = db
      .prepare("SELECT COUNT(*) AS count FROM donations WHERE status = 'scheduled'")
      .get() as { count: number };
    if (schedCount.count === 0) {
      db.prepare(
        `INSERT OR IGNORE INTO donations (id, donor_id, donated_at, location, units, notes, status, created_at)
         VALUES (?, ?, ?, ?, 1, ?, 'scheduled', ?)`
      ).run(
        'don_sched_01',
        'dnr_chn_01',
        daysAheadIso(2).slice(0, 10),
        'RGGGH Blood Bank, Chennai',
        'Scheduled voluntary appointment',
        nowIso
      );
    }

    const contentCount = db.prepare('SELECT COUNT(*) AS count FROM site_content').get() as { count: number };
    if (contentCount.count === 0) {
      const insertContent = db.prepare(
        `INSERT OR IGNORE INTO site_content (key, title, body, active, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
      );
      insertContent.run(
        'announcement',
        'O- and AB- shortage alert in Madurai and Coimbatore',
        'Eligible O- and AB- donors in Madurai and Coimbatore are requested to verify their availability for emergency surgical wards.',
        1,
        adminEmail,
        nowIso
      );
      insertContent.run(
        'awareness_intro',
        'How the Blood Donation Portal works',
        'Built for families waiting outside hospital blood banks on slow mobile connections. No public phone directories, no stale listings older than 90 days.',
        1,
        adminEmail,
        nowIso
      );
    }

    const faqCount = db.prepare('SELECT COUNT(*) AS count FROM faqs').get() as { count: number };
    if (faqCount.count === 0) {
      const insertFaq = db.prepare(
        `INSERT OR IGNORE INTO faqs (id, question, answer, sort_order, updated_at) VALUES (?, ?, ?, ?, ?)`
      );
      insertFaq.run(
        'faq_01',
        'Who can donate blood?',
        'Generally adults aged 18 to 65 weighing at least 45 kg, with normal haemoglobin and no active fever or infection. Final medical eligibility is always decided by the blood bank doctor on duty.',
        1,
        nowIso
      );
      insertFaq.run(
        'faq_02',
        'How often can I donate?',
        'This portal enforces a minimum 90-day gap after every recorded whole blood donation before listing you as available again.',
        2,
        nowIso
      );
      insertFaq.run(
        'faq_03',
        'Why does the portal ask me to reconfirm every 90 days?',
        'People move cities or change phone numbers. Hiding unconfirmed profiles keeps emergency families from calling inactive numbers.',
        3,
        nowIso
      );
    }
  });

  tx();
  ensureMangaloreSeedData(db);
}
