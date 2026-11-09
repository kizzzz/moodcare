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

  // 注册并打开今日页聊天
  await page.click('#liSwap b');
  await page.fill('#liUser', 'e4_' + rand);
  await page.fill('#liPass', 'e4test123');
  await page.click('#liBtn');
  await page.waitForTimeout(1600);
  await page.click('.chat-entry');
  await page.waitForTimeout(900);

  // ① 输入条应在手机底部（phone 高 844，聊天气泡 overlay 全屏于 phone 内）
  const bar = await page.locator('#moodchat .chatbar').boundingBox();
  const phone = await page.locator('.phone').boundingBox();
  const phoneBottom = phone.y + phone.height - (phone.height / 844) * 16; // 底部留白≈16
  console.log('chatbar bottom:', Math.round(bar.y + bar.height), '| phone bottom ~', Math.round(phoneBottom),
    '| pinned:', bar.y + bar.height > phoneBottom - 30);

  // ② 多轮对话 → 自动滚到最新
  const msgs = ['今天有点烦', '工作上一堆事堆着', '还有点想家', '不过晚上吃了顿好的'];
  for (const m of msgs) {
    await page.fill('#mText', m);
    await page.click('#moodchat .iconbtn.send');
    await page.waitForFunction(() => { const w = document.getElementById('mBoxWrap'); const b = [...w.querySelectorAll('.bub.ai')]; return b.length && b[b.length - 1].textContent !== '…'; }, { timeout: 60000 });
    await page.waitForTimeout(300);
  }
  const scroll = await page.evaluate(() => { const w = document.getElementById('mBoxWrap'); return { top: w.scrollTop, h: w.scrollHeight, ch: w.clientHeight }; });
  console.log('scroll:', JSON.stringify(scroll), '| atBottom:', scroll.top + scroll.ch >= scroll.h - 12, '| scrollable:', scroll.h > scroll.ch);

  // ③ 上滑 300px 后再发一条 → 自动回底
  await page.evaluate(() => { document.getElementById('mBoxWrap').scrollTop = 0; });
  await page.waitForTimeout(200);
  const topAfter = await page.evaluate(() => document.getElementById('mBoxWrap').scrollTop);
  await page.fill('#mText', '总之今天就先这样吧');
  await page.click('#moodchat .iconbtn.send');
  await page.waitForFunction(() => { const w = document.getElementById('mBoxWrap'); const b = [...w.querySelectorAll('.bub.ai')]; return b.length && b[b.length - 1].textContent !== '…'; }, { timeout: 60000 });
  await page.waitForTimeout(400);
  const scroll2 = await page.evaluate(() => { const w = document.getElementById('mBoxWrap'); return { top: w.scrollTop, h: w.scrollHeight, ch: w.clientHeight }; });
  console.log('after up-scroll+new msg:', JSON.stringify(scroll2), '| back to bottom:', scroll2.top + scroll2.ch >= scroll2.h - 12, '| up scroll worked:', topAfter < 50);
  await page.screenshot({ path: out('v4-01-moodchat-bottom.png') });

  // ④ 记录流程里的聊两句：输入条同样置底
  await page.click('#moodchat .ohead .x');
  await page.waitForTimeout(500);
  await page.click('.fab button');
  await page.waitForTimeout(500);
  await page.click('.quad:nth-child(3)');
  await page.waitForTimeout(500);
  await page.click('.wchip:nth-child(1)');
  await page.waitForTimeout(900);
  await page.click('text=下一步');
  await page.waitForTimeout(400);
  await page.click('#st3opts .opt >> text=聊两句');
  await page.waitForTimeout(1000);
  const bar2 = await page.locator('#st3chat .chatbar').boundingBox();
  console.log('record chatbar bottom:', Math.round(bar2.y + bar2.height), '| pinned:', bar2.y + bar2.height > phoneBottom - 30);
  await page.screenshot({ path: out('v4-02-record-chat.png') });

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
