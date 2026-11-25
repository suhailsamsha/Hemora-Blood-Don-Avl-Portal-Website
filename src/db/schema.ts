import { relations } from 'drizzle-orm';
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  photoUrl: text('photo_url').notNull().default(''),
  bloodGroup: text('blood_group').notNull().default('O+'),
  city: text('city').notNull().default('Mangaluru'),
  area: text('area').notNull().default('Hampankatta'),
  phone: text('phone').notNull().default(''),
  alertChannel: text('alert_channel').notNull().default('whatsapp'),
  lastDonation: text('last_donation'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const savedCentres = pgTable(
  'saved_centres',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    centreId: text('centre_id').notNull(),
    centreName: text('centre_name').notNull(),
    centreArea: text('centre_area').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('saved_centres_user_centre_idx').on(table.userId, table.centreId)]
);

export const cloudAppointments = pgTable('cloud_appointments', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  centreId: text('centre_id'),
  centreName: text('centre_name').notNull(),
  appointmentDate: text('appointment_date').notNull(),
  timeSlot: text('time_slot').notNull(),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('scheduled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cloudDonations = pgTable('cloud_donations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  donatedAt: text('donated_at').notNull(),
  location: text('location').notNull(),
  units: integer('units').notNull().default(1),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  savedCentres: many(savedCentres),
  appointments: many(cloudAppointments),
  donations: many(cloudDonations),
}));

export const savedCentresRelations = relations(savedCentres, ({ one }) => ({
  user: one(users, {
    fields: [savedCentres.userId],
    references: [users.id],
  }),
}));

export const cloudAppointmentsRelations = relations(cloudAppointments, ({ one }) => ({
  user: one(users, {
    fields: [cloudAppointments.userId],
    references: [users.id],
  }),
}));

export const cloudDonationsRelations = relations(cloudDonations, ({ one }) => ({
  user: one(users, {
    fields: [cloudDonations.userId],
    references: [users.id],
  }),
}));
