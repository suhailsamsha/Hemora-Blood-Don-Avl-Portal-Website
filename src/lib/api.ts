import type {
  AdminDonationItem,
  AdminNotificationItem,
  AdminOverviewPayload,
  AdminUserSession,
  AlertChannel,
  AvailabilitySummary,
  BloodCentresPayload,
  BloodComponent,
  BloodGroup,
  BloodRequest,
  BloodStockItem,
  ContactRequestView,
  DonationCamp,
  DonorProfile,
  DonorPublic,
  FaqItem,
  ManagedUserRecord,
  NotificationDispatchReceipt,
  ReportEntry,
  RequestAlertDispatchSummary,
  SiteContentItem,
  Urgency,
} from '../shared/types.ts';

const STORAGE_DONOR_TOKEN = 'bdp_donor_token';
const STORAGE_ADMIN_TOKEN = 'bdp_admin_token';
const STORAGE_REQUEST_TOKENS = 'bdp_request_tokens';
const STORAGE_CONTACT_TRACKS = 'bdp_contact_tracks';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface SavedContactTrack {
  id: string;
  token: string;
  donorFirstName: string;
  bloodGroup: BloodGroup;
  hospital: string;
  createdAt: string;
}

export function getDonorToken(): string | null {
  return localStorage.getItem(STORAGE_DONOR_TOKEN);
}

export function setDonorToken(token: string | null): void {
  if (token) localStorage.setItem(STORAGE_DONOR_TOKEN, token);
  else localStorage.removeItem(STORAGE_DONOR_TOKEN);
}

export function getAdminToken(): string | null {
  return localStorage.getItem(STORAGE_ADMIN_TOKEN);
}

export function setAdminToken(token: string | null): void {
  if (token) localStorage.setItem(STORAGE_ADMIN_TOKEN, token);
  else localStorage.removeItem(STORAGE_ADMIN_TOKEN);
}

export function getRequestTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_REQUEST_TOKENS) || '{}');
  } catch {
    return {};
  }
}

export function saveRequestToken(requestId: string, token: string): void {
  const map = getRequestTokens();
  map[requestId] = token;
  localStorage.setItem(STORAGE_REQUEST_TOKENS, JSON.stringify(map));
}

export function getSavedContactTracks(): SavedContactTrack[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CONTACT_TRACKS) || '[]');
  } catch {
    return [];
  }
}

