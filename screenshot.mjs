import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const url = process.argv[2] ?? 'http://localhost:3000';
const label = process.argv[3];
const OUT = 'temp-screenshots';

await mkdir(OUT, { recursive: true });

const nextIndex =
  (await readdir(OUT))
    .map((f) => Number(f.match(/^screenshot-(\d+)/)?.[1]))
    .filter(Number.isInteger)
    .reduce((max, n) => Math.max(max, n), 0) + 1;

const outPath = join(OUT, label ? `screenshot-${nextIndex}-${label}.png` : `screenshot-${nextIndex}.png`);

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      const step = 400;
      let y = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, step);
        y += step;
        if (y >= document.body.scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 150);
    });
  });
  // Give the last batch of lazy content (images, IntersectionObserver sections) time to load.
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 200));
}

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await autoScroll(page);
await page.screenshot({ path: outPath, fullPage: true, captureBeyondViewport: true });
await browser.close();

console.log(outPath);
