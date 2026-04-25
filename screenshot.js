const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setCacheEnabled(false);
  await page.goto('file://' + path.resolve(__dirname, 'index.html') + '?t=' + Date.now(), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: 'preview-home-full-' + Date.now() + '.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
