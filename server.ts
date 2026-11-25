import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { openDatabase, runMigrations } from './src/db/index.ts';
import { seedDatabase, ensureAdminSeedData } from './src/db/seedData.ts';
import { createApp } from './src/server/app.ts';

async function startServer() {
  const db = openDatabase();
  runMigrations(db);
  seedDatabase(db);
  ensureAdminSeedData(db);

  const app = createApp(db);
  const isProd = process.env.NODE_ENV === 'production';
  const port =
    isProd && !process.env.NGINX_PORT && !process.env.DEFAULT_APP_PORT
      ? Number(process.env.PORT) || 3000
      : Number(process.env.DEFAULT_APP_PORT) || 3000;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Blood Donation Portal server running on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
