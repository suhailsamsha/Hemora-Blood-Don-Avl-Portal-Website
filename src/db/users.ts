import { and, desc, eq } from 'drizzle-orm';
import { COOLDOWN_DAYS } from '../shared/types.ts';
import { pgDb } from './pg.ts';
import {
  cloudAppointments,
  cloudDonations,
  savedCentres,
  users,
} from './schema.ts';

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
}) {
  try {
    const existing = await pgDb
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    if (existing.length > 0) {
      const updated = await pgDb
        .update(users)
        .set({
          email: params.email || existing[0].email,
          displayName: existing[0].displayName || params.displayName || '',
          photoUrl: params.photoUrl ?? existing[0].photoUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, params.uid))
        .returning();
      return updated[0];
    }

    const inserted = await pgDb
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        displayName: params.displayName || '',
        photoUrl: params.photoUrl || '',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: params.email,
          updatedAt: new Date(),
        },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Unable to sync user profile right now.', { cause: error });
  }
}

export async function getUserAccountBundle(uid: string) {
  try {
    const userRows = await pgDb
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);
    const user = userRows[0];
    if (!user) return null;

    const [bookmarks, appointments, donations] = await Promise.all([
      pgDb
        .select()
        .from(savedCentres)
        .where(eq(savedCentres.userId, user.id))
        .orderBy(desc(savedCentres.createdAt)),
      pgDb
        .select()
        .from(cloudAppointments)
        .where(eq(cloudAppointments.userId, user.id))
        .orderBy(desc(cloudAppointments.appointmentDate)),
      pgDb
        .select()
        .from(cloudDonations)
        .where(eq(cloudDonations.userId, user.id))
        .orderBy(desc(cloudDonations.donatedAt)),
    ]);

    return { user, bookmarks, appointments, donations };
  } catch (error) {
    console.error('Database query failed in getUserAccountBundle:', error);
    throw new Error('Unable to load saved Cloud SQL account data.', { cause: error });
  }
}

