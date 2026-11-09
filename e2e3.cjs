const { chromium } = require('playwright');
const path = require('path');
const rand = Math.floor(Math.random() * 100000);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:8777/');
  await page.waitForTimeout(700);
  const out = p => path.join('C:/Users/77230/moodcare/shots', p);

  // 注册
  await page.click('#liSwap b');
  await page.fill('#liUser', 'e3_' + rand);
  await page.fill('#liPass', 'e3test123');
  await page.click('#liBtn');
  await page.waitForTimeout(1600);

  // 今日页对话入口
  await page.click('.chat-entry');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('v3-01-moodchat.png') });

  // 发第一条（情绪信号）
  await page.fill('#mText', '今天被老板当众批评了，又委屈又生气，憋了一下午');
  await page.click('#moodchat .iconbtn.send');
  await page.waitForFunction(() => { const b=[...document.querySelectorAll('#mBox .bub.ai')]; return b.length>=2 && b[b.length-1].textContent!=='…'; }, { timeout: 60000 });
  await page.waitForTimeout(400);

  // 📝 记下来 → 强制提案
  await page.click('text=📝 记下来');
  await page.waitForSelector('#mBox .propcard', { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('v3-02-proposal.png') });
  const propText = await page.locator('.propcard').innerText();
  console.log('PROPOSAL:', propText.replace(/\n/g, ' | ').slice(0, 120));

  // 收进今天的天空
  await page.click('.propcard .yes');
  await page.waitForFunction(() => document.querySelector('.propcard .yes').textContent.includes('✓'), { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('v3-03-accepted.png') });
  await page.click('#moodchat .ohead .x');
  await page.waitForTimeout(800);

  // 今日页天空应点亮
  const skyInfo = await page.locator('.sky .info').count();
  console.log('sky recorded:', skyInfo === 1);
  await page.screenshot({ path: out('v3-04-home-sky.png') });

  // 分享存图（下载事件）
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.click('.sky .share'),
  ]);
  console.log('share download:', download.suggestedFilename());

  // 洞察页：天空日历 60 格
  await page.click('[data-pg="pg-insight"]');
  await page.waitForTimeout(900);
  const cells = await page.locator('#calGrid i').count();
  const colored = await page.locator('#calGrid i[style*="background:rgb"]').count() + await page.locator('#calGrid i[style*="background:#"]').count();
  console.log('calendar cells:', cells, '| colored:', colored);
  await page.screenshot({ path: out('v3-05-insight-cal.png') });

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
