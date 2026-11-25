import type Database from 'better-sqlite3';
import { encryptPhone, hashPhone, normalizeIndianPhone } from '../server/crypto.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function daysAgoDate(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function daysAheadDate(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

export function ensureMangaloreSeedData(db: Database.Database): void {
  const nowIso = new Date().toISOString();

  const tx = db.transaction(() => {
    // 1. Seed all 12 Mangalore Priority 1 Blood Banks & Priority 2 Hospitals / Storage Centres
    const centreCount = db.prepare('SELECT COUNT(*) AS count FROM blood_centres').get() as { count: number };
    if (centreCount.count === 0) {
      const insertCentre = db.prepare(`
        INSERT OR IGNORE INTO blood_centres (
          id, priority, name, centre_type, zone, area, city, address, contact_phone,
          is_24_hour, licence_info, verification_note, notes, lat, lng, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'Mangaluru', ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const centres = [
        // Priority 1 — Blood Banks
        {
          id: 'ctr_mng_01',
          priority: 1,
          name: 'Wenlock District Hospital Blood Bank',
          centreType: 'Blood bank',
          zone: 'City centre',
          area: 'Hampankatta',
          address: 'District Wenlock Hospital Campus, Hampankatta, Mangaluru 575001 (to be verified)',
          contactPhone: '+91 824 242 0101',
          is24Hour: 1,
          licenceInfo: 'Gov. Karnataka / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with blood bank & e-RaktKosh',
          notes: 'Government regional referral blood bank serving Dakshina Kannada.',
          lat: 12.8698,
          lng: 74.8430,
        },
        {
          id: 'ctr_mng_02',
          priority: 1,
          name: 'Indian Red Cross Society Blood Centre',
          centreType: 'Blood bank',
          zone: 'City centre',
          area: 'Hampankatta',
          address: 'Red Cross Bhavan, near Lady Goschen Hospital, Hampankatta, Mangaluru 575001 (to be verified)',
          contactPhone: '+91 824 242 3755',
          is24Hour: 0,
          licenceInfo: 'IRCS D.K. / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with blood bank & e-RaktKosh',
          notes: 'Voluntary blood centre & component unit near Lady Goschen Hospital; emergency call line active.',
          lat: 12.8689,
          lng: 74.8419,
        },
        {
          id: 'ctr_mng_03',
          priority: 1,
          name: 'Father Muller Charitable Institutions Blood Bank',
          centreType: 'Blood bank',
          zone: 'South / Ullal side',
          area: 'Kankanady',
          address: 'Father Muller Medical College Hospital, Kankanady, Mangaluru 575002 (to be verified)',
          contactPhone: '+91 824 223 8200',
          is24Hour: 1,
          licenceInfo: 'FMMC Blood Centre / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with blood bank & e-RaktKosh',
          notes: '24-hour licensed tertiary blood bank with apheresis platelets & component separation.',
          lat: 12.8648,
          lng: 74.8595,
        },
        {
          id: 'ctr_mng_04',
          priority: 1,
          name: 'KMC Hospital Blood Centre, Attavar',
          centreType: 'Blood bank',
          zone: 'City centre',
          area: 'Attavar',
          address: 'Kasturba Medical College Hospital, Attavar, Mangaluru 575001 (to be verified)',
          contactPhone: '+91 824 244 5858',
          is24Hour: 1,
          licenceInfo: 'KMC Attavar / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with blood bank & e-RaktKosh',
          notes: '24-hour blood centre supporting trauma, oncology, and cardiac surgery.',
          lat: 12.8624,
          lng: 74.8468,
        },

        // Priority 2 — Other Hospitals & Blood Storage Centres
        {
          id: 'ctr_mng_05',
          priority: 2,
          name: 'Yenepoya Medical College Hospital',
          centreType: 'Hospital',
          zone: 'South / Ullal side',
          area: 'Deralakatte',
          address: 'University Road, Deralakatte, Mangaluru 575018 (to be verified)',
          contactPhone: '+91 824 220 4668',
          is24Hour: 1,
          licenceInfo: 'YMCH Blood Bank / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: '24-hour medical college hospital blood bank serving Deralakatte & Ullal.',
          lat: 12.8124,
          lng: 74.8835,
        },
        {
          id: 'ctr_mng_06',
          priority: 2,
          name: 'KS Hegde Hospital (KSHEMA)',
          centreType: 'Hospital',
          zone: 'South / Ullal side',
          area: 'Deralakatte',
          address: 'Justice KS Hegde Charitable Hospital, Deralakatte, Mangaluru 575018 (to be verified)',
          contactPhone: '+91 824 220 4471',
          is24Hour: 1,
          licenceInfo: 'KSHEMA Blood Centre / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: '24-hour teaching hospital blood bank and voluntary camp partner.',
          lat: 12.8142,
          lng: 74.8856,
        },
        {
          id: 'ctr_mng_07',
          priority: 2,
          name: 'AJ Hospital & Research Centre',
          centreType: 'Hospital',
          zone: 'South / Ullal side',
          area: 'Kuntikana',
          address: 'NH-66, Kuntikana, Mangaluru 575004 (to be verified)',
          contactPhone: '+91 824 222 5533',
          is24Hour: 1,
          licenceInfo: 'AJHRC Blood Bank / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: '24-hour tertiary trauma & multi-speciality hospital blood centre on NH-66.',
          lat: 12.8935,
          lng: 74.8535,
        },
        {
          id: 'ctr_mng_08',
          priority: 2,
          name: 'Kanachur Hospital & Research Centre',
          centreType: 'Hospital',
          zone: 'South / Ullal side',
          area: 'Natekal',
          address: 'University Road, Natekal, Deralakatte Post, Mangaluru 575018 (to be verified)',
          contactPhone: '+91 824 288 8000',
          is24Hour: 1,
          licenceInfo: 'Kanachur Medical / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: 'Medical college hospital blood centre serving Natekal and Konaje corridor.',
          lat: 12.8018,
          lng: 74.8920,
        },
        {
          id: 'ctr_mng_09',
          priority: 2,
          name: 'Lady Goschen Hospital',
          centreType: 'Hospital',
          zone: 'City centre',
          area: 'Hampankatta',
          address: 'Government Lady Goschen Hospital, Hampankatta, Mangaluru 575001 (to be verified)',
          contactPhone: '+91 824 242 2911',
          is24Hour: 0,
          licenceInfo: 'Government maternity referral unit (demand side)',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: 'Government obstetric & maternity referral hospital (high demand side; coordinates with Wenlock & IRCS).',
          lat: 12.8692,
          lng: 74.8414,
        },
        {
          id: 'ctr_mng_10',
          priority: 2,
          name: 'KMC Hospital, Ambedkar Circle',
          centreType: 'Hospital',
          zone: 'City centre',
          area: 'Balmatta',
          address: 'Dr B R Ambedkar Circle (Jyothi), Balmatta, Mangaluru 575001 (to be verified)',
          contactPhone: '+91 824 244 4590',
          is24Hour: 1,
          licenceInfo: 'KMC Jyothi Storage / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: '24-hour emergency hospital blood storage & cross-match desk linked to KMC Attavar.',
          lat: 12.8715,
          lng: 74.8508,
        },
        {
          id: 'ctr_mng_11',
          priority: 2,
          name: 'Unity Care & Health Centre (Blood Storage)',
          centreType: 'Hospital',
          zone: 'City centre',
          area: 'Kodialbail',
          address: 'Highlands / Falnir Road, Kodialbail, Mangaluru 575002 (to be verified)',
          contactPhone: '+91 824 424 5555',
          is24Hour: 1,
          licenceInfo: 'Private Blood Storage Centre / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: 'Private multi-speciality hospital with 24-hour blood storage unit.',
          lat: 12.8762,
          lng: 74.8415,
        },
        {
          id: 'ctr_mng_12',
          priority: 2,
          name: 'Indiana Hospital & Heart Institute (Blood Storage)',
          centreType: 'Hospital',
          zone: 'Residential',
          area: 'Pumpwell',
          address: 'NH-66 Mahaveer (Pumpwell) Circle, Mangaluru 575002 (to be verified)',
          contactPhone: '+91 824 288 0880',
          is24Hour: 1,
          licenceInfo: 'Private Blood Storage Centre / e-RaktKosh ref to be verified',
          verificationNote: 'Placeholder — to be verified with hospital & e-RaktKosh',
          notes: 'Private cardiac & emergency hospital blood storage centre near Pumpwell junction.',
          lat: 12.8685,
          lng: 74.8672,
        },
      ];

      for (const c of centres) {
        insertCentre.run(
          c.id,
          c.priority,
          c.name,
          c.centreType,
          c.zone,
          c.area,
          c.address,
          c.contactPhone,
          c.is24Hour,
          c.licenceInfo,
          c.verificationNote,
          c.notes,
          c.lat,
          c.lng,
          nowIso
        );
      }
    }

    // 2. Seed Mangalore stock entries across all 8 blood groups and all 5 components
    // Highlighting A+ and AB+ running short in Mangalore, plus realistic fresh timestamps.
    const mngStockCount = db
      .prepare("SELECT COUNT(*) AS count FROM blood_stock WHERE city = 'Mangaluru'")
      .get() as { count: number };

    if (mngStockCount.count === 0) {
      const insertStock = db.prepare(`
        INSERT OR IGNORE INTO blood_stock (
          id, blood_group, units, component, location, city, collection_date, expiry_date, centre_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'Mangaluru', ?, ?, ?, ?, ?)
      `);

      const stockBatches = [
        // Wenlock District Hospital Blood Bank (Hampankatta)
        { id: 'stk_mng_01', bg: 'O+', units: 12, comp: 'Whole Blood', loc: 'Wenlock District Hospital Blood Bank', ctr: 'ctr_mng_01', ago: 3, exp: 32, updHrs: 1 },
        { id: 'stk_mng_02', bg: 'A+', units: 2, comp: 'Packed Red Cells', loc: 'Wenlock District Hospital Blood Bank', ctr: 'ctr_mng_01', ago: 5, exp: 30, updHrs: 1 },
        { id: 'stk_mng_03', bg: 'B+', units: 9, comp: 'Whole Blood', loc: 'Wenlock District Hospital Blood Bank', ctr: 'ctr_mng_01', ago: 4, exp: 31, updHrs: 2 },
        { id: 'stk_mng_04', bg: 'AB+', units: 1, comp: 'Fresh Frozen Plasma', loc: 'Wenlock District Hospital Blood Bank', ctr: 'ctr_mng_01', ago: 10, exp: 180, updHrs: 2 },
        { id: 'stk_mng_05', bg: 'O-', units: 2, comp: 'Packed Red Cells', loc: 'Wenlock District Hospital Blood Bank', ctr: 'ctr_mng_01', ago: 6, exp: 29, updHrs: 1 },

        // Indian Red Cross Society Blood Centre (Hampankatta)
        { id: 'stk_mng_06', bg: 'O+', units: 8, comp: 'Packed Red Cells', loc: 'Indian Red Cross Society Blood Centre', ctr: 'ctr_mng_02', ago: 2, exp: 33, updHrs: 3 },
        { id: 'stk_mng_07', bg: 'A-', units: 2, comp: 'Whole Blood', loc: 'Indian Red Cross Society Blood Centre', ctr: 'ctr_mng_02', ago: 7, exp: 28, updHrs: 3 },
        { id: 'stk_mng_08', bg: 'B+', units: 7, comp: 'Platelets', loc: 'Indian Red Cross Society Blood Centre', ctr: 'ctr_mng_02', ago: 1, exp: 4, updHrs: 2 },
        { id: 'stk_mng_09', bg: 'AB+', units: 1, comp: 'Packed Red Cells', loc: 'Indian Red Cross Society Blood Centre', ctr: 'ctr_mng_02', ago: 8, exp: 27, updHrs: 4 },

        // Father Muller Charitable Institutions Blood Bank (Kankanady)
        { id: 'stk_mng_10', bg: 'O+', units: 11, comp: 'Packed Red Cells', loc: 'Father Muller Charitable Institutions Blood Bank', ctr: 'ctr_mng_03', ago: 4, exp: 31, updHrs: 1 },
        { id: 'stk_mng_11', bg: 'A+', units: 1, comp: 'Platelets', loc: 'Father Muller Charitable Institutions Blood Bank', ctr: 'ctr_mng_03', ago: 1, exp: 4, updHrs: 1 },
        { id: 'stk_mng_12', bg: 'B+', units: 8, comp: 'Fresh Frozen Plasma', loc: 'Father Muller Charitable Institutions Blood Bank', ctr: 'ctr_mng_03', ago: 14, exp: 200, updHrs: 2 },
        { id: 'stk_mng_13', bg: 'B-', units: 2, comp: 'Whole Blood', loc: 'Father Muller Charitable Institutions Blood Bank', ctr: 'ctr_mng_03', ago: 5, exp: 30, updHrs: 2 },
        { id: 'stk_mng_14', bg: 'AB-', units: 2, comp: 'Cryoprecipitate', loc: 'Father Muller Charitable Institutions Blood Bank', ctr: 'ctr_mng_03', ago: 15, exp: 160, updHrs: 3 },

        // KMC Hospital Blood Centre, Attavar
        { id: 'stk_mng_15', bg: 'O+', units: 10, comp: 'Whole Blood', loc: 'KMC Hospital Blood Centre, Attavar', ctr: 'ctr_mng_04', ago: 3, exp: 32, updHrs: 1 },
        { id: 'stk_mng_16', bg: 'O-', units: 3, comp: 'Cryoprecipitate', loc: 'KMC Hospital Blood Centre, Attavar', ctr: 'ctr_mng_04', ago: 12, exp: 150, updHrs: 2 },
        { id: 'stk_mng_17', bg: 'A+', units: 2, comp: 'Whole Blood', loc: 'KMC Hospital Blood Centre, Attavar', ctr: 'ctr_mng_04', ago: 6, exp: 29, updHrs: 1 },
        { id: 'stk_mng_18', bg: 'A-', units: 2, comp: 'Fresh Frozen Plasma', loc: 'KMC Hospital Blood Centre, Attavar', ctr: 'ctr_mng_04', ago: 18, exp: 190, updHrs: 4 },
        { id: 'stk_mng_19', bg: 'AB+', units: 1, comp: 'Platelets', loc: 'KMC Hospital Blood Centre, Attavar', ctr: 'ctr_mng_04', ago: 1, exp: 4, updHrs: 1 },

        // Priority 2 Hospitals
        { id: 'stk_mng_20', bg: 'O+', units: 6, comp: 'Packed Red Cells', loc: 'Yenepoya Medical College Hospital', ctr: 'ctr_mng_05', ago: 5, exp: 30, updHrs: 3 },
        { id: 'stk_mng_21', bg: 'B+', units: 5, comp: 'Whole Blood', loc: 'Yenepoya Medical College Hospital', ctr: 'ctr_mng_05', ago: 4, exp: 31, updHrs: 3 },
        { id: 'stk_mng_22', bg: 'A+', units: 1, comp: 'Packed Red Cells', loc: 'KS Hegde Hospital (KSHEMA)', ctr: 'ctr_mng_06', ago: 6, exp: 29, updHrs: 2 },
        { id: 'stk_mng_23', bg: 'O+', units: 7, comp: 'Fresh Frozen Plasma', loc: 'KS Hegde Hospital (KSHEMA)', ctr: 'ctr_mng_06', ago: 20, exp: 180, updHrs: 4 },
        { id: 'stk_mng_24', bg: 'B+', units: 6, comp: 'Platelets', loc: 'AJ Hospital & Research Centre', ctr: 'ctr_mng_07', ago: 2, exp: 3, updHrs: 2 },
        { id: 'stk_mng_25', bg: 'AB-', units: 1, comp: 'Packed Red Cells', loc: 'AJ Hospital & Research Centre', ctr: 'ctr_mng_07', ago: 7, exp: 28, updHrs: 3 },
        { id: 'stk_mng_26', bg: 'O+', units: 4, comp: 'Whole Blood', loc: 'Kanachur Hospital & Research Centre', ctr: 'ctr_mng_08', ago: 5, exp: 30, updHrs: 5 },
        { id: 'stk_mng_27', bg: 'B-', units: 1, comp: 'Packed Red Cells', loc: 'KMC Hospital, Ambedkar Circle', ctr: 'ctr_mng_10', ago: 6, exp: 29, updHrs: 2 },
        { id: 'stk_mng_28', bg: 'O+', units: 4, comp: 'Packed Red Cells', loc: 'Unity Care & Health Centre (Blood Storage)', ctr: 'ctr_mng_11', ago: 3, exp: 32, updHrs: 2 },
        { id: 'stk_mng_29', bg: 'B+', units: 3, comp: 'Packed Red Cells', loc: 'Indiana Hospital & Heart Institute (Blood Storage)', ctr: 'ctr_mng_12', ago: 4, exp: 31, updHrs: 3 },
        { id: 'stk_mng_30', bg: 'AB+', units: 1, comp: 'Cryoprecipitate', loc: 'Indiana Hospital & Heart Institute (Blood Storage)', ctr: 'ctr_mng_12', ago: 10, exp: 170, updHrs: 3 },
      ];

      for (const b of stockBatches) {
        const upd = hoursAgoIso(b.updHrs);
        insertStock.run(
          b.id,
          b.bg,
          b.units,
          b.comp,
          b.loc,
          daysAgoDate(b.ago),
          daysAheadDate(b.exp),
          b.ctr,
          upd,
          upd
        );
      }
    }

    // 3. Seed Mangalore Voluntary Donors across City Centre, South/Ullal, Residential, and North (Surathkal/Mulki)
    const mngDonorCount = db
      .prepare("SELECT COUNT(*) AS count FROM donors WHERE city = 'Mangaluru'")
      .get() as { count: number };

    if (mngDonorCount.count === 0) {
      const insertDonor = db.prepare(`
        INSERT OR IGNORE INTO donors (
          id, name, age, blood_group, city, area, phone_hash, phone_encrypted,
          last_donation, available, verified, last_confirmed_at, alert_channel, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'Mangaluru', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const mngDonors = [
        { id: 'dnr_mng_01', name: 'Rakshith Shetty', age: 26, bg: 'A+', area: 'Hampankatta', phone: '9845701001', lastDon: daysAgoDate(125), avail: 1, ver: 1, conf: daysAgoIso(4), ch: 'whatsapp' },
        { id: 'dnr_mng_02', name: 'Ashwini Pai', age: 29, bg: 'AB+', area: 'Kodialbail', phone: '9845701002', lastDon: daysAgoDate(150), avail: 1, ver: 1, conf: daysAgoIso(6), ch: 'sms' },
        { id: 'dnr_mng_03', name: 'Sharan Alva', age: 31, bg: 'O-', area: 'Kadri', phone: '9845701003', lastDon: daysAgoDate(110), avail: 1, ver: 1, conf: daysAgoIso(3), ch: 'whatsapp' },
        { id: 'dnr_mng_04', name: 'Shraddha Kamath', age: 24, bg: 'O+', area: 'Bejai', phone: '9845701004', lastDon: null, avail: 1, ver: 1, conf: daysAgoIso(2), ch: 'whatsapp' },
        { id: 'dnr_mng_05', name: 'Pranav Nayak', age: 22, bg: 'A+', area: 'Surathkal', phone: '9845701005', lastDon: daysAgoDate(140), avail: 1, ver: 1, conf: daysAgoIso(5), ch: 'whatsapp' },
        { id: 'dnr_mng_06', name: 'Nithin Rao', age: 34, bg: 'B+', area: 'Surathkal', phone: '9845701006', lastDon: daysAgoDate(180), avail: 1, ver: 1, conf: daysAgoIso(9), ch: 'sms' },
        { id: 'dnr_mng_07', name: 'Faisal Bava', age: 30, bg: 'O+', area: 'Mulki', phone: '9845701007', lastDon: daysAgoDate(100), avail: 1, ver: 1, conf: daysAgoIso(7), ch: 'whatsapp' },
        { id: 'dnr_mng_08', name: 'Deeksha Hegde', age: 27, bg: 'AB-', area: 'Mulki', phone: '9845701008', lastDon: null, avail: 1, ver: 1, conf: daysAgoIso(1), ch: 'sms' },
        { id: 'dnr_mng_09', name: 'Vikas Shenoy', age: 33, bg: 'A-', area: 'Balmatta', phone: '9845701009', lastDon: daysAgoDate(132), avail: 1, ver: 1, conf: daysAgoIso(8), ch: 'whatsapp' },
        { id: 'dnr_mng_10', name: 'Joel D Souza', age: 28, bg: 'B-', area: 'Kankanady', phone: '9845701010', lastDon: daysAgoDate(160), avail: 1, ver: 1, conf: daysAgoIso(10), ch: 'whatsapp' },
        { id: 'dnr_mng_11', name: 'Ayesha K', age: 25, bg: 'A+', area: 'Deralakatte', phone: '9845701011', lastDon: daysAgoDate(98), avail: 1, ver: 1, conf: daysAgoIso(4), ch: 'sms' },
        { id: 'dnr_mng_12', name: 'Chethan Poojary', age: 35, bg: 'O+', area: 'Pumpwell', phone: '9845701012', lastDon: daysAgoDate(145), avail: 1, ver: 1, conf: daysAgoIso(6), ch: 'whatsapp' },
        { id: 'dnr_mng_13', name: 'Keerthan Bhat', age: 29, bg: 'AB+', area: 'Kuntikana', phone: '9845701013', lastDon: daysAgoDate(20), avail: 1, ver: 1, conf: daysAgoIso(20), ch: 'sms' },
        { id: 'dnr_mng_14', name: 'Roshni Fernandes', age: 31, bg: 'B+', area: 'Attavar', phone: '9845701014', lastDon: daysAgoDate(115), avail: 1, ver: 1, conf: daysAgoIso(3), ch: 'whatsapp' },
        { id: 'dnr_mng_15', name: 'Samarth Ullal', age: 27, bg: 'O+', area: 'Natekal', phone: '9845701015', lastDon: null, avail: 1, ver: 0, conf: daysAgoIso(2), ch: 'sms' },
        { id: 'dnr_mng_16', name: 'Harshith Amin', age: 32, bg: 'A+', area: 'Bunder', phone: '9845701016', lastDon: daysAgoDate(170), avail: 1, ver: 1, conf: daysAgoIso(11), ch: 'whatsapp' },
      ];

      for (const d of mngDonors) {
        const norm = normalizeIndianPhone(d.phone)!;
        insertDonor.run(
          d.id,
          d.name,
          d.age,
          d.bg,
          d.area,
          hashPhone(norm),
          encryptPhone(norm),
          d.lastDon,
          d.avail,
          d.ver,
          d.conf,
          d.ch,
          daysAgoIso(90),
          nowIso
        );
      }
    }

    // 4. Seed Mangalore Open Request (Lady Goschen maternity demand side, A+/AB+ attention)
    const mngReqExists = db.prepare("SELECT id FROM requests WHERE id = 'req_mng_01'").get();
    if (!mngReqExists) {
      const p = normalizeIndianPhone('9845880001')!;
      db.prepare(`
        INSERT OR IGNORE INTO requests (
          id, requester_name, requester_phone_hash, requester_phone_encrypted,
          blood_group, units, hospital, city, area, urgency, status, approval_status, notes,
          expires_at, fulfilled_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Mangaluru', ?, ?, 'open', 'approved', ?, ?, NULL, ?)
      `).run(
        'req_mng_01',
        'Shobha Bhandary',
        hashPhone(p),
        encryptPhone(p),
        'A+',
        2,
        'Lady Goschen Hospital',
        'Hampankatta',
        'critical',
        'Maternity referral ward emergency (demand side). Please contact Wenlock / IRCS Hampankatta desk.',
        new Date(Date.now() + 5 * DAY_MS).toISOString(),
        hoursAgoIso(2)
      );
    }

    // 5. Seed Mangalore Camps (including Infosys 200+ units collected, NITK Surathkal, MRPL, Kadri community)
    const mngCampExists = db.prepare("SELECT id FROM camps WHERE id = 'cmp_mng_infosys'").get();
    if (!mngCampExists) {
      const insertCamp = db.prepare(`
        INSERT OR IGNORE INTO camps (
          id, title, city, venue, camp_date, start_time, end_time,
          slots_total, slots_booked, organizer, status, camp_category, units_collected, created_at, updated_at
        ) VALUES (?, ?, 'Mangaluru', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertCamp.run(
        'cmp_mng_infosys',
        'Infosys Mangaluru Corporate Blood Drive (218 units collected)',
        'Infosys SEZ Campus, Mudipu / Kunjathbail, Mangaluru',
        daysAgoDate(18),
        '09:00',
        '17:00',
        220,
        218,
        'Infosys CSR, Wenlock Blood Bank & KMC Attavar',
        'completed',
        'corporate',
        218,
        daysAgoIso(25),
        nowIso
      );

      insertCamp.run(
        'cmp_mng_nitk',
        'NITK Surathkal Student & Faculty Blood Donation Camp',
        'Silver Jubilee Auditorium, NITK Campus, Surathkal',
        daysAheadDate(5),
        '09:00',
        '16:00',
        180,
        112,
        'NITK NSS Wing & Indian Red Cross Society Hampankatta',
        'upcoming',
        'college',
        0,
        daysAgoIso(5),
        nowIso
      );

      insertCamp.run(
        'cmp_mng_mrpl',
        'MRPL & North Industrial Belt Voluntary Blood Drive',
        'MRPL Community Hall, Bala / Surathkal–Mulki Corridor',
        daysAheadDate(9),
        '09:30',
        '15:30',
        150,
        84,
        'MRPL Employees Welfare & Father Muller Blood Bank',
        'upcoming',
        'corporate',
        0,
        daysAgoIso(4),
        nowIso
      );

      insertCamp.run(
        'cmp_mng_kadri',
        'Kadri & Bejai Civic Voluntary Blood Camp',
        'Kadri Park Civic Hall, Kadri, Mangaluru',
        daysAheadDate(14),
        '09:00',
        '14:00',
        100,
        39,
        'Dakshina Kannada Red Cross & Lady Goschen Support Team',
        'upcoming',
        'community',
        0,
        daysAgoIso(2),
        nowIso
      );
    }
  });

  tx();
}