export function saveContactTrack(track: SavedContactTrack): void {
  const list = getSavedContactTracks().filter((item) => item.id !== track.id);
  list.unshift(track);
  localStorage.setItem(STORAGE_CONTACT_TRACKS, JSON.stringify(list.slice(0, 15)));
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

export const api = {
  getSummary: () => requestJson<AvailabilitySummary>('/api/summary'),

  getCentres: (params?: {
    bloodGroup?: string;
    component?: string;
    area?: string;
    zone?: string;
    centreType?: string;
    only24Hour?: boolean;
    nearestToArea?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.bloodGroup && params.bloodGroup !== 'ALL') qs.set('bloodGroup', params.bloodGroup);
    if (params?.component && params.component !== 'ALL') qs.set('component', params.component);
    if (params?.area && params.area !== 'ALL') qs.set('area', params.area);
    if (params?.zone && params.zone !== 'ALL') qs.set('zone', params.zone);
    if (params?.centreType && params.centreType !== 'ALL') qs.set('centreType', params.centreType);
    if (params?.only24Hour) qs.set('only24Hour', 'true');
    if (params?.nearestToArea) qs.set('nearestToArea', params.nearestToArea);
    return requestJson<BloodCentresPayload>(`/api/centres?${qs.toString()}`);
  },

  getPublicContent: () =>
    requestJson<{
      contents: Array<{ key: string; title: string; body: string; active: number; updatedAt: string }>;
      faqs: Array<{ id: string; question: string; answer: string; sortOrder: number }>;
      camps: DonationCamp[];
    }>('/api/public/content'),

  searchDonors: (params: {
    bloodGroup?: string;
    city?: string;
    area?: string;
    availableOnly?: boolean;
    verifiedOnly?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (params.bloodGroup && params.bloodGroup !== 'ALL') qs.set('bloodGroup', params.bloodGroup);
    if (params.city) qs.set('city', params.city);
    if (params.area) qs.set('area', params.area);
    qs.set('availableOnly', String(params.availableOnly ?? true));
    if (params.verifiedOnly) qs.set('verifiedOnly', 'true');
    return requestJson<{ donors: DonorPublic[]; total: number }>(`/api/donors?${qs.toString()}`);
  },

  sendOtp: (
    phone: string,
    purpose: 'register' | 'login' | 'request_contact' | 'request_blood' | 'respond_request'
  ) =>
    requestJson<{
      challengeId: string;
      maskedPhone: string;
      expiresInSeconds: number;
      devHintCode?: string;
    }>('/api/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone, purpose }),
    }),

  verifyOtp: (challengeId: string, code: string, phone: string) =>
    requestJson<{ verified: boolean; verificationToken: string; purpose: string }>('/api/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId, code, phone }),
    }),

  registerDonor: (payload: {
    name: string;
    age: number;
    bloodGroup: BloodGroup;
    city: string;
    area: string;
    phone: string;
    lastDonation?: string | null;
    alertChannel: AlertChannel;
    consentAccepted: boolean;
    verificationToken: string;
  }) =>
    requestJson<{ token: string; donor: DonorPublic }>('/api/donors/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  loginDonor: (verificationToken: string) =>
    requestJson<{ token: string; donorId: string }>('/api/donor/login', {
      method: 'POST',
      body: JSON.stringify({ verificationToken }),
    }),

  getDonorMe: (token: string) =>
    requestJson<{ profile: DonorProfile; incomingRequests: ContactRequestView[] }>('/api/donor/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  updateDonorMe: (
    token: string,
    patch: {
      name?: string;
      age?: number;
      available?: boolean;
      alertChannel?: AlertChannel;
      city?: string;
      area?: string;
      reconfirm?: boolean;
    }
  ) =>
    requestJson<{ profile: DonorProfile; incomingRequests: ContactRequestView[] }>('/api/donor/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    }),

  logDonation: (
    token: string,
    payload: { donatedAt: string; location: string; units: number; notes?: string }
  ) =>
    requestJson<{ profile: DonorProfile; incomingRequests: ContactRequestView[] }>(
      '/api/donor/me/donations',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }
    ),

  scheduleAppointment: (
    token: string,
    payload: {
      appointmentDate: string;
      timeSlot: string;
      location: string;
      centreId?: string | null;
      notes?: string;
    }
  ) =>
    requestJson<{ profile: DonorProfile; incomingRequests: ContactRequestView[] }>(
      '/api/donor/me/appointments',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }
    ),

  updateAppointmentStatus: (
    token: string,
    appointmentId: string,
    status: 'completed' | 'cancelled'
  ) =>
    requestJson<{ profile: DonorProfile; incomingRequests: ContactRequestView[] }>(
      `/api/donor/me/appointments/${appointmentId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      }
    ),

  deleteDonorMe: (token: string) =>
    requestJson<{ deleted: boolean }>('/api/donor/me', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  respondContactRequest: (token: string, contactRequestId: string, decision: 'accepted' | 'declined') =>
    requestJson<{ profile: DonorProfile; incomingRequests: ContactRequestView[] }>(
      `/api/donor/contact-requests/${contactRequestId}/respond`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision }),
      }
    ),

  getRequests: (params?: { bloodGroup?: string; city?: string; urgency?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.bloodGroup && params.bloodGroup !== 'ALL') qs.set('bloodGroup', params.bloodGroup);
    if (params?.city) qs.set('city', params.city);
    if (params?.urgency && params.urgency !== 'ALL') qs.set('urgency', params.urgency);
    if (params?.status) qs.set('status', params.status);
    return requestJson<{ requests: BloodRequest[]; total: number }>(`/api/requests?${qs.toString()}`);
  },

  createRequest: (payload: {
    requesterName: string;
    phone: string;
    bloodGroup: BloodGroup;
    units: number;
    hospital: string;
    city: string;
    area?: string;
    urgency: Urgency;
    notes?: string;
    verificationToken: string;
  }) =>
    requestJson<{
      request: BloodRequest;
      matchedNotifiedCount: number;
      dispatchedSummary?: RequestAlertDispatchSummary;
      requesterToken: string;
    }>('/api/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondToBloodRequest: (
    requestId: string,
    auth: { donorToken?: string | null; verificationToken?: string }
  ) =>
    requestJson<{
      contactRequestId: string;
      requesterName: string;
      requesterPhone: string;
      hospital: string;
      city: string;
    }>(`/api/requests/${requestId}/respond`, {
      method: 'POST',
      headers: auth.donorToken ? { Authorization: `Bearer ${auth.donorToken}` } : {},
      body: JSON.stringify({ verificationToken: auth.verificationToken }),
    }),

  fulfillRequest: (requestId: string, token: string) =>
    requestJson<{ request: BloodRequest }>(`/api/requests/${requestId}/fulfill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  renewRequest: (requestId: string, token: string) =>
    requestJson<{ request: BloodRequest }>(`/api/requests/${requestId}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  createContactRequest: (payload: {
    donorId: string;
    requesterName: string;
    phone: string;
    hospital: string;
    units: number;
    urgency: Urgency;
    verificationToken: string;
  }) =>
    requestJson<{
      contactRequest: ContactRequestView;
      trackingToken: string;
      requesterToken: string;
      notificationDispatch?: NotificationDispatchReceipt;
    }>('/api/contact-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getContactRequestStatus: (id: string, trackingToken: string) =>
    requestJson<{
      contactRequest: ContactRequestView;
      coordinatorFallback: {
        message: string;
        helplineNote: string;
        stateBloodCellNumber: string;
      } | null;
    }>(`/api/contact-requests/${id}`, {
      headers: { Authorization: `Bearer ${trackingToken}` },
    }),

  submitReport: (payload: {
    targetType: 'donor' | 'request';
    targetId: string;
    reason: string;
    details?: string;
  }) =>
    requestJson<{ id: string; status: string }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitFeedback: (payload: { name?: string; message: string; page?: string }) =>
    requestJson<{ id: string }>('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // --- Admin Auth & RBAC Platform APIs ---
  adminLoginWithPassword: (email: string, password: string) =>
    requestJson<{ token: string; user: AdminUserSession }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  adminLogout: (token: string) =>
    requestJson<{ loggedOut: boolean }>('/api/admin/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminMe: (token: string) =>
    requestJson<{ user: AdminUserSession }>('/api/admin/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAdminOverview: (token: string) =>
    requestJson<AdminOverviewPayload>('/api/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAdminUsers: (
    token: string,
    params: { search?: string; role?: string; status?: string; page?: number; limit?: number }
  ) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.role && params.role !== 'ALL') qs.set('role', params.role);
    if (params.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    return requestJson<{
      users: ManagedUserRecord[];
      total: number;
      page: number;
      totalPages: number;
      limit: number;
    }>(`/api/admin/users?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  moderateAdminUser: (
    token: string,
    source: 'donor' | 'user',
    id: string,
    action: 'verify' | 'unverify' | 'block' | 'unblock'
  ) =>
    requestJson<{ updated: boolean; id: string; action: string }>(`/api/admin/users/${source}/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    }),

  deleteAdminUser: (token: string, source: 'donor' | 'user', id: string) =>
    requestJson<{ deleted: boolean }>(`/api/admin/users/${source}/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAdminStock: (token: string) =>
    requestJson<{ stock: BloodStockItem[] }>('/api/admin/stock', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  addAdminStock: (
    token: string,
    payload: {
      bloodGroup: BloodGroup;
      units: number;
      component: BloodComponent | 'PRBC' | 'FFP';
      location: string;
      city: string;
      collectionDate: string;
      expiryDate: string;
      centreId?: string;
    }
  ) =>
    requestJson<{ item: BloodStockItem }>('/api/admin/stock', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  updateAdminStock: (
    token: string,
    id: string,
    patch: { units?: number; location?: string; city?: string; expiryDate?: string }
  ) =>
    requestJson<{ item: BloodStockItem }>(`/api/admin/stock/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    }),

  deleteAdminStock: (token: string, id: string) =>
    requestJson<{ deleted: boolean }>(`/api/admin/stock/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAdminRequests: (token: string) =>
    requestJson<{ requests: BloodRequest[] }>('/api/admin/requests', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  moderateAdminRequest: (
    token: string,
    id: string,
    payload: {
      action: 'approve' | 'reject' | 'assign' | 'fulfill';
      rejectionReason?: string;
      assignedTo?: string;
    }
  ) =>
    requestJson<{ updated: boolean; id: string; action: string }>(`/api/admin/requests/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  getAdminDonations: (token: string) =>
    requestJson<{ donations: AdminDonationItem[] }>('/api/admin/donations', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createAdminDonation: (
    token: string,
    payload: {
      donorId: string;
      donatedAt: string;
      location: string;
      units: number;
      notes?: string;
      status: 'scheduled' | 'completed' | 'cancelled';
    }
  ) =>
    requestJson<{ id: string }>('/api/admin/donations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  updateAdminDonation: (
    token: string,
    id: string,
    status: 'scheduled' | 'completed' | 'cancelled'
  ) =>
    requestJson<{ id: string; status: string }>(`/api/admin/donations/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),

  getAdminCamps: (token: string) =>
    requestJson<{ camps: DonationCamp[] }>('/api/admin/camps', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createAdminCamp: (
    token: string,
    payload: {
      title: string;
      city: string;
      venue: string;
      campDate: string;
      startTime: string;
      endTime: string;
      slotsTotal: number;
      organizer: string;
      campCategory?: 'college' | 'corporate' | 'community';
      unitsCollected?: number;
    }
  ) =>
    requestJson<{ id: string }>('/api/admin/camps', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  updateAdminCamp: (
    token: string,
    id: string,
    patch: Partial<{
      title: string;
      city: string;
      venue: string;
      campDate: string;
      startTime: string;
      endTime: string;
      slotsTotal: number;
      organizer: string;
      status: 'upcoming' | 'completed' | 'cancelled';
      campCategory: 'college' | 'corporate' | 'community';
      unitsCollected: number;
    }>
  ) =>
    requestJson<{ updated: boolean; id: string }>(`/api/admin/camps/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    }),

  deleteAdminCamp: (token: string, id: string) =>
    requestJson<{ deleted: boolean }>(`/api/admin/camps/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAdminNotifications: (token: string) =>
    requestJson<{
      notifications: AdminNotificationItem[];
      gatewayMode?: 'twilio' | 'webhook' | 'portal_queue';
    }>('/api/admin/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  sendAdminNotification: (
    token: string,
    payload: {
      channel: 'email' | 'in_app' | 'sms' | 'whatsapp';
      bloodGroup: string;
      city: string;
      subject: string;
      message: string;
    }
  ) =>
    requestJson<{
      id: string;
      recipientsCount: number;
      gatewayMode?: 'twilio' | 'webhook' | 'portal_queue';
    }>('/api/admin/notifications', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  getAdminReportsData: (
    token: string,
    params: { type: 'donations' | 'requests' | 'stock'; from?: string; to?: string }
  ) => {
    const qs = new URLSearchParams({ type: params.type });
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    return requestJson<{
      type: 'donations' | 'requests' | 'stock';
      from: string;
      to: string;
      rows: Array<Record<string, unknown>>;
      abuseReports: ReportEntry[];
    }>(`/api/admin/reports-data?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  exportAdminReportCsv: async (
    token: string,
    params: { type: 'donations' | 'requests' | 'stock'; from?: string; to?: string }
  ) => {
    const qs = new URLSearchParams({ type: params.type });
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    const res = await fetch(`/api/admin/reports/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new ApiError(`CSV export failed (${res.status})`, res.status);
    }
    return res.blob();
  },

  moderateAbuseReport: (token: string, id: string, status: 'resolved' | 'dismissed') =>
    requestJson<{ id: string; status: string }>(`/api/admin/abuse-reports/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),

  getAdminContent: (token: string) =>
    requestJson<{ contents: SiteContentItem[]; faqs: FaqItem[] }>('/api/admin/content', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  saveSiteContent: (
    token: string,
    key: string,
    payload: { title: string; body: string; active: boolean }
  ) =>
    requestJson<{ key: string; title: string; body: string; active: boolean }>(
      `/api/admin/content/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }
    ),

  createFaq: (token: string, payload: { question: string; answer: string; sortOrder?: number }) =>
    requestJson<{ id: string }>('/api/admin/faqs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  updateFaq: (token: string, id: string, payload: { question: string; answer: string }) =>
    requestJson<{ updated: boolean; id: string }>(`/api/admin/faqs/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  deleteFaq: (token: string, id: string) =>
    requestJson<{ deleted: boolean }>(`/api/admin/faqs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),

  getAdminAuditLogs: (token: string) =>
    requestJson<{
      logs: Array<{
        id: string;
        actor: string;
        action: string;
        targetType: string;
        targetId: string;
        summary: string;
        createdAt: string;
      }>;
    }>('/api/admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  changeAdminPassword: (token: string, currentPassword: string, newPassword: string) =>
    requestJson<{ updated: boolean }>('/api/admin/settings/password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getAdmins: (token: string) =>
    requestJson<{
      admins: Array<{
        id: string;
        name: string;
        email: string;
        status: 'active' | 'blocked';
        created_at: string;
      }>;
    }>('/api/admin/admins', {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createAdmin: (token: string, payload: { name: string; email: string; password: string }) =>
    requestJson<{ id: string; name: string; email: string; status: string }>('/api/admin/admins', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),

  updateAdminStatus: (token: string, id: string, status: 'active' | 'blocked') =>
    requestJson<{ id: string; status: string }>(`/api/admin/admins/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    }),

  deleteAdmin: (token: string, id: string) =>
    requestJson<{ deleted: boolean }>(`/api/admin/admins/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      body: undefined,
    }),
};