export async function updateUserAccountProfile(
  uid: string,
  patch: {
    displayName?: string;
    bloodGroup?: string;
    city?: string;
    area?: string;
    phone?: string;
    alertChannel?: string;
  }
) {
  try {
    const updated = await pgDb
      .update(users)
      .set({
        ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
        ...(patch.bloodGroup !== undefined ? { bloodGroup: patch.bloodGroup } : {}),
        ...(patch.city !== undefined ? { city: patch.city } : {}),
        ...(patch.area !== undefined ? { area: patch.area } : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
        ...(patch.alertChannel !== undefined ? { alertChannel: patch.alertChannel } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateUserAccountProfile:', error);
    throw new Error('Unable to save profile updates.', { cause: error });
  }
}

export async function saveCentreBookmark(
  uid: string,
  payload: { centreId: string; centreName: string; centreArea?: string; notes?: string }
) {
  try {
    const userRows = await pgDb.select().from(users).where(eq(users.uid, uid)).limit(1);
    const user = userRows[0];
    if (!user) throw new Error('Account not initialized.');

    const inserted = await pgDb
      .insert(savedCentres)
      .values({
        userId: user.id,
        centreId: payload.centreId,
        centreName: payload.centreName,
        centreArea: payload.centreArea ?? '',
        notes: payload.notes ?? '',
      })
      .onConflictDoUpdate({
        target: [savedCentres.userId, savedCentres.centreId],
        set: {
          centreName: payload.centreName,
          centreArea: payload.centreArea ?? '',
        },
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database query failed in saveCentreBookmark:', error);
    throw new Error('Unable to save blood bank bookmark.', { cause: error });
  }
}

export async function removeCentreBookmark(uid: string, centreId: string) {
  try {
    const userRows = await pgDb.select().from(users).where(eq(users.uid, uid)).limit(1);
    const user = userRows[0];
    if (!user) return;

    await pgDb
      .delete(savedCentres)
      .where(and(eq(savedCentres.userId, user.id), eq(savedCentres.centreId, centreId)));
  } catch (error) {
    console.error('Database query failed in removeCentreBookmark:', error);
    throw new Error('Unable to remove saved blood bank.', { cause: error });
  }
}

export async function createCloudAppointment(
  uid: string,
  payload: {
    centreId?: string | null;
    centreName: string;
    appointmentDate: string;
    timeSlot: string;
    notes?: string;
  }
) {
  try {
    const userRows = await pgDb.select().from(users).where(eq(users.uid, uid)).limit(1);
    const user = userRows[0];
    if (!user) throw new Error('Account not initialized.');

    const [existingDonations, existingAppts] = await Promise.all([
      pgDb.select().from(cloudDonations).where(eq(cloudDonations.userId, user.id)),
      pgDb.select().from(cloudAppointments).where(eq(cloudAppointments.userId, user.id)),
    ]);

    const targetMs = new Date(`${payload.appointmentDate}T00:00:00.000Z`).getTime();
    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    const allDates: Array<{ date: string; kind: string }> = existingDonations.map((d) => ({
      date: d.donatedAt,
      kind: 'donation',
    }));
    for (const a of existingAppts) {
      if (a.status !== 'cancelled') {
        allDates.push({ date: a.appointmentDate, kind: 'scheduled appointment' });
      }
    }

    for (const item of allDates) {
      const exMs = new Date(`${item.date}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(exMs) && Math.abs(targetMs - exMs) < cooldownMs) {
        const nextEligible = new Date(exMs + cooldownMs).toISOString().slice(0, 10);
        throw new Error(
          `COOLDOWN_CONFLICT:Selected date is within 90 days of your ${item.date} ${item.kind}. Earliest eligible date: ${nextEligible}.`
        );
      }
    }

    const inserted = await pgDb
      .insert(cloudAppointments)
      .values({
        userId: user.id,
        centreId: payload.centreId ?? null,
        centreName: payload.centreName,
        appointmentDate: payload.appointmentDate,
        timeSlot: payload.timeSlot,
        notes: payload.notes ?? '',
        status: 'scheduled',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('COOLDOWN_CONFLICT:')) {
      throw error;
    }
    console.error('Database query failed in createCloudAppointment:', error);
    throw new Error('Unable to schedule appointment.', { cause: error });
  }
}

export async function updateCloudAppointmentStatus(
  uid: string,
  appointmentId: number,
  status: 'completed' | 'cancelled'
) {
  try {
    const userRows = await pgDb.select().from(users).where(eq(users.uid, uid)).limit(1);
    const user = userRows[0];
    if (!user) throw new Error('Account not initialized.');

    const existingRows = await pgDb
      .select()
      .from(cloudAppointments)
      .where(and(eq(cloudAppointments.id, appointmentId), eq(cloudAppointments.userId, user.id)))
      .limit(1);

    const appt = existingRows[0];
    if (!appt) return null;

    const updated = await pgDb
      .update(cloudAppointments)
      .set({ status })
      .where(and(eq(cloudAppointments.id, appointmentId), eq(cloudAppointments.userId, user.id)))
      .returning();

    if (status === 'completed') {
      await pgDb.insert(cloudDonations).values({
        userId: user.id,
        donatedAt: appt.appointmentDate,
        location: appt.centreName,
        units: 1,
        notes: appt.notes || 'Completed from scheduled appointment',
      });
      if (!user.lastDonation || appt.appointmentDate > user.lastDonation) {
        await pgDb
          .update(users)
          .set({ lastDonation: appt.appointmentDate, updatedAt: new Date() })
          .where(eq(users.id, user.id));
      }
    }

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateCloudAppointmentStatus:', error);
    throw new Error('Unable to update appointment status.', { cause: error });
  }
}

export async function logCloudDonation(
  uid: string,
  payload: { donatedAt: string; location: string; units: number; notes?: string }
) {
  try {
    const userRows = await pgDb.select().from(users).where(eq(users.uid, uid)).limit(1);
    const user = userRows[0];
    if (!user) throw new Error('Account not initialized.');

    const existingDonations = await pgDb
      .select()
      .from(cloudDonations)
      .where(eq(cloudDonations.userId, user.id));

    const targetMs = new Date(`${payload.donatedAt}T00:00:00.000Z`).getTime();
    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

    for (const d of existingDonations) {
      const exMs = new Date(`${d.donatedAt}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(exMs) && Math.abs(targetMs - exMs) < cooldownMs) {
        const nextEligible = new Date(exMs + cooldownMs).toISOString().slice(0, 10);
        throw new Error(
          `COOLDOWN_CONFLICT:Cannot donate within 90 days of your ${d.donatedAt} donation. Next eligible date: ${nextEligible}.`
        );
      }
    }

    const inserted = await pgDb
      .insert(cloudDonations)
      .values({
        userId: user.id,
        donatedAt: payload.donatedAt,
        location: payload.location,
        units: Math.max(1, payload.units || 1),
        notes: payload.notes ?? '',
      })
      .returning();

    if (!user.lastDonation || payload.donatedAt > user.lastDonation) {
      await pgDb
        .update(users)
        .set({ lastDonation: payload.donatedAt, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    return inserted[0];
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('COOLDOWN_CONFLICT:')) {
      throw error;
    }
    console.error('Database query failed in logCloudDonation:', error);
    throw new Error('Unable to record donation.', { cause: error });
  }
}
