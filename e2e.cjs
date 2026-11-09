const { chromium } = require('playwright');
const path = require('path');
const rand = Math.floor(Math.random() * 100000);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:8777/');
  await page.waitForTimeout(800);
  const out = p => path.join('C:/Users/77230/moodcare/shots', p);

  // 登录页
  await page.screenshot({ path: out('e2e-01-login.png') });

  // 注册
  await page.click('#liSwap b');
  await page.fill('#liUser', 'e2e_' + rand);
  await page.fill('#liPass', 'e2etest123');
  await page.click('#liBtn');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: out('e2e-02-home-empty.png') });

  // 记录：夜雨·疲惫（写一句路径）
  await page.click('.fab button');
  await page.waitForTimeout(500);
  await page.click('.quad:nth-child(3)');
  await page.waitForTimeout(500);
  await page.click('.wchip:nth-child(3)');
  await page.waitForTimeout(800);
  await page.click('.tag:nth-child(2)');
  await page.click('text=下一步');
  await page.waitForTimeout(400);
  await page.click('#st3opts .opt >> text=写一句');
  await page.fill('#noteIn', '连着加了三天班，想说点什么又不知道说什么');
  await page.click('#st3write .btn');
  // 等待 LLM 回应
  await page.waitForSelector('#respBody p:not(:has(.spin))', { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('e2e-03-response.png') });

  // 回到今天
  await page.click('text=回到今天');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: out('e2e-04-home-recorded.png') });

  // 聊两句（单轮验证 AI 回复到达）
  await page.click('.fab button');
  await page.waitForTimeout(500);
  await page.click('.quad:nth-child(1)');
  await page.waitForTimeout(500);
  await page.click('.wchip:nth-child(2)');
  await page.waitForTimeout(800);
  await page.click('text=下一步');
  await page.waitForTimeout(400);
  await page.click('#st3opts .opt >> text=聊两句');
  await page.waitForTimeout(1200);
  await page.click('#st3chat .qchip >> nth=0');
  await page.waitForSelector('#chatBox .bub.ai:nth-of-type(3)', { timeout: 60000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('e2e-05-chat.png') });
  await page.click('#record .ohead .x');
  await page.waitForTimeout(600);

  // 洞察
  await page.click('[data-pg="pg-insight"]');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out('e2e-06-insight.png') });

  // 周报
  await page.click('.wkcard');
  await page.waitForSelector('#wkBody:not(:empty)', { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('e2e-07-weekly.png') });
  await page.click('text=收下这份周报');
  await page.waitForTimeout(400);

  // 关怀 + 呼吸
  await page.click('[data-pg="pg-care"]');
  await page.waitForTimeout(400);
  await page.click('#pg-care .tool >> text=呼吸');
  await page.waitForTimeout(4000);
  await page.screenshot({ path: out('e2e-08-breath.png') });
  await page.click('#breath .bx');

  // 信件
  await page.fill('#letterIn', '这一周辛苦了，慢慢来');
  await page.click('text=存好');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('e2e-09-letter.png') });

  // 深夜
  await page.click('#themeChip');
  await page.click('[data-pg="pg-home"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('e2e-10-night.png') });

  console.log('E2E done. errors:', errors.length ? errors : 'none');
  await browser.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
