import 'dotenv/config';
import { openDatabase, runMigrations } from './index.ts';
import { seedDatabase, ensureAdminSeedData } from './seedData.ts';

const db = openDatabase();
runMigrations(db);
const seeded = seedDatabase(db, { force: process.argv.includes('--force') });
ensureAdminSeedData(db);
db.close();
console.log(seeded ? 'Database seeded successfully.' : 'Database already contains data (pass --force to re-seed).');
