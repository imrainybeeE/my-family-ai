import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { aiRouter } from './ai.ts';
import { warmNetflix } from './media.ts';

/** Sites allowed to call the AI from a browser. The GitHub Pages site and local dev by default. */
const ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://imrainybeee.github.io')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function cors(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin && (ORIGINS.includes(origin) || LOCAL.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

/** The AI API on its own: used by the local server and by the hosted function. */
export function createApp() {
  // This week's Netflix chart is a large download, so it starts before anyone asks for it.
  warmNetflix();
  const app = express();
  app.set('trust proxy', true);
  app.use('/api/ai', cors, express.json({ limit: '300kb' }), aiRouter);
  return app;
}
