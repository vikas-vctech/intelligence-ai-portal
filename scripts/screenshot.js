#!/usr/bin/env node
/**
 * screenshot.js — render an HTML file and save a PNG screenshot.
 *
 * Usage:
 *   node screenshot.js <input.html> <output.png> [options]
 *
 * Options:
 *   --width=1280       Viewport width (default 1280)
 *   --height=800       Viewport height (default 800)
 *   --section=<selector>  Capture only the element matching this CSS selector
 *   --no-fullpage      Capture only the viewport, not the full page
 *   --help             Show this help
 *
 * Examples:
 *   node screenshot.js index.html out.png
 *   node screenshot.js index.html hero.png --section="#hero"
 *   node screenshot.js index.html mobile.png --width=390 --height=844
 *
 * On first run, auto-installs Puppeteer if it isn't already available.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function printHelp() {
  console.log(`
screenshot.js — render an HTML file and save a PNG.

Usage:
  node screenshot.js <input.html> <output.png> [options]

Options:
  --width=<px>         Viewport width (default 1280)
  --height=<px>        Viewport height (default 800)
  --section=<selector> Capture only the element matching this CSS selector
  --no-fullpage        Capture only the viewport, not the full page
  --help               Show this help
`);
}

function parseArgs(argv) {
  const args = { width: 1280, height: 800, fullPage: true, section: null };
  const positional = [];
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') { args.help = true; continue; }
    if (a === '--no-fullpage') { args.fullPage = false; continue; }
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) {
      const [, key, value] = m;
      if (key === 'width' || key === 'height') args[key] = parseInt(value, 10);
      else if (key === 'section') args.section = value;
      else { console.error(`Unknown flag: --${key}`); process.exit(2); }
    } else {
      positional.push(a);
    }
  }
  args.input = positional[0];
  args.output = positional[1];
  return args;
}

function ensurePuppeteer() {
  try {
    require.resolve('puppeteer');
    return require('puppeteer');
  } catch (_) {
    console.error('Puppeteer not found. Installing (one-time, ~150MB)...');
    try {
      execSync('npm install --no-save --silent puppeteer', { stdio: 'inherit' });
    } catch (e) {
      console.error('Failed to install Puppeteer automatically.');
      console.error('Try installing manually: npm install puppeteer');
      process.exit(1);
    }
    return require('puppeteer');
  }
}

(async () => {
  const args = parseArgs(process.argv);

  if (args.help || !args.input || !args.output) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const fileUrl = 'file://' + inputPath;
  const puppeteer = ensurePuppeteer();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: args.width, height: args.height, deviceScaleFactor: 2 });
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    // Give Tailwind CDN's JIT a beat to apply styles.
    await new Promise(r => setTimeout(r, 500));

    if (args.section) {
      const el = await page.$(args.section);
      if (!el) {
        console.error(`Selector not found on page: ${args.section}`);
        process.exit(1);
      }
      await el.screenshot({ path: args.output });
    } else {
      await page.screenshot({ path: args.output, fullPage: args.fullPage });
    }

    console.log(`Saved: ${args.output}`);
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
