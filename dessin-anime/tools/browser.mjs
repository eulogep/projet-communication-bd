// Ouvre la page de rendu dans Chrome sans interface (puppeteer-core + Chrome installé)
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import { startServer } from './server.mjs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

export async function openRenderer(film) {
  const exe = CANDIDATES.find((p) => fs.existsSync(p));
  if (!exe) throw new Error('Chrome introuvable : définissez CHROME_PATH');
  const server = await startServer(0);
  const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--force-color-profile=srgb', '--hide-scrollbars'] });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[page]', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('[console]', m.text()));
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?render=${film}`, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true || window.__error', { timeout: 60000 });
  const err = await page.evaluate('window.__error');
  if (err) throw new Error(err);
  const duration = await page.evaluate('window.__duration');
  const close = async () => { await browser.close(); server.close(); };
  return { page, duration, close };
}
