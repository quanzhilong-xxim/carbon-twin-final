// Reproduce a slow mobile GLB replacement and a pause beyond the former UI timer.
const {chromium,firefox,webkit,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:60000}),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.CT_BROWSER||'webkit',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3085',out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v123/native-lifecycle');
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={engine,base,at:new Date().toISOString(),checks:[],errors:[],http:[],passed:false};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{},...engine==='firefox'&&process.env.CT_FIREFOX_EXECUTABLE?{executablePath:process.env.CT_FIREFOX_EXECUTABLE}:{}}),context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.route('**/api/**',r=>r.abort());
 let delayed=false;
 await context.route('**/CT_City_Explore_v123e-lite.glb',async route=>{delayed=true;await new Promise(resolve=>setTimeout(resolve,8000));await route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 try{
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded'});
  const card=page.locator('.identity-unit[data-character="city"]');await card.scrollIntoViewIfNeeded();await card.locator('.identity-card').click();await expect(card.locator('canvas')).toHaveAttribute('data-asset-version','v123e');
  await card.getByRole('button',{name:'进入角色展厅',exact:true}).click();const room=page.getByRole('dialog'),canvas=room.locator('canvas');await expect(room.locator('.avatar-stage')).toHaveAttribute('data-ready','true');
  await page.setViewportSize({width:375,height:844});await expect.poll(()=>delayed).toBe(true);
  await room.getByRole('button',{name:'挥手致意',exact:true}).click();
  await expect(canvas).toHaveAttribute('data-asset-quality','lite');await expect(room.locator('.avatar-stage')).toHaveAttribute('data-ready','true');await expect(canvas).toHaveAttribute('data-native-clip','Wave');
  report.checks.push('gesture-survives-eight-second-mobile-model-load');
  await room.getByRole('button',{name:'暂停动作',exact:true}).click();const time=Number(await canvas.getAttribute('data-native-clip-time'));await page.waitForTimeout(7200);
  assert.equal(Number(await canvas.getAttribute('data-native-clip-time')),time);await expect(room.getByRole('button',{name:'挥手致意',exact:true})).toHaveAttribute('aria-pressed','true');
  report.checks.push('pause-beyond-old-timeout-retains-clip-and-progress');await room.screenshot({path:path.join(out,'01-paused-mobile.png')});
  await room.getByRole('button',{name:'继续动作',exact:true}).click();await expect.poll(async()=>Number(await canvas.getAttribute('data-native-clip-time'))).toBeGreaterThan(time);
  await expect(canvas).toHaveAttribute('data-native-clip','Idle');await expect(room.getByRole('button',{name:'自然休息',exact:true})).toHaveAttribute('aria-pressed','true');report.checks.push('actual-mixer-completion-returns-to-idle-and-updates-controls');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(error){report.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(error=>{console.error(error);process.exitCode=1;});
