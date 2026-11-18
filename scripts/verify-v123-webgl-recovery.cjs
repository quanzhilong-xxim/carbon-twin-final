const {chromium,firefox,webkit,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.CT_BROWSER||'webkit',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3071';
const out=process.env.CT_EVIDENCE_DIR||path.resolve(`outputs/v123/recovery-${engine}`);
(async()=>{
 await fs.mkdir(out,{recursive:true});const report={at:new Date().toISOString(),base,engine,checks:[],errors:[],http:[],passed:false};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{},...engine==='firefox'&&process.env.CT_FIREFOX_EXECUTABLE?{executablePath:process.env.CT_FIREFOX_EXECUTABLE}:{}});
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',recordVideo:{dir:out,size:{width:1280,height:900}}});
 await context.route('**/api/**',r=>r.abort());
 await context.addInitScript(()=>{
  window.__ctContexts=0;const seen=new WeakSet(),original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(...args){const result=original.apply(this,args);if(result&&/^webgl/.test(args[0])&&!seen.has(result)){seen.add(result);window.__ctContexts++;}return result;};
 });
 const page=await context.newPage();page.setDefaultTimeout(45000);page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({path:new URL(r.url()).pathname,status:r.status()});});
 const check=(name,data)=>report.checks.push({name,data});
 const canvas=page.locator('.energy-core canvas');
 const settle=async()=>{await expect(canvas).toHaveAttribute('data-particle-scene','carbon-living-forms',{timeout:60000});await page.waitForFunction(()=>Number(document.querySelector('.energy-core canvas')?.dataset.particleCount)>0);};
 const read=()=>canvas.evaluate(c=>{const gl=c.getContext('webgl2'),viewport=gl.getParameter(gl.VIEWPORT),box=c.getBoundingClientRect();return{data:{...c.dataset},width:c.width,height:c.height,buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],viewport:Array.from(viewport),css:[box.width,box.height],contextLost:gl.isContextLost(),contexts:window.__ctContexts};});
 const valid=s=>{assert.equal(s.contextLost,false);assert(s.buffer[0]>0&&s.buffer[1]>0);assert(s.viewport[2]<=s.buffer[0]+1&&s.viewport[3]<=s.buffer[1]+1,'Viewport must fit the actual GPU buffer');assert(Math.abs(s.buffer[0]/s.buffer[1]-s.css[0]/s.css[1])<.03,'Buffer aspect follows CSS');};
 try{
  await page.goto(base+'/simulator#activity-lab',{waitUntil:'domcontentloaded',timeout:90000});await page.locator('.carbon-particle-stage').scrollIntoViewIfNeeded();await settle();let s=await read();valid(s);check('real-buffer-initial',s);await page.locator('.carbon-particle-stage').screenshot({path:path.join(out,'01-tree.png')});
  await page.locator('.particle-controls').getByRole('button',{name:'城市',exact:true}).click();await expect(canvas).toHaveAttribute('data-particle-shape','city');check('demand-mode-shape-updates',await read());
  const contexts=s.contexts;
  for(const width of [1240,1200,1160,1120,1080,1040])await page.setViewportSize({width,height:900});
  await page.waitForTimeout(650);await page.locator('.carbon-particle-stage').scrollIntoViewIfNeeded();await settle();s=await read();valid(s);check('resize-burst-no-context-loss',{...s,createdSinceStart:s.contexts-contexts});await page.locator('.carbon-particle-stage').screenshot({path:path.join(out,'02-after-resize.png')});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(650);await page.locator('.carbon-particle-stage').scrollIntoViewIfNeeded();await settle();s=await read();valid(s);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);check('mobile-buffer-and-overflow',s);await page.locator('.carbon-particle-stage').screenshot({path:path.join(out,'03-mobile.png')});
  const loss=await canvas.evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;window.__ctLoseExtension=ext;ext.loseContext();return true;});
  if(loss){await expect(page.locator('.energy-core .scene-stage')).toHaveAttribute('data-mode','context-lost');await page.evaluate(()=>window.__ctLoseExtension.restoreContext());await expect(page.locator('.energy-core .scene-stage')).toHaveAttribute('data-mode','3d');await settle();s=await read();valid(s);check('actual-context-loss-restored',s);}else check('context-loss-extension-unavailable',true);
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.carbon-particle-stage').scrollIntoViewIfNeeded();await settle();s=await read();valid(s);check('refresh-restores-real-webgl',s);
  await page.setViewportSize({width:1280,height:900});await page.locator('#two-lives .story-wide-scene').scrollIntoViewIfNeeded();await expect(page.locator('#two-lives canvas')).toHaveAttribute('data-building-view','both',{timeout:60000});
  await page.locator('#two-lives').getByRole('button',{name:'A / 走近住宅',exact:true}).click();await expect(page.locator('#two-lives canvas')).toHaveAttribute('data-building-view','home');await page.locator('#two-lives .story-wide-scene').screenshot({path:path.join(out,'04-home-office.png')});check('actual-building-camera-control',await page.locator('#two-lives canvas').evaluate(c=>({...c.dataset})));
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}finally{report.finished=new Date().toISOString();report.version=browser.version();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1;});
