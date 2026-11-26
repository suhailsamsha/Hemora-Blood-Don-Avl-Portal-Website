export const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const BLOOD_COMPONENTS = [
  'Whole Blood',
  'Packed Red Cells',
  'Platelets',
  'Fresh Frozen Plasma',
  'Cryoprecipitate',
] as const;
export type BloodComponent = (typeof BLOOD_COMPONENTS)[number];

export const URGENCY_LEVELS = ['critical', 'urgent', 'standard'] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

export const ALERT_CHANNELS = ['sms', 'whatsapp'] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

export const INDIAN_CITIES = [
  'Mangaluru',
  'Bengaluru',
  'Chennai',
  'Madurai',
  'Coimbatore',
  'Hyderabad',
  'Mumbai',
  'Delhi',
] as const;

export interface MangaloreAreaMeta {
  name: string;
  zone: 'City centre' | 'South / Ullal side' | 'Residential' | 'North';
  note?: string;
  lat: number;
  lng: number;
}

export const MANGALORE_AREAS: readonly MangaloreAreaMeta[] = [
  // City centre
  { name: 'Hampankatta', zone: 'City centre', lat: 12.8698, lng: 74.8430 },
  { name: 'Bunder', zone: 'City centre', lat: 12.8635, lng: 74.8342 },
  { name: 'Kodialbail', zone: 'City centre', lat: 12.8762, lng: 74.8415 },
  { name: 'Balmatta', zone: 'City centre', lat: 12.8715, lng: 74.8508 },
  { name: 'Attavar', zone: 'City centre', lat: 12.8624, lng: 74.8468 },
  // South / Ullal side
  { name: 'Kankanady', zone: 'South / Ullal side', lat: 12.8648, lng: 74.8595 },
  { name: 'Deralakatte', zone: 'South / Ullal side', lat: 12.8124, lng: 74.8835 },
  { name: 'Kuntikana', zone: 'South / Ullal side', lat: 12.8935, lng: 74.8535 },
  { name: 'Natekal', zone: 'South / Ullal side', lat: 12.8018, lng: 74.8920 },
  // Residential
  { name: 'Pumpwell', zone: 'Residential', lat: 12.8685, lng: 74.8672 },
  { name: 'Kadri', zone: 'Residential', lat: 12.8856, lng: 74.8558 },
  { name: 'Bejai', zone: 'Residential', lat: 12.8852, lng: 74.8432 },
  // North
  { name: 'Surathkal', zone: 'North', note: 'NITK & industrial belt', lat: 13.0085, lng: 74.7937 },
  { name: 'Mulki', zone: 'North', note: 'MRPL & northern industrial belt', lat: 13.0915, lng: 74.7932 },
] as const;

export interface CityAreaOption {
  name: string;
  zone?: string;
}

