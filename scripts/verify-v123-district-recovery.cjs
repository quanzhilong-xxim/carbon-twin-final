// Exercise actual GPU loss and resource recreation in the changed city scene.
const {chromium,firefox,webkit,expect:baseExpect}=require('@playwright/test');
const expect=baseExpect.configure({timeout:60000}),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.CT_BROWSER||'chromium',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3084';
const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v123/district-recovery');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const report={engine,base,at:new Date().toISOString(),checks:[],errors:[],http:[],passed:false};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{},...engine==='firefox'&&process.env.CT_FIREFOX_EXECUTABLE?{executablePath:process.env.CT_FIREFOX_EXECUTABLE}:{}});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.route('**/api/**',r=>r.abort());const page=await context.newPage();page.setDefaultTimeout(60000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 const check=(name,data)=>report.checks.push({name,data});
 try{
  await page.goto(base+'/simulator#digital-room',{waitUntil:'domcontentloaded'});
  const city=page.locator('#digital-room'),surface=city.locator('.twin-canvas'),canvas=surface.locator('canvas');
  await city.locator('.twin-stage-wrap').scrollIntoViewIfNeeded();await expect(surface).toHaveAttribute('data-experience','orbit');
  await expect(canvas).toHaveAttribute('data-district-reflection','live-cube-128');
  const before=await surface.getAttribute('data-canvas-id');
  const supported=await canvas.evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});
  assert(supported,'Browser must expose actual GPU loss for this test; absence is not a pass');
  await expect(surface).toHaveAttribute('data-context','lost');await expect(surface).toHaveAttribute('data-experience','fallback');
  await expect(surface.getByRole('button',{name:'尝试恢复 3D ↗',exact:true})).toBeVisible();
  check('actual-loss-enters-explicit-fallback',{before,lostAt:await surface.getAttribute('data-context-lost-at')});
  await surface.screenshot({path:path.join(out,'01-gpu-fallback.png')});
  await surface.getByRole('button',{name:'尝试恢复 3D ↗',exact:true}).click();await expect(surface).toHaveAttribute('data-experience','orbit');
  await expect(canvas).toHaveAttribute('data-district-reflection','live-cube-128');
  assert.notEqual(await surface.getAttribute('data-canvas-id'),before);
  assert.equal(await canvas.evaluate(c=>c.getContext('webgl2').isContextLost()),false);
  check('retry-creates-renderer-and-reflection-resources',{after:await surface.getAttribute('data-canvas-id'),data:await canvas.evaluate(c=>({...c.dataset}))});
  await city.getByRole('button',{name:'夜晚',exact:true}).click();await expect(canvas).toHaveAttribute('data-story-time','night');
  await expect.poll(()=>canvas.getAttribute('data-reflection-captures')).not.toBe('1');
  await city.locator('.twin-stage-wrap').screenshot({path:path.join(out,'02-restored-night.png')});check('new-probe-updates-with-light-change',true);
  await city.getByRole('button',{name:/01 聚焦示范大楼/}).click();
  await expect(city.getByRole('button',{name:/进入室内/})).toBeEnabled();await city.getByRole('button',{name:/进入室内/}).click();
  await expect(surface).toHaveAttribute('data-experience','room');await expect(surface).toHaveAttribute('data-room-ready','true');
  await city.getByRole('button',{name:'返回城市',exact:true}).click();await expect(surface).toHaveAttribute('data-experience','orbit');await expect(canvas).toHaveAttribute('data-district-reflection','live-cube-128');
  check('interior-return-recreates-city-resources',true);
  await page.reload({waitUntil:'domcontentloaded'});await city.locator('.twin-stage-wrap').scrollIntoViewIfNeeded();await expect(surface).toHaveAttribute('data-experience','orbit');await expect(canvas).toHaveAttribute('data-district-reflection','live-cube-128');check('refresh-recovers-city',true);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(error){report.failure=error.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(error=>{console.error(error);process.exitCode=1;});
