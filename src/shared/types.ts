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


