// Real browser rendering, interaction, context restoration and isolated retry.
const {chromium,firefox,webkit,expect:baseExpect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const expect=baseExpect.configure({timeout:60000}),engine=process.env.CT_BROWSER||'chromium';
const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3097';
const out=process.env.CT_EVIDENCE_DIR||`D:/CarbonTwin_Workspace/Test_Evidence/v13-city-runtime-${engine}`;
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={base,engine,started:new Date().toISOString(),checks:[],errors:[],http:[],passed:false};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless: true, ...require('./browser-runtime.cjs').launchOptions(),...engine==='chromium'?{channel:'chrome'}:{}});
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',recordVideo:{dir:out,size:{width:1440,height:900}}});
 await context.route('**/api/**',r=>r.abort());
 await context.addInitScript(()=>{window.__ctContexts=0;const seen=new WeakSet(),original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const gl=original.apply(this,args);if(gl&&/^webgl/.test(args[0])&&!seen.has(gl)){seen.add(gl);window.__ctContexts++;}return gl;};});
 let page=await context.newPage(),expectedFailure=false;
 const listen=p=>{p.setDefaultTimeout(60000);p.on('pageerror',e=>report.errors.push({expected:expectedFailure,message:e.message}));p.on('response',r=>{if(r.status()>=400)report.http.push({expected:expectedFailure,status:r.status(),url:r.url()});});};listen(page);
 const check=(name,data)=>{report.checks.push({name,data});console.log('PASS '+name);};
 const read=stage=>stage.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return{data:{...c.dataset},contexts:window.__ctContexts,renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),version:gl.getParameter(gl.VERSION),lost:gl.isContextLost(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight]};});
 const ready=async stage=>{await expect(stage).toHaveAttribute('data-ready','true');await expect(stage).toHaveAttribute('data-load-state','rendered');await expect.poll(async()=>Number((await read(stage)).data.sceneTriangles)).toBeGreaterThan(0);const data=await read(stage);assert.equal(data.lost,false);assert(Number(data.data.sceneTriangles)>0);assert(data.buffer.every(n=>n>0));return data;};
 const restore=async(stage,label)=>{
  const before=await read(stage);await stage.locator('canvas').evaluate(c=>{window.__ctSameCanvas=c;const gl=c.getContext('webgl2');window.__ctLoss=gl.getExtension('WEBGL_lose_context');if(!window.__ctLoss)throw Error('WEBGL_lose_context unavailable');window.__ctLoss.loseContext();});
  await expect(stage).toHaveAttribute('data-load-state','context-lost');
  await page.evaluate(()=>window.__ctLoss.restoreContext());const after=await ready(stage);
  assert.equal(after.contexts,before.contexts);assert(await stage.locator('canvas').evaluate(c=>c===window.__ctSameCanvas));check(label+'-same-renderer-context-restoration',after);
 };
 try{
  await page.goto(base+'/citylight',{waitUntil:'domcontentloaded'});let stage=page.locator('.citylight-viewport');check('citylight-real-model',await ready(stage));
  await page.getByRole('button',{name:'背面 45°',exact:true}).click();await ready(stage);const before=await read(stage);
  const box=await stage.locator('canvas').boundingBox();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.6);await page.mouse.down();await page.mouse.move(box.x+box.width*.45,box.y+box.height*.6,{steps:10});await page.mouse.up();await page.waitForTimeout(400);
  assert.notEqual((await read(stage)).data.camera,before.data.camera);check('citylight-pointer-orbit');
  await page.getByRole('button',{name:'夜景',exact:true}).click();await expect(stage).toHaveAttribute('data-world-time','1.000');await stage.screenshot({path:path.join(out,'citylight-night.png')});
  await restore(stage,'citylight');await stage.screenshot({path:path.join(out,'citylight-restored.png')});
  await page.goto(base+'/city-studies',{waitUntil:'domcontentloaded'});stage=page.locator('.city-studies-viewport');check('studies-three-buildings-real-model',await ready(stage));
  for(const id of ['B01','B02','B03']){await page.getByRole('button',{name:new RegExp('^'+id+' ')}).click();await ready(stage);await expect(stage).toHaveAttribute('data-selected',id);check('studies-select-'+id);}
  await page.getByRole('button',{name:'街区全景',exact:true}).click();await ready(stage);await restore(stage,'studies');await stage.screenshot({path:path.join(out,'studies-restored.png')});
  await page.setViewportSize({width:390,height:844});await ready(stage);assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));await page.screenshot({path:path.join(out,'studies-mobile.png')});check('studies-mobile');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);
  await page.close();page=await context.newPage();listen(page);expectedFailure=true;const requests=new Map(),completed=new Set();let block=true;
  page.on('request',r=>{const key=new URL(r.url()).pathname;if(key.endsWith('.glb'))requests.set(key,(requests.get(key)||0)+1);});
  page.on('requestfinished',r=>{const key=new URL(r.url()).pathname;if(key.endsWith('.glb')&&!key.includes('b02-spiral'))completed.add(key);});
  await page.route('**/models/city-studies/b02-spiral*.glb',r=>block?r.fulfill({status:503,body:'Injected isolated GLB failure'}):r.continue());
  await page.goto(base+'/city-studies',{waitUntil:'domcontentloaded'});stage=page.locator('.city-studies-viewport');await expect(stage).toHaveAttribute('data-load-state','error');assert.equal(await stage.getAttribute('data-ready'),'false');
  await expect.poll(()=>completed.size).toBe(8);await page.waitForTimeout(500);
  const successful=[...requests].filter(([key])=>completed.has(key));assert(successful.length>0);check('failed-model-never-marked-rendered',{requests:[...requests],completed:[...completed]});
  block=false;await page.getByRole('button',{name:'重新加载三维视图',exact:true}).click();await ready(stage);
  for(const [key,count]of successful)assert.equal(requests.get(key),count,'Successful cache must survive retry: '+key);
  check('isolated-retry-preserves-successful-model-caches',{requests:[...requests]});await stage.screenshot({path:path.join(out,'studies-retry.png')});
  report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,checks:report.checks.length,failure:report.failure,errors:report.errors,http:report.http}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
