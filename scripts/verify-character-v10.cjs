/* Real GLB/morph, camera, pause, dialog and identity checks. All API calls are
 * blocked so this suite cannot spend synthesis or generation credits. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/character-v10-runtime-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:process.env.CT_BROWSER||'chrome',headless:false});
 const ctx=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:out,size:{width:1440,height:1000}}});
 const page=await ctx.newPage(),result={at:new Date().toISOString(),out,base:process.env.CT_PREVIEW_URL||'http://127.0.0.1:3020/',browser:browser.version(),checks:[],errors:[],http:[],apiCalls:[],failed:[],console:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),360000);
 await ctx.route('**/api/**',r=>{result.apiCalls.push(new URL(r.request().url()).pathname);return r.abort();});
 page.on('pageerror',e=>result.errors.push(String(e)));page.on('requestfailed',r=>{if(!/net::ERR_ABORTED/.test(r.failure()?.errorText||''))result.failed.push({url:r.url().replace(/\?.*$/,''),error:r.failure()?.errorText});});
 page.on('console',m=>{if(['error','warning'].includes(m.type()))result.console.push(m.text().slice(0,1000));});
 page.on('response',r=>{if(r.status()>=400)result.http.push({status:r.status(),url:r.url().replace(/\?.*$/,'')})});
 try{
  await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3020/')+'#identities',{waitUntil:'domcontentloaded'});await page.locator('#identities').scrollIntoViewIfNeeded();
  for(const[id,label,greeting,reading]of [['student','学生','挥手','展示相机'],['business','企业主','致意','看数据'],['city','城市管理者','引导','查看平板']]){
   const card=page.locator(`.identity-unit[data-character="${id}"]`);await card.getByRole('button',{name:'选择身份：'+label,exact:true}).click();
   const canvas=card.locator('canvas');await canvas.waitFor({timeout:25000});
   await page.waitForFunction(({id,version})=>document.querySelector(`canvas[data-avatar-identity="${id}"]`)?.dataset.assetVersion===version,{id,version:process.env.CT_CHARACTER_VERSION||'v10'});
   await page.waitForTimeout(700);assert(Number(await canvas.getAttribute('data-morph-meshes'))>=3);
   await card.getByRole('button',{name:'暂停动作',exact:true}).click();
   await card.screenshot({path:path.join(out,id+'-front.png')});
   const at=await canvas.getAttribute('data-character-frame');await page.waitForTimeout(250);assert.equal(await canvas.getAttribute('data-character-frame'),at);
   await card.getByRole('button',{name:'继续动作',exact:true}).click();
   await card.getByRole('button',{name:greeting,exact:true}).click();await page.waitForTimeout(600);await card.screenshot({path:path.join(out,id+'-greeting.png')});
   result.checks.push({name:id+' individual gesture and pause',state:await canvas.evaluate(c=>({...c.dataset}))});
   await card.getByRole('button',{name:reading,exact:true}).click();await page.waitForTimeout(650);await card.screenshot({path:path.join(out,id+'-reading.png')});
   await card.getByRole('button',{name:'进入角色展厅',exact:false}).click();const dialog=page.getByRole('dialog');await dialog.waitFor({state:'visible'});
   await dialog.locator('canvas').waitFor();await page.waitForTimeout(800);
   assert.equal(await card.locator('.identity-card canvas').count(),0,'only the room owns an active character renderer');
   for(const[view,name]of [['front','正面'],['threequarter','45°'],['left','左侧'],['right','右侧'],['back','背面'],['outfit','服装'],['hands','手部'],['prop','道具'],['detail','面部']]){
    await dialog.getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(({id,quality})=>document.querySelector(`.character-room canvas[data-avatar-identity="${id}"]`)?.dataset.assetQuality===quality,{id,quality:view==='detail'?'portrait':'standard'});
    await page.waitForTimeout(400);await dialog.screenshot({path:path.join(out,id+'-room-'+view+'.png')});
   }
   // Hold the visible eyelid pose through the real pause control before
   // screenshot encoding; otherwise a 320ms blink finishes during capture.
   const values=await dialog.evaluate(d=>new Promise(resolve=>{const samples=[],started=performance.now();[...d.querySelectorAll('button')].find(b=>b.textContent==='眨眼').click();const frame=()=>{const value=Number(d.querySelector('canvas')?.dataset.blink);samples.push(value);if(value>.82){[...d.querySelectorAll('button')].find(b=>b.textContent==='暂停动作').click();resolve(samples);}else if(performance.now()-started>5000)resolve(samples);else requestAnimationFrame(frame);};requestAnimationFrame(frame);}));
   assert(Math.max(...values)>.82,'the baked eyelids really close on screen');
   await page.waitForFunction(()=>document.querySelector('.character-room canvas')?.dataset.paused==='true');
   await dialog.screenshot({path:path.join(out,id+'-lids-closed.png')});
   const pausedBlink=Number(await dialog.locator('canvas').getAttribute('data-blink'));
   for(const [name,quality]of [['正面','standard'],['面部','portrait']]){
    await dialog.getByRole('button',{name,exact:true}).click();
    await page.waitForFunction(quality=>{const d=document.querySelector('.character-room canvas')?.dataset;return d?.assetQuality===quality&&d.paused==='true'},quality);
    assert(Math.abs(Number(await dialog.locator('canvas').getAttribute('data-blink'))-pausedBlink)<.003,'paused blink must remain unchanged when switching model tiers');
   }
   result.checks.push({name:id+' paused expression survives standard/portrait swap',blink:pausedBlink});
   await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
   result.checks.push({name:id+' real morph blink, nine camera views and interactive room',blinkRange:[Math.min(...values),Math.max(...values)]});
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   assert(await card.getByRole('button',{name:'进入角色展厅',exact:false}).evaluate(e=>e===document.activeElement));
  }
  await page.reload();await page.locator('#identities').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('.identity-city')?.getAttribute('aria-pressed')==='true');result.checks.push({name:'identity survives reload',passed:true});
  for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  // Run the fresh mobile context after releasing the desktop GPU scene.
  // Keeping both live tests simultaneous renderer pressure, not a mobile visit.
  await page.close();
  const mobile=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await mobile.route('**/api/**',r=>{result.apiCalls.push(new URL(r.request().url()).pathname);return r.abort();});
  const handset=await mobile.newPage();handset.on('pageerror',e=>result.errors.push(String(e)));
  await handset.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3020/')+'#identities',{waitUntil:'domcontentloaded'});await handset.locator('#identities').scrollIntoViewIfNeeded();
  for(const[id,label]of [['student','学生'],['business','企业主'],['city','城市管理者']]){
   const card=handset.locator(`.identity-unit[data-character="${id}"]`);await card.getByRole('button',{name:'选择身份：'+label,exact:true}).click();
   await handset.waitForFunction(id=>document.querySelector(`canvas[data-avatar-identity="${id}"]`)?.dataset.assetQuality==='lite',id,{timeout:45000});
   await card.screenshot({path:path.join(out,id+'-mobile-lite.png')});
   result.checks.push({name:id+' fresh 375px context uses real lite GLB',source:await card.locator('canvas').getAttribute('data-model-source')});
  }
  await handset.locator('.identity-unit[data-character="city"]').getByRole('button',{name:'进入角色展厅',exact:false}).click();await handset.getByRole('dialog').waitFor();
  await handset.waitForFunction(()=>document.querySelector('.character-room canvas')?.dataset.assetQuality==='lite');
  await handset.getByRole('dialog').screenshot({path:path.join(out,'mobile-room.png')});
  assert(await handset.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.close();
  assert.deepEqual(result.errors,[]);assert.deepEqual(result.http,[]);assert.deepEqual(result.apiCalls,[]);assert.deepEqual(result.failed,[]);result.passed=true;
 }catch(e){result.failure=String(e);result.failureState=await page.locator('.avatar-stage').evaluateAll(els=>els.map(e=>({data:{...e.dataset},canvas:{...e.querySelector('canvas')?.dataset}}))).catch(()=>null);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{clearTimeout(timer);await ctx.close();result.video=await page.video()?.path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
