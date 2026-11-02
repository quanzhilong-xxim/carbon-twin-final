import { chromium, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base = process.env.CHECK_URL || 'http://127.0.0.1:3034';
const out = process.env.ARTIFACT_DIR || 'C:/Users/23242/Documents/Codex/2026-11-02/1-carbontwin-app-2-next-js/outputs/research-release/local';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1, acceptDownloads: true });
const results = [], errors = [], apiEvidence = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', async response => {
 if (response.url().endsWith('/api/chat') && response.status() === 200) {
  try { const body = await response.text(); const events = body.split('\n').filter(line => line.startsWith('data: ') && line !== 'data: [DONE]').map(line => JSON.parse(line.slice(6))); const raw = events.filter(event => event.type === 'text-delta').map(event => event.delta).join(''); let parsed; try { parsed=JSON.parse(raw); } catch {} apiEvidence.push({ status:response.status(), events:events.map(e=>e.type), response:parsed, partialText:parsed?undefined:raw }); } catch {}
 }
});
const step = async (name, run) => { const start=Date.now(); try { const detail=await run(); results.push({name,passed:true,milliseconds:Date.now()-start,detail}); console.log('PASS',name); } catch(error) { results.push({name,passed:false,error:error.message}); throw error; } };
const screenshot = async name => { await page.mouse.move(1,1); await page.waitForTimeout(350); await page.screenshot({path:path.join(out,name), animations:'allow'}); };
const go = async route => { await page.goto(base+route,{waitUntil:'domcontentloaded'}); await page.evaluate(()=>document.fonts.ready); await expect(page.locator('html')).toHaveAttribute('data-motion-ready','true'); };
const ask = async text => { const launcher=page.getByRole('button',{name:'打开碳知识 AI 教练'}); if(await launcher.getAttribute('aria-expanded')!=='true') await launcher.click(); await page.getByRole('textbox',{name:'向碳知识教练提问'}).fill(text); await page.getByRole('button',{name:'发送问题',exact:true}).click(); };
const closeChat = async()=>{if(await page.locator('#ai-chat-panel').count()){await page.getByRole('button',{name:'关闭 AI 聊天窗'}).click();await expect(page.locator('#ai-chat-panel')).toHaveCount(0);}};
function streamBody(requestId, raw, complete=true) {
 const chunks=[{type:'start',messageId:crypto.randomUUID(),messageMetadata:{citations:[],calculatedAnnual:3060.96,scenarioYear:2026,requestId}},{type:'start-step'},{type:'text-start',id:'text-1'},{type:'text-delta',id:'text-1',delta:raw}];
 if(complete)chunks.push({type:'text-end',id:'text-1'},{type:'finish-step'},{type:'finish',finishReason:'stop'});
 return chunks.map(chunk=>'data: '+JSON.stringify(chunk)+'\n\n').join('')+(complete?'data: [DONE]\n\n':'');
}
try {
 await step('R3F city: real instancing, no videos, dense hero and seamless ticker',async()=>{
  await go('/');await page.waitForSelector('.city-scene canvas[data-rendered=true]');await expect(page.locator('.city-stat strong').first()).toContainText('3.06');await page.waitForTimeout(1300);
  await expect(page.locator('video')).toHaveCount(0);await expect(page.locator('.ticker-stream')).toHaveCount(2);
  const city=await page.evaluate(()=>({instances:Number(document.querySelector('.city-scene canvas').dataset.instances),calls:document.querySelector('.city-scene canvas').dataset.drawCalls,tickerHeight:getComputedStyle(document.querySelector('.hero-ticker')).height,duration:getComputedStyle(document.querySelector('.ticker-track')).animationDuration,overflow:document.documentElement.scrollWidth>innerWidth}));
  assert.ok(city.instances>=20000);assert.equal(city.tickerHeight,'40px');assert.equal(city.duration,'20s');assert.equal(city.overflow,false);
  await page.locator('.city-stat .glass-surface').first().hover();assert.ok(await page.locator('.city-stat .glass-surface').first().evaluate(e=>e.style.getPropertyValue('--mouse-x').endsWith('px')));await screenshot('01-hero.png');return city;
 });
 await step('real WebGL loss gracefully switches to static city, then restores',async()=>{
  await page.evaluate(()=>{const c=document.querySelector('.city-scene canvas');const gl=c.getContext('webgl2');window.__lossExtension=gl.getExtension('WEBGL_lose_context');window.__lossExtension.loseContext();});
  await expect(page.locator('.city-scene')).toHaveAttribute('data-mode','lost');await screenshot('02-webgl-fallback.png');
  await page.evaluate(()=>window.__lossExtension.restoreContext());await expect(page.locator('.city-scene')).toHaveAttribute('data-mode','live');await page.waitForSelector('.city-scene canvas[data-rendered=true]');
 });
 await step('3D carousel: keyboard focus, theme and spring positions',async()=>{
  await page.locator('#identities').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await page.getByRole('button',{name:'选择身份：学生',exact:true}).focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('html')).toHaveAttribute('data-identity','business');
  await expect(page.getByRole('button',{name:'选择身份：企业主',exact:true})).toBeFocused();
  await page.waitForTimeout(1000); await page.locator('#identities').screenshot({path:path.join(out,'03-carousel.png')});
  const state=await page.evaluate(()=>({accent:document.documentElement.style.getPropertyValue('--theme-accent'),perspective:getComputedStyle(document.querySelector('.identity-stage')).perspective,selectedBlur:getComputedStyle(document.querySelector('.identity-card.selected')).filter}));
  assert.equal(state.accent,'#E2C16F'); assert.equal(state.perspective,'1200px'); return state;
 });
 await step('reduced motion removes pin and pauses every video',async()=>{
  await page.getByRole('button',{name:'减弱动效',exact:true}).click(); await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
  await page.waitForTimeout(100); assert.equal(await page.locator('.pin-spacer').count(),0);
  assert.equal(await page.locator('video').evaluateAll(videos=>videos.every(video=>video.paused)),true);
  await page.getByRole('button',{name:'动效已减弱',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','false');
 });
 await step('simulator uses Worker results after keyboard slider edits',async()=>{
  await go('/simulator'); await expect(page.locator('.annual-readout strong')).not.toHaveText('');
  await expect(page.locator('.emission-charts canvas')).toHaveCount(2);
  const slider=page.locator('#electricity');await slider.focus();await slider.press('Home');
  await expect(page.locator('.annual-readout strong')).toHaveText('1.81');
  await slider.press('End'); await expect(page.locator('.annual-readout strong')).toHaveText('8.78');
  await expect(page.locator('.emission-charts')).toHaveAttribute('aria-busy','false');
  await page.waitForTimeout(700); await screenshot('04-simulator.png');
 });
 if(process.env.RUN_LIVE_AI==='1') {
  await step('real DeepSeek JSON highlights chart and restores slider ownership',async()=>{
   await ask('请在图表中高亮购入电力，并依据当前活动量简短解释它的年度计算边界。');
   await expect(page.locator('#electricity')).toBeDisabled();
   await expect(page.locator('.chat-message.assistant p').first()).not.toBeEmpty({timeout:90000});
   if(await page.getByRole('button',{name:'停止生成'}).count()) await screenshot('05a-real-streaming.png');
   await expect(page.locator('.emission-charts')).toHaveAttribute('data-highlight','energy',{timeout:90000});
   await expect(page.locator('[data-ai-highlight=energy]').first()).toBeVisible();
   await expect(page.locator('#electricity')).toBeEnabled(); await page.waitForTimeout(1000);
   await screenshot('05-real-ai-chart.png');
   assert.equal(await page.locator('.chat-message.assistant').count(),1);
  });
  await step('real DeepSeek JSON focuses the Three.js model',async()=>{
   await ask('现在请聚焦牛肉供应链教学模型的牛肉节点（beefTendon），并用一句话说明食物足迹。');
   await page.locator('.model-observatory').scrollIntoViewIfNeeded();
   await expect(page.locator('.carbon-model')).toHaveAttribute('data-focus','beefTendon',{timeout:90000});
   await page.locator('.model-observatory').scrollIntoViewIfNeeded();await page.waitForTimeout(1600);
   await screenshot('06-real-ai-model.png');
  });
 }
 await closeChat();
 await step('report exports a real PDF with chart images and frozen inputs',async()=>{
  await page.getByRole('button',{name:'生成个人碳排白皮书'}).scrollIntoViewIfNeeded();
  const downloadPromise=page.waitForEvent('download',{timeout:45000});
  await page.getByRole('button',{name:'生成个人碳排白皮书'}).click();
  const download=await downloadPromise;await download.saveAs(path.join(out,'CarbonTwin-report.pdf'));
  assert.ok(fs.statSync(path.join(out,'CarbonTwin-report.pdf')).size>10000);
 });
 await step('read/explore/quiz persists a permanent record across reload',async()=>{
  await go('/learn');
  const card=page.locator('.academic-card').first();const collapsed=(await card.boundingBox()).height;await card.hover();await page.waitForTimeout(600);assert.ok((await card.boundingBox()).height>=collapsed);
  await page.getByRole('button',{name:'阅读文献：Draw the line.'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'聚焦牛肉模型节点 ↗'}).click();
  await page.getByRole('button',{name:/B \/ Scope 2/}).click();await page.getByRole('button',{name:'提交答案并保留记录'}).click();
  await expect(page.getByRole('button',{name:'已存入学习档案'})).toBeVisible();
  await screenshot('07-learning-quiz.png');await page.getByRole('button',{name:'关闭随堂测验'}).click(); await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('.learning-lab .section-topline')).toContainText('答题快照 / 1');
 });
 if(process.env.FAULT_TESTS==='1'){
  await go('/simulator');await expect(page.locator('#electricity')).toBeEnabled();
  await step('HTML 500 failure returns control without a white screen',async()=>{
   await page.route('**/api/chat',route=>route.fulfill({status:500,contentType:'text/html',body:'<html>Internal Server Error</html>'}));
   await ask('网络故障测试');await expect(page.locator('.chat-error')).toBeVisible();await expect(page.locator('#electricity')).toBeEnabled();
   await closeChat();await page.unroute('**/api/chat');
  });
  await step('truncated JSON preserves speech and executes no action',async()=>{
   await page.route('**/api/chat',route=>route.fulfill({status:200,headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'},body:streamBody(route.request().postDataJSON().requestId,'{"speech":"已收到的文字应该保留","action":{"type":"CHANGE_THEME","target":"danger"',false)}));
   await ask('截断回复测试');await expect(page.locator('.chat-message.assistant p').first()).toContainText('已收到的文字应该保留');
   await expect(page.locator('#electricity')).toBeEnabled();await expect(page.locator('html')).toHaveAttribute('data-danger','false');
   await screenshot('08-fault-recovery.png');await closeChat();await page.unroute('**/api/chat');
  });
  await step('invalid actions are rejected while valid speech remains readable',async()=>{
   await page.route('**/api/chat',route=>route.fulfill({status:200,headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'},body:streamBody(route.request().postDataJSON().requestId,JSON.stringify({speech:'文字可读，非法指令不能执行',action:{type:'DELETE_DATABASE'},question:'继续学习吗？'}))}));
   await ask('非法动作测试');await expect(page.locator('.chat-error')).toContainText('阻止执行动作');
   await expect(page.locator('.chat-message.assistant p').first()).toContainText('文字可读');await expect(page.locator('#electricity')).toBeEnabled();await closeChat();await page.unroute('**/api/chat');
  });
  await step('cancelling an in-flight request prevents a delayed theme action',async()=>{
   let release;const gate=new Promise(resolve=>{release=resolve;});
   await page.route('**/api/chat',async route=>{await gate;try{await route.fulfill({status:200,headers:{'content-type':'text/event-stream','x-vercel-ai-ui-message-stream':'v1'},body:streamBody(route.request().postDataJSON().requestId,JSON.stringify({speech:'这条迟到回复不能修改界面',action:{type:'CHANGE_THEME',target:'danger'}}))});}catch{}});
   await ask('取消操作测试');await expect(page.locator('#electricity')).toBeDisabled();await page.getByRole('button',{name:'停止生成'}).click();
   await expect(page.locator('#electricity')).toBeEnabled();release();await page.waitForTimeout(700);await expect(page.locator('html')).toHaveAttribute('data-danger','false');
   await closeChat();await page.unroute('**/api/chat');
  });
 }
 await step('mobile width and system reduced-motion preference remain usable',async()=>{
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  mobile.on('pageerror',e=>errors.push('mobile: '+e.message));await mobile.goto(base,{waitUntil:'domcontentloaded'});await mobile.evaluate(()=>document.fonts.ready);await mobile.waitForTimeout(500);
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await expect(mobile.locator('html')).toHaveAttribute('data-reduced-motion','true');
  assert.equal(await mobile.locator('.pin-spacer').count(),0);await expect(mobile.locator('html')).toHaveAttribute('data-motion-ready','true');await mobile.getByRole('button',{name:'打开碳知识 AI 教练'}).click();await expect(mobile.getByRole('textbox',{name:'向碳知识教练提问'})).toBeVisible();await mobile.getByRole('button',{name:'关闭 AI 聊天窗'}).click();await expect(mobile.locator('#ai-chat-panel')).toHaveCount(0);await mobile.screenshot({path:path.join(out,'09-mobile.png'),fullPage:true});await mobile.close();
 });
 assert.deepEqual(errors,[]);
} catch(error) { console.error(error.message);process.exitCode=1;await screenshot('failure.png').catch(()=>{}); }
finally { fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({base,results,pageErrors:errors,aiEvidence:apiEvidence},null,2));await browser.close(); }
