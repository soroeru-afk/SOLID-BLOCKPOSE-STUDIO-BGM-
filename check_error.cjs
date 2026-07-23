const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
      console.log('BROWSER LOG:', msg.text());
    });
    
    page.on('pageerror', err => {
      console.log('PAGE ERROR:', err.toString());
    });
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 20000 });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const rootHtml = await page.evaluate(() => {
      const el = document.getElementById('root');
      return el ? el.innerHTML : 'No #root found';
    });
    console.log('ROOT HTML LENGTH:', rootHtml.length);
    console.log('ROOT HTML START:', rootHtml.substring(0, 200));
    
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('SCRIPT ERROR:', err);
    process.exit(1);
  }
})();
