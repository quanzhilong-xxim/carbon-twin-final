// Actual GPU frames, repeated wardrobe selection, resource retry, and scene re-entry.
const {chromium,firefox,webkit,expect:baseExpect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const expect=baseExpect.configure({timeout:60000});
const engine=process.env.CT_BROWSER||'chromium';
const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3098';
const out=process.env.CT_EVIDENCE_DIR||'D:/CarbonTwin_Workspace/Test_Evidence/v13-r3-exhibits-chrome';
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={base,checks:[],errors:[],http:[],passed:false};
 const browser=await ({chromium,firefox,webkit}[engine]).launch({headless: true, ...require('./browser-runtime.cjs').launchOptions(),...engine==='chromium'?{channel:'chrome'}:{}});report.engine=engine;
 const ctx=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',recordVideo:{dir:out,size:{width:1440,height:900}}});
 await ctx.route('**/api/**',r=>r.abort());const page=await ctx.newPage();page.setDefaultTimeout(60000);
 let injected=false;page.on('pageerror',e=>report.errors.push({expected:injected,message:e.message}));page.on('response',r=>{if(r.status()>=400)report.http.push({expected:injected,status:r.status(),path:new URL(r.url()).pathname});});
 const check=(name,data)=>{report.checks.push({name,data});console.log('PASS '+name);};
 const frame=async stage=>{await stage.scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-load-state','rendered');await expect.poll(async()=>Number(await stage.locator('canvas').first().getAttribute('data-scene-triangles'))).toBeGreaterThan(0);const state=await stage.locator('canvas').first().evaluate(c=>{const gl=c.getContext('webgl2');return{...c.dataset,lost:gl.isContextLost(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};});assert(!state.lost);assert(Number(state.sceneTriangles)>0);assert(state.buffer.every(n=>n>0));return state;};
 const restore=async(stage,label)=>{await stage.locator('canvas').evaluate(c=>{window.__ctCanvas=c;const gl=c.getContext('webgl2');window.__ctRestore=gl.getExtension('WEBGL_lose_context');if(!window.__ctRestore)throw Error('No context loss extension');window.__ctRestore.loseContext();});await expect(stage).toHaveAttribute('data-load-state','context-lost');await page.evaluate(()=>window.__ctRestore.restoreContext());await frame(stage);assert(await stage.locator('canvas').evaluate(c=>c===window.__ctCanvas));check(label+'-same-canvas-restoration');};
 try{
  await page.goto(base+'/workspace',{waitUntil:'domcontentloaded'});let stage=page.locator('.clothing-gallery');await frame(stage);check('wardrobe-first-real-GLB');
  for(const index of [1,2,3,4,5,0]){await page.locator('.clothing-gallery-nav button').nth(index).click();check('wardrobe-item-'+index,await frame(stage));assert.equal(await stage.locator('canvas').count(),1);}
  await stage.getByRole('button',{name:'六件全览',exact:true}).click();check('wardrobe-six-real-models',await frame(stage));await stage.screenshot({path:path.join(out,'wardrobe-collection.png')});
  await page.locator('.clothing-gallery-nav button').nth(5).click();check('collection-to-single',await frame(stage));
  for(const name of ['侧面','背面','正面']){await stage.getByRole('button',{name,exact:true}).click();await frame(stage);await stage.screenshot({path:path.join(out,'wardrobe-'+name+'.png')});}check('wardrobe-camera-views');
  await restore(stage,'wardrobe');
  await page.goto(base+'/learn',{waitUntil:'domcontentloaded'});stage=page.locator('.library-hero-world .scene-stage');check('library-real-frame',await frame(stage));await stage.screenshot({path:path.join(out,'library.png')});
  await restore(stage,'library');await page.getByRole('button',{name:/寻找第一条证据/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'关闭文献',exact:true}).click();check('library-opens-primary-source');
  await page.locator('#archive').scrollIntoViewIfNeeded();await stage.scrollIntoViewIfNeeded();check('library-reentry',await frame(stage));
  await page.goto(base+'/simulator#sakura-meeting',{waitUntil:'domcontentloaded'});stage=page.locator('#sakura-meeting .sakura-scene');check('sakura-real-models-and-textures',await frame(stage));await stage.screenshot({path:path.join(out,'sakura.png')});await restore(stage,'sakura');
  await page.setViewportSize({width:390,height:844});await frame(stage);assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));await stage.screenshot({path:path.join(out,'sakura-mobile.png')});check('sakura-mobile');
  await page.goto(base+'/workspace',{waitUntil:'domcontentloaded'});stage=page.locator('.clothing-gallery');check('wardrobe-return-from-other-page',await frame(stage));assert.equal(await stage.locator('canvas').count(),1);
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});report.canvases=await page.locator('canvas').evaluateAll(cs=>cs.map(c=>({...c.dataset}))).catch(()=>[]);}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await ctx.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,...report}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
