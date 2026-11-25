export interface CloudUserRecord {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
  bloodGroup: string;
  city: string;
  area: string;
  phone: string;
  alertChannel: string;
  lastDonation: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedCentreBookmark {
  id: number;
  userId: number;
  centreId: string;
  centreName: string;
  centreArea: string;
  notes: string;
  createdAt: string;
}

export interface CloudAppointmentRecord {
  id: number;
  userId: number;
  centreId: string | null;
  centreName: string;
  appointmentDate: string;
  timeSlot: string;
  notes: string;
  status: string;
  createdAt: string;
}

export interface CloudDonationRecord {
  id: number;
  userId: number;
  donatedAt: string;
  location: string;
  units: number;
  notes: string;
  createdAt: string;
}

export interface CloudAccountBundle {
  user: CloudUserRecord;
  bookmarks: SavedCentreBookmark[];
  appointments: CloudAppointmentRecord[];
  donations: CloudDonationRecord[];
}

async function authFetch<T>(url: string, idToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const accountApi = {
  getMe: (idToken: string) => authFetch<CloudAccountBundle>('/api/account/me', idToken),

  updateProfile: (
    idToken: string,
    patch: {
      displayName?: string;
      bloodGroup?: string;
      city?: string;
      area?: string;
      phone?: string;
      alertChannel?: string;
    }
  ) =>
    authFetch<CloudAccountBundle>('/api/account/profile', idToken, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  saveCentre: (
    idToken: string,
    payload: { centreId: string; centreName: string; centreArea?: string; notes?: string }
  ) =>
    authFetch<CloudAccountBundle>('/api/account/saved-centres', idToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removeSavedCentre: (idToken: string, centreId: string) =>
    authFetch<CloudAccountBundle>(
      `/api/account/saved-centres/${encodeURIComponent(centreId)}`,
      idToken,
      { method: 'DELETE' }
    ),

  createAppointment: (
    idToken: string,
    payload: {
      centreId?: string | null;
      centreName: string;
      appointmentDate: string;
      timeSlot: string;
      notes?: string;
    }
  ) =>
    authFetch<CloudAccountBundle>('/api/account/appointments', idToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateAppointmentStatus: (
    idToken: string,
    appointmentId: number,
    status: 'completed' | 'cancelled'
  ) =>
    authFetch<CloudAccountBundle>(`/api/account/appointments/${appointmentId}`, idToken, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  logDonation: (
    idToken: string,
    payload: { donatedAt: string; location: string; units: number; notes?: string }
  ) =>
    authFetch<CloudAccountBundle>('/api/account/donations', idToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
