const { chromium } = require('playwright');
const path = require('path');
const rand = Math.floor(Math.random() * 100000);

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } }); // 窄视口测试缩放
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:8777/');
  await page.waitForTimeout(700);
  const out = p => path.join('C:/Users/77230/moodcare/shots', p);

  // ① 视口 760px 高：手机框是否完整可见（无溢出）
  const phoneBox = await page.locator('.phone').boundingBox();
  console.log('phone box:', JSON.stringify(phoneBox), 'viewport 1280x760 → bottom edge', Math.round(phoneBox.y + phoneBox.height), 'vs', 760);
  await page.screenshot({ path: out('v2-01-fit-small-viewport.png') });

  // 注册
  await page.click('#liSwap b');
  await page.fill('#liUser', 'v2_' + rand);
  await page.fill('#liPass', 'v2test123');
  await page.click('#liBtn');
  await page.waitForTimeout(1500);

  // ② 自定义情绪词：风起 → 自己说
  await page.click('.fab button');
  await page.waitForTimeout(500);
  await page.click('.quad:nth-child(1)');
  await page.waitForTimeout(500);
  await page.click('text=✏️ 自己说');
  await page.fill('#custWordIn', '心里乱乱的');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('v2-02-custom-word.png') });
  // 应已进入 Step2（自定义词选中并跳步）
  const step2vis = await page.locator('#st2').isVisible();
  console.log('custom word → step2:', step2vis);

  // ③ 自定义触发因素
  await page.click('text=＋ 自己写');
  await page.fill('#custTagIn', '答辩');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const custTagSel = await page.locator('.tag.sel', { hasText: '答辩' }).count();
  console.log('custom trigger selected:', custTagSel);
  await page.click('text=下一步');
  await page.waitForTimeout(400);

  // ④ 写日记
  await page.click('#st3opts .opt >> text=写日记');
  await page.fill('#diaryIn', '今天改了一整天的产品，晚上终于把四个问题都修完了。虽然很累，但看到团子还是觉得被安慰到了。写多一点测试长文本自动扩展，看看输入框会不会跟着长高，应该会到最大高度后就内部滚动。');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('v2-03-diary.png') });
  const h = await page.evaluate(() => document.getElementById('diaryIn').style.height);
  console.log('diary autosize height:', h);
  await page.click('text=收好这一天');
  await page.waitForSelector('#respBody p:not(:has(.spin))', { timeout: 60000 });
  await page.screenshot({ path: out('v2-04-response.png') });
  await page.click('text=回到今天');
  await page.waitForTimeout(1500);

  // ⑤ 聊两句：文本自由输入 + 图片
  await page.click('.fab button');
  await page.waitForTimeout(500);
  await page.click('.quad:nth-child(3)');
  await page.waitForTimeout(500);
  await page.click('.wchip:nth-child(1)');
  await page.waitForTimeout(900);
  await page.click('text=下一步');
  await page.waitForTimeout(400);
  await page.click('#st3opts .opt >> text=聊两句');
  await page.waitForTimeout(1400);
  // 自由文本输入
  await page.fill('#chatText', '今天有点低落，发张图给你看看');
  await page.click('.iconbtn.send');
  await page.waitForTimeout(3000);
  // 图片输入
  await page.setInputFiles('#chatImg', 'test_cat.jpg');
  await page.waitForFunction(() => { const b=[...document.querySelectorAll('#chatBox .bub.ai')]; return b.length>=3 && b[2].textContent!=='…'; }, { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('v2-05-chat-image.png') });

  // ⑥ 聊完收好
  const fin = await page.locator('.qchip', { hasText: '收好这份心情' }).count();
  console.log('finish chip visible:', fin);

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
