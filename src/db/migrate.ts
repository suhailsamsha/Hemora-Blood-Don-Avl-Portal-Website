import 'dotenv/config';
import { openDatabase, runMigrations } from './index.ts';

const db = openDatabase();
runMigrations(db);
db.close();
console.log('Migrations applied successfully.');