export const CITY_AREA_SUGGESTIONS: Record<string, ReadonlyArray<CityAreaOption>> = {
  Mangaluru: MANGALORE_AREAS,
  Bengaluru: [
    { name: 'Indiranagar', zone: 'East' },
    { name: 'Koramangala', zone: 'South East' },
    { name: 'Jayanagar', zone: 'South' },
    { name: 'Whitefield', zone: 'East' },
    { name: 'Malleshwaram', zone: 'North West' },
    { name: 'Rajajinagar', zone: 'West' },
    { name: 'Hebbal', zone: 'North' },
    { name: 'Yelahanka', zone: 'North' },
    { name: 'HSR Layout', zone: 'South East' },
    { name: 'Electronic City', zone: 'South' },
  ],
  Chennai: [
    { name: 'Adyar', zone: 'South' },
    { name: 'Anna Nagar', zone: 'North West' },
    { name: 'T. Nagar', zone: 'Central' },
    { name: 'Velachery', zone: 'South' },
    { name: 'Mylapore', zone: 'Central' },
    { name: 'Porur', zone: 'West' },
    { name: 'Tambaram', zone: 'South' },
    { name: 'Nungambakkam', zone: 'Central' },
  ],
  Madurai: [
    { name: 'KK Nagar', zone: 'East' },
    { name: 'Anna Nagar', zone: 'East' },
    { name: 'Goripalayam', zone: 'Central' },
    { name: 'SS Colony', zone: 'West' },
    { name: 'Tallakulam', zone: 'North' },
    { name: 'Thirunagar', zone: 'South West' },
  ],
  Coimbatore: [
    { name: 'RS Puram', zone: 'West' },
    { name: 'Gandhipuram', zone: 'Central' },
    { name: 'Peelamedu', zone: 'East' },
    { name: 'Race Course', zone: 'Central' },
    { name: 'Saibaba Colony', zone: 'North West' },
    { name: 'Singanallur', zone: 'South East' },
  ],
  Hyderabad: [
    { name: 'Banjara Hills', zone: 'Central' },
    { name: 'Jubilee Hills', zone: 'West' },
    { name: 'Madhapur', zone: 'West' },
    { name: 'Gachibowli', zone: 'West' },
    { name: 'Secunderabad', zone: 'North' },
    { name: 'Kukatpally', zone: 'North West' },
    { name: 'Dilsukhnagar', zone: 'East' },
  ],
  Mumbai: [
    { name: 'Dadar', zone: 'Central' },
    { name: 'Bandra', zone: 'Western Suburbs' },
    { name: 'Andheri', zone: 'Western Suburbs' },
    { name: 'Parel', zone: 'South Central' },
    { name: 'Powai', zone: 'Central Suburbs' },
    { name: 'Thane', zone: 'MMR' },
    { name: 'Borivali', zone: 'Western Suburbs' },
  ],
  Delhi: [
    { name: 'AIIMS / Ansari Nagar', zone: 'South' },
    { name: 'Connaught Place', zone: 'Central' },
    { name: 'Rohini', zone: 'North West' },
    { name: 'Dwarka', zone: 'South West' },
    { name: 'Lajpat Nagar', zone: 'South' },
    { name: 'Saket', zone: 'South' },
    { name: 'Karol Bagh', zone: 'Central' },
  ],
};

export function getCityAreaOptions(city?: string): ReadonlyArray<CityAreaOption> {
  if (city && CITY_AREA_SUGGESTIONS[city]) {
    return CITY_AREA_SUGGESTIONS[city];
  }
  return MANGALORE_AREAS;
}

export interface CityHospitalOption {
  name: string;
  area: string;
  kind: 'Hospital' | 'Blood Bank' | 'Medical College';
}

