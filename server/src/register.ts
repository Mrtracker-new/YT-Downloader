/**
 * register.ts — Preload module for ts-node / Node.js
 *
 * This file MUST be the first module evaluated by the runtime.
 * It loads the .env file before any other module (including the service
 * singletons) can read process.env, preventing the YTDLP_PATH / FFMPEG_PATH
 * ENOENT race condition that occurs when dotenv is called inside app.ts
 * after ES-module imports have already been evaluated.
 *
 * Usage:
 *   ts-node -r ./src/register src/app.ts     (dev)
 *   node -r ./dist/register dist/app.js       (production)
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Resolve .env relative to the server/ root, not cwd
config({ path: resolve(__dirname, '..', '.env') });
