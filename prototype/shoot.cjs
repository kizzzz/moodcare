const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('file:///C:/Users/77230/moodcare/prototype/index.html');
  await page.waitForTimeout(900);
  const out = p => path.join('C:/Users/77230/moodcare/shots', p);

  await page.screenshot({ path: out('01-home-light.png') });

  // 打开记录 Step1
  await page.click('.fab button');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('02-record-step1.png') });

  // 选 夜雨
  await page.click('.quad:nth-child(3)');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('03-record-words.png') });

  // 选词 疲惫
  await page.click('.wchip:nth-child(3)');
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('04-record-step2.png') });

  // 选触发 工作 + 下一步
  await page.click('.tag:nth-child(2)');
  await page.click('text=下一步');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('05-record-step3.png') });

  // 聊两句
  await page.click('text=聊两句');
  await page.waitForTimeout(2600);
  await page.screenshot({ path: out('06-chat.png') });

  // 点快速回复 chip
  await page.click('#st3chat .qchip >> nth=1');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('07-response.png') });

  // 完成微行动
  await page.click('.ma button >> nth=0');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('08-response-done.png') });

  // 回到今天
  await page.click('text=回到今天');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('09-home-recorded.png') });

  // 洞察
  await page.click('[data-pg="pg-insight"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('10-insight.png') });

  // 周报
  await page.click('text=本周的天空 · 第 45 周');
  await page.waitForTimeout(700);
  await page.screenshot({ path: out('11-weekly.png') });
  await page.click('text=收下这份周报');

  // 关怀
  await page.click('[data-pg="pg-care"]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('12-care.png') });

  // 呼吸
  await page.click('#pg-care .tool >> text=呼吸');
  await page.waitForTimeout(4500);
  await page.screenshot({ path: out('13-breath.png') });
  await page.click('.breath .bx');
  await page.waitForTimeout(600);

  // 我的
  await page.click('[data-pg="pg-me"]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('14-me.png') });

  // 深夜模式（回到今日）
  await page.click('#themeChip');
  await page.click('[data-pg="pg-home"]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('15-home-night.png') });

  // 帮助 sheet
  await page.click('[data-pg="pg-care"]');
  await page.waitForTimeout(400);
  await page.click('text=需要更多帮助');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('16-help-night.png') });

  await browser.close();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
