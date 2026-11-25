# Blood Donation Portal

We built this portal for patients' families in urgent need, voluntary blood donors, and hospital coordinators. Our design prioritizes fast mobile access on 3G networks, donor phone privacy, and fresh availability data.

## Commands

- Install dependencies: `npm install`
- Run SQL migrations and seed realistic Indian sample data: `npm run db:setup`
- Start full-stack dev server (Express API + Vite on port 3000): `npm run dev`
- Run backend and availability-logic tests: `npm test`
- Build for production: `npm run build`
- Start production server: `npm start`

Copy `.env.example` to `.env` if you want to override `DATABASE_PATH`, `OTP_HMAC_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, or `ADMIN_NAME` (default seeded admin: `admin@bloodportal.org` / `Admin@2026`).

## Admin Interface

- **Login URL**: `/admin/login` (redirects non-admin roles and invalid tokens)
- **Dashboard & Sections**: `/admin`, `/admin/users`, `/admin/stock`, `/admin/requests`, `/admin/donations`, `/admin/camps`, `/admin/notifications`, `/admin/reports`, `/admin/content`, `/admin/settings`

## Architecture and Decisions

- **SQLite with SQL migrations (`src/db/migrations/001_init.sql`, `002_admin_platform.sql`)**: Uses `better-sqlite3` with explicit SQL migrations so the entire app runs locally in one command without requiring an external database service.
- **Role-based admin security (`src/server/adminRoutes.ts`)**: Passwords are hashed with `scrypt`, sessions use signed JWTs with token revocation (`revoked_tokens`), and every `/api/admin/*` route validates `role = 'admin'` and active account status against SQLite.
- **90-day recovery and reconfirmation rules (`src/shared/types.ts`)**: Donors who donated within the last 90 days are marked in cooldown with a calculated next eligible date. Donors who have not reconfirmed within 90 days are hidden from public search automatically until they reconfirm in their dashboard.
- **Two-sided contact privacy (`src/server/crypto.ts`)**: Mobile numbers are stored as HMAC-SHA256 hashes alongside AES-256-GCM encrypted values. Public search never returns phone numbers.
- **Multilingual support (`src/i18n/translations.ts`)**: English, Tamil, Hindi, and Kannada are supported across navigation, search, request boards, and emergency notices.