export const CITY_HOSPITAL_SUGGESTIONS: Record<string, ReadonlyArray<CityHospitalOption>> = {
  Mangaluru: [
    { name: 'Wenlock District Hospital Blood Bank', area: 'Hampankatta', kind: 'Blood Bank' },
    { name: 'Father Muller Medical College Hospital Blood Bank', area: 'Kankanady', kind: 'Blood Bank' },
    { name: 'KMC Hospital Blood Centre, Attavar', area: 'Attavar', kind: 'Blood Bank' },
    { name: 'AJ Hospital & Research Centre', area: 'Kuntikana', kind: 'Hospital' },
    { name: 'KMC Hospital, Ambedkar Circle', area: 'Balmatta', kind: 'Hospital' },
    { name: 'Lady Goschen Hospital', area: 'Hampankatta', kind: 'Hospital' },
    { name: 'Yenepoya Medical College Hospital', area: 'Deralakatte', kind: 'Medical College' },
    { name: 'Justice KS Hegde Charitable Hospital', area: 'Deralakatte', kind: 'Medical College' },
    { name: 'Indiana Hospital & Heart Institute', area: 'Pumpwell', kind: 'Hospital' },
    { name: 'Unity Hospital', area: 'Highland / Kankanady', kind: 'Hospital' },
    { name: 'Highland Hospital', area: 'Falnir / Kankanady', kind: 'Hospital' },
    { name: 'Mangalore Red Cross Blood Bank', area: 'Hampankatta', kind: 'Blood Bank' },
    { name: 'Tejasvini Hospital', area: 'Kadri', kind: 'Hospital' },
    { name: 'SCS Hospital', area: 'Balmatta', kind: 'Hospital' },
  ],
  Madurai: [
    { name: 'Government Rajaji Hospital Blood Centre', area: 'Goripalayam', kind: 'Blood Bank' },
    { name: 'Meenakshi Mission Hospital & Research Centre', area: 'Lake Area / Melur Rd', kind: 'Hospital' },
    { name: 'Apollo Speciality Hospitals, Madurai', area: 'KK Nagar', kind: 'Hospital' },
    { name: 'Velammal Medical College Hospital & Research Institute', area: 'Anuppanadi', kind: 'Medical College' },
    { name: 'Vadamalayan Hospitals', area: 'Chokkikulam / Tallakulam', kind: 'Hospital' },
    { name: 'Devadoss Hospital', area: 'Alagar Kovil Rd / Tallakulam', kind: 'Hospital' },
    { name: 'Hannah Joseph Hospital', area: 'Chinthamani / Ring Rd', kind: 'Hospital' },
    { name: 'Preethi Hospitals', area: 'KK Nagar', kind: 'Hospital' },
    { name: 'Grace Kennett Foundation Hospital', area: 'Ellis Nagar / SS Colony', kind: 'Hospital' },
    { name: 'Lions Blood Bank, Madurai', area: 'Anna Nagar', kind: 'Blood Bank' },
    { name: 'Indian Red Cross Blood Bank, Madurai', area: 'Goripalayam', kind: 'Blood Bank' },
  ],
  Bengaluru: [
    { name: 'Victoria Hospital Blood Bank', area: 'KR Market / Fort', kind: 'Blood Bank' },
    { name: 'Bowring & Lady Curzon Hospital', area: 'Shivajinagar', kind: 'Hospital' },
    { name: "St. John's Medical College Hospital", area: 'Koramangala', kind: 'Medical College' },
    { name: 'Manipal Hospital, Old Airport Road', area: 'Indiranagar / HAL', kind: 'Hospital' },
    { name: 'Narayana Health City', area: 'Electronic City / Bommasandra', kind: 'Hospital' },
    { name: 'MS Ramaiah Memorial Hospital', area: 'Mathikere / Malleshwaram', kind: 'Medical College' },
    { name: 'Fortis Hospital, Bannerghatta Road', area: 'Bannerghatta / Jayanagar', kind: 'Hospital' },
    { name: 'Apollo Hospitals, Jayanagar', area: 'Jayanagar', kind: 'Hospital' },
    { name: 'Aster CMI Hospital', area: 'Hebbal', kind: 'Hospital' },
    { name: 'Rotary TTK Blood Bank', area: 'Thippasandra / Indiranagar', kind: 'Blood Bank' },
    { name: 'Rashtrotthana Blood Centre', area: 'Gavipuram / Rajajinagar', kind: 'Blood Bank' },
  ],
  Chennai: [
    { name: 'Rajiv Gandhi Government General Hospital Blood Bank', area: 'Park Town / Central', kind: 'Blood Bank' },
    { name: 'Stanley Medical College Hospital', area: 'Royapuram', kind: 'Medical College' },
    { name: 'Apollo Hospitals, Greams Road', area: 'Nungambakkam', kind: 'Hospital' },
    { name: 'MIOT International', area: 'Manapakkam / Porur', kind: 'Hospital' },
    { name: 'Kauvery Hospital, Alwarpet', area: 'Mylapore / Alwarpet', kind: 'Hospital' },
    { name: 'Sri Ramachandra Medical Centre', area: 'Porur', kind: 'Medical College' },
    { name: 'Kilpauk Medical College Hospital', area: 'Kilpauk / Anna Nagar', kind: 'Medical College' },
    { name: 'Institute of Child Health & Hospital', area: 'Egmore', kind: 'Hospital' },
    { name: 'Gleneagles HealthCity Chennai', area: 'Perumbakkam / Velachery', kind: 'Hospital' },
    { name: 'VHS Blood Bank', area: 'Taramani / Adyar', kind: 'Blood Bank' },
    { name: 'Lions Blood Bank, Chennai', area: 'Egmore', kind: 'Blood Bank' },
  ],
  Coimbatore: [
    { name: 'Coimbatore Medical College Hospital (CMCH)', area: 'Gopalapuram / Central', kind: 'Blood Bank' },
    { name: 'KMCH (Kovai Medical Center & Hospital)', area: 'Avinashi Rd / Peelamedu', kind: 'Hospital' },
    { name: 'PSG Hospitals', area: 'Peelamedu', kind: 'Medical College' },
    { name: 'Ganga Hospital', area: 'Mettupalayam Rd / Saibaba Colony', kind: 'Hospital' },
    { name: 'G. Kuppuswamy Naidu Memorial Hospital (GKNM)', area: 'Pappanaickenpalayam', kind: 'Hospital' },
    { name: 'Sri Ramakrishna Hospital', area: 'Sidhapudur / Gandhipuram', kind: 'Hospital' },
    { name: 'Royal Care Super Speciality Hospital', area: 'Neelambur', kind: 'Hospital' },
    { name: 'GEM Hospital & Research Centre', area: 'Ramanathapuram', kind: 'Hospital' },
    { name: 'Indian Red Cross Blood Bank, Coimbatore', area: 'Race Course', kind: 'Blood Bank' },
  ],
  Hyderabad: [
    { name: 'Osmania General Hospital Blood Bank', area: 'Afzal Gunj', kind: 'Blood Bank' },
    { name: 'Gandhi Hospital & Medical College', area: 'Secunderabad', kind: 'Medical College' },
    { name: "Nizam's Institute of Medical Sciences (NIMS)", area: 'Panjagutta / Banjara Hills', kind: 'Hospital' },
    { name: 'Apollo Hospitals, Jubilee Hills', area: 'Jubilee Hills', kind: 'Hospital' },
    { name: 'Yashoda Hospitals, Somajiguda', area: 'Somajiguda', kind: 'Hospital' },
    { name: 'KIMS Hospitals, Secunderabad', area: 'Secunderabad', kind: 'Hospital' },
    { name: 'CARE Hospitals, Banjara Hills', area: 'Banjara Hills', kind: 'Hospital' },
    { name: 'AIG Hospitals, Gachibowli', area: 'Gachibowli / Madhapur', kind: 'Hospital' },
    { name: 'Chiranjeevi Charitable Trust Blood Bank', area: 'Jubilee Hills', kind: 'Blood Bank' },
    { name: 'Indian Red Cross Blood Bank, Vidyanagar', area: 'Vidyanagar', kind: 'Blood Bank' },
  ],
  Mumbai: [
    { name: 'KEM Hospital Blood Bank', area: 'Parel', kind: 'Blood Bank' },
    { name: 'Sion Hospital (LTMGH) Blood Bank', area: 'Sion', kind: 'Hospital' },
    { name: 'Tata Memorial Hospital', area: 'Parel', kind: 'Hospital' },
    { name: 'Sir JJ Group of Hospitals', area: 'Byculla', kind: 'Medical College' },
    { name: 'Lilavati Hospital & Research Centre', area: 'Bandra West', kind: 'Hospital' },
    { name: 'Kokilaben Dhirubhai Ambani Hospital', area: 'Andheri West', kind: 'Hospital' },
    { name: 'Nanavati Max Super Speciality Hospital', area: 'Vile Parle / Andheri', kind: 'Hospital' },
    { name: 'P. D. Hinduja Hospital', area: 'Mahim / Dadar', kind: 'Hospital' },
    { name: 'Jaslok Hospital & Research Centre', area: 'Pedder Road / South Central', kind: 'Hospital' },
    { name: 'Samarpan Blood Centre', area: 'Ghatkopar / Central Suburbs', kind: 'Blood Bank' },
  ],
  Delhi: [
    { name: 'AIIMS Main Blood Bank', area: 'AIIMS / Ansari Nagar', kind: 'Blood Bank' },
    { name: 'Safdarjung Hospital Blood Bank', area: 'Ansari Nagar West', kind: 'Hospital' },
    { name: 'Dr. Ram Manohar Lohia (RML) Hospital', area: 'Connaught Place', kind: 'Hospital' },
    { name: 'Lok Nayak (LNJP) Hospital', area: 'Jawaharlal Nehru Marg', kind: 'Hospital' },
    { name: 'Sir Ganga Ram Hospital', area: 'Rajinder Nagar / Karol Bagh', kind: 'Hospital' },
    { name: 'Indraprastha Apollo Hospital', area: 'Sarita Vihar / South', kind: 'Hospital' },
    { name: 'Max Super Speciality Hospital, Saket', area: 'Saket', kind: 'Hospital' },
    { name: 'Guru Teg Bahadur (GTB) Hospital', area: 'Dilshad Garden', kind: 'Medical College' },
    { name: 'Fortis Escorts Heart Institute', area: 'Okhla / Lajpat Nagar', kind: 'Hospital' },
    { name: 'Indian Red Cross Society Blood Bank', area: 'Parliament Street / Central', kind: 'Blood Bank' },
  ],
};

