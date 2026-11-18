// Verify the homepage's licensed transition video is lazy, controllable and page-aware.
const {chromium,expect:baseExpect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const expect=baseExpect.configure({timeout:30000});
const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3099';
const out=process.env.CT_EVIDENCE_DIR||'D:/CarbonTwin_Workspace/Test_Evidence/v13-handoff-video-chrome';
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={base,checks:[],errors:[],videoRequests:[],passed:false};
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 await context.route('**/api/**',r=>r.abort());const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/\.mp4(?:\?|$)/i.test(r.url()))report.videoRequests.push(new URL(r.url()).pathname);});
 const check=name=>{report.checks.push(name);console.log('PASS '+name);};
 try{
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});const root=page.locator('.explore-evidence-visual'),video=root.locator('video');await expect(root).toHaveAttribute('data-media-state','offscreen');await expect(video).toHaveAttribute('preload','none');
  assert.deepEqual(report.videoRequests,[],'Offscreen transition media must not request video data');check('offscreen-video-not-requested');
  await root.scrollIntoViewIfNeeded();await expect(root).toHaveAttribute('data-media-state','playing');await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);await expect.poll(()=>report.videoRequests.length).toBeGreaterThan(0);await root.screenshot({path:path.join(out,'handoff-video-playing.png')});check('visible-video-loads-and-plays');
  await root.getByRole('button',{name:'暂停档案过渡背景'}).click();await expect(root).toHaveAttribute('data-media-state','paused');assert.equal(await video.evaluate(v=>v.paused),true);check('manual-pause');
  await root.getByRole('button',{name:'播放档案过渡背景'}).click();await expect(root).toHaveAttribute('data-media-state','playing');await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);check('manual-resume');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(root).toHaveAttribute('data-media-state','page-hidden');await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);check('hidden-page-pauses-video');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await expect(root).toHaveAttribute('data-media-state','playing');await expect.poll(()=>video.evaluate(v=>!v.paused)).toBe(true);check('visible-page-resumes-video');
  await page.evaluate(()=>window.scrollTo(0,0));await expect(root).toHaveAttribute('data-media-state','offscreen');await expect.poll(()=>video.evaluate(v=>v.paused)).toBe(true);check('offscreen-video-pauses');
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});}
 finally{report.version=browser.version();report.finished=new Date().toISOString();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1;});
