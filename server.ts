import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { aiRouter, aiConfigured } from './server/ai.ts';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);

app.set('trust proxy', true);
app.use(express.json({ limit: '300kb' }));
app.use('/api/ai', aiRouter);

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`My Family AI on http://localhost:${port} (${isProd ? 'production' : 'development'}, AI ${aiConfigured() ? 'on' : 'off'})`);
  });
}

startServer();