export function getCityHospitalOptions(city?: string): ReadonlyArray<CityHospitalOption> {
  if (!city) return CITY_HOSPITAL_SUGGESTIONS.Mangaluru;
  const normalized = city.trim().toLowerCase();
  const exactKey = Object.keys(CITY_HOSPITAL_SUGGESTIONS).find(
    (k) => k.toLowerCase() === normalized
  );
  if (exactKey) return CITY_HOSPITAL_SUGGESTIONS[exactKey];
  return [];
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

export const COOLDOWN_DAYS = 90;
export const RECONFIRM_DAYS = 90;
export const REQUEST_EXPIRY_DAYS = 7;
export const COORDINATOR_FALLBACK_HOURS = 2;

export interface DonorEligibility {
  isCooldownActive: boolean;
  isConfirmationFresh: boolean;
  isSearchEligible: boolean;
  nextEligibleDate: string | null;
  daysUntilEligible: number;
  daysSinceConfirmed: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computeDonorEligibility(
  params: {
    available: boolean;
    lastDonation: string | null;
    lastConfirmedAt: string;
  },
  now: Date = new Date()
): DonorEligibility {
  let isCooldownActive = false;
  let nextEligibleDate: string | null = null;
  let daysUntilEligible = 0;

  if (params.lastDonation) {
    const donatedAt = new Date(`${params.lastDonation}T00:00:00.000Z`);
    if (!Number.isNaN(donatedAt.getTime())) {
      const eligibleAt = new Date(donatedAt.getTime() + COOLDOWN_DAYS * MS_PER_DAY);
      if (eligibleAt.getTime() > now.getTime()) {
        isCooldownActive = true;
        nextEligibleDate = eligibleAt.toISOString().slice(0, 10);
        daysUntilEligible = Math.ceil((eligibleAt.getTime() - now.getTime()) / MS_PER_DAY);
      }
    }
  }

  const confirmedAt = new Date(params.lastConfirmedAt);
  const daysSinceConfirmed = Number.isNaN(confirmedAt.getTime())
    ? 999
    : Math.max(0, Math.floor((now.getTime() - confirmedAt.getTime()) / MS_PER_DAY));
  const isConfirmationFresh = daysSinceConfirmed <= RECONFIRM_DAYS;
  const isSearchEligible = params.available && !isCooldownActive && isConfirmationFresh;

  return {
    isCooldownActive,
    isConfirmationFresh,
    isSearchEligible,
    nextEligibleDate,
    daysUntilEligible,
    daysSinceConfirmed,
  };
}

export interface DonorPublic {
  id: string;
  firstName: string;
  bloodGroup: BloodGroup;
  city: string;
  area: string;
  lastDonation: string | null;
  available: boolean;
  verified: boolean;
  lastConfirmedAt: string;
  alertChannel: AlertChannel;
  eligibility: DonorEligibility;
}

export interface DonationRecord {
  id: string;
  donorId: string;
  donatedAt: string;
  location: string;
  units: number;
  notes: string;
  createdAt: string;
}

export interface DonationAppointment {
  id: string;
  donorId: string;
  appointmentDate: string;
  timeSlot: string;
  location: string;
  centreId: string | null;
  units: number;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface NotificationEntry {
  id: string;
  donorId: string;
  channel: AlertChannel;
  kind: 'match_alert' | 'reconfirm_reminder' | 'contact_request' | 'appointment_booked';
  message: string;
  createdAt: string;
}

export interface DonorProfile extends DonorPublic {
  name: string;
  age: number;
  phoneMasked: string;
  createdAt: string;
  donations: DonationRecord[];
  appointments: DonationAppointment[];
  notifications: NotificationEntry[];
}

export interface BloodRequest {
  id: string;
  requesterName: string;
  bloodGroup: BloodGroup;
  units: number;
  hospital: string;
  city: string;
  area: string;
  urgency: Urgency;
  status: 'open' | 'fulfilled' | 'expired' | 'removed';
  notes: string;
  expiresAt: string;
  fulfilledAt: string | null;
  createdAt: string;
  contactCount?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  assignedTo?: string;
}

export interface ContactRequestView {
  id: string;
  requestId: string;
  donorId: string;
  donorFirstName: string;
  donorBloodGroup: BloodGroup;
  donorCity: string;
  donorArea: string;
  donorVerified: boolean;
  requesterName: string;
  hospital: string;
  units: number;
  urgency: Urgency;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  coordinatorFallbackAt: string;
  isFallbackDue: boolean;
  donorPhone?: string;
  requesterPhone?: string;
  respondedAt: string | null;
  createdAt: string;
}

export interface NotificationDispatchReceipt {
  id: string;
  channel: AlertChannel;
  recipientFirstName: string;
  recipientMasked: string;
  messageText: string;
  sentAt: string;
  gatewayMode: 'twilio' | 'webhook' | 'portal_queue';
}

export interface RequestAlertDispatchSummary {
  total: number;
  whatsappCount: number;
  smsCount: number;
  sampleMessage: string;
  sentAt: string;
}

export interface ReportEntry {
  id: string;
  targetType: 'donor' | 'request';
  targetId: string;
  targetSummary: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface GroupAvailabilitySummary {
  bloodGroup: BloodGroup;
  availableCount: number;
  verifiedAvailableCount: number;
}

export interface ShortageHighlight {
  bloodGroup: BloodGroup;
  city: string;
  availableCount: number;
}

export interface AvailabilitySummary {
  totalAvailable: number;
  totalRegistered: number;
  citiesCount: number;
  byGroup: GroupAvailabilitySummary[];
  shortages: ShortageHighlight[];
  cityList: string[];
}

export interface AdminDashboardData {
  stats: {
    totalDonors: number;
    activeEligibleDonors: number;
    verifiedDonors: number;
    openRequests: number;
    fulfilledRequests: number;
    medianFulfilHours: number | null;
    openReports: number;
    overdueFallbacks: number;
    activeByGroup: Record<BloodGroup, number>;
  };
  heatmap: Array<{
    city: string;
    counts: Record<BloodGroup, number>;
  }>;
  donors: Array<
    DonorPublic & {
      name: string;
      age: number;
      phoneMasked: string;
      createdAt: string;
    }
  >;
  requests: BloodRequest[];
  reports: ReportEntry[];
  overdueContactRequests: ContactRequestView[];
  auditLogs: Array<{
    id: string;
    actor: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    createdAt: string;
  }>;
}

export interface AdminUserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

export interface ManagedUserRecord {
  id: string;
  source: 'donor' | 'user';
  name: string;
  emailOrPhone: string;
  role: 'donor' | 'recipient' | 'hospital' | 'admin';
  bloodGroup?: BloodGroup;
  city: string;
  area?: string;
  verified: boolean;
  blocked: boolean;
  status: 'active' | 'pending' | 'blocked';
  lastDonation?: string | null;
  eligible?: boolean;
  nextEligibleDate?: string | null;
  createdAt: string;
}

export interface BloodStockItem {
  id: string;
  bloodGroup: BloodGroup;
  units: number;
  component: string;
  location: string;
  city: string;
  centreId?: string | null;
  collectionDate: string;
  expiryDate: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  isLowStock: boolean;
  updatedAt: string;
}

export interface DonationCamp {
  id: string;
  title: string;
  city: string;
  venue: string;
  campDate: string;
  startTime: string;
  endTime: string;
  slotsTotal: number;
  slotsBooked: number;
  organizer: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  campCategory?: 'college' | 'corporate' | 'community';
  unitsCollected?: number;
  createdAt: string;
}

export interface AdminDonationItem {
  id: string;
  donorId: string;
  donorName: string;
  donorBloodGroup: BloodGroup;
  donorCity: string;
  donatedAt: string;
  location: string;
  units: number;
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  nextEligibleDate: string | null;
  isCooldownActive: boolean;
  createdAt: string;
}

export interface AdminNotificationItem {
  id: string;
  channel: string;
  bloodGroup: string;
  city: string;
  subject: string;
  message: string;
  recipientsCount: number;
  sentBy: string;
  createdAt: string;
}

export interface SiteContentItem {
  key: string;
  title: string;
  body: string;
  active: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  updatedAt: string;
}

export interface AdminOverviewPayload {
  summary: {
    totalDonors: number;
    totalRecipients: number;
    totalHospitals: number;
    totalRequests: number;
    pendingApprovals: number;
    totalUnitsAvailable: number;
    openAbuseReports: number;
  };
  stockByGroup: Array<{
    bloodGroup: BloodGroup;
    units: number;
    lowStock: boolean;
  }>;
  lowStockAlerts: Array<{
    bloodGroup: BloodGroup;
    units: number;
    reason: string;
  }>;
  expiredOrExpiringStock: BloodStockItem[];
  recentRequests: BloodRequest[];
  recentDonations: AdminDonationItem[];
  cityHeatmap: Array<{
    city: string;
    counts: Record<BloodGroup, number>;
  }>;
  unreadNotificationsCount: number;
}

export interface CentreStockEntry {
  id: string;
  bloodGroup: BloodGroup;
  component: string;
  units: number;
  isLowStock: boolean;
  expiryDate: string;
  updatedAt: string;
}

export interface BloodCentreView {
  id: string;
  priority: number;
  name: string;
  centreType: 'Blood bank' | 'Hospital';
  zone: string;
  area: string;
  city: string;
  address: string;
  contactPhone: string;
  is24Hour: boolean;
  licenceInfo: string;
  verificationNote: string;
  notes: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  totalUnits: number;
  lastUpdated: string;
  lowStockGroups: BloodGroup[];
  stockByGroup: Record<BloodGroup, number>;
  stockByComponent: Record<string, number>;
  stockEntries: CentreStockEntry[];
}

export interface BloodCentresPayload {
  city: string;
  centres: BloodCentreView[];
  cityStockByGroup: Array<{
    bloodGroup: BloodGroup;
    units: number;
    lowStock: boolean;
    historicalShortageNote?: string;
  }>;
  camps: DonationCamp[];
  eRaktKoshUrl: string;
  verificationNotice: string;
}


