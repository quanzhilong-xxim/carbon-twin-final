// Local V12 lifecycle regression. No API traffic; allocator counters are not VRAM measurements.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const out=process.env.CITYLIGHT_OUTPUT;if(!out)throw Error('CITYLIGHT_OUTPUT required');fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),scope:'six LOD/environment cycles, six independent pause/recovery cycles and real soft navigation per browser',paidCalls:0,limits:'Renderer resource counts and retired-context loss only; context references retained by test instrumentation. Not VRAM/heap measurement or a real-device soak test. Windows WebKit intentionally recreates Canvas when resolution changes.',browsers:{}};
report.snapshot=Object.fromEntries(['components/3d/CitylightV12Studio.tsx','app/citylight/studio/studio.css','public/models/citylight/v12/manifest.json','browser-tests/citylight-v12-lifecycle.cjs'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
(async()=>{for(const name of (process.env.V12_BROWSERS||'chromium,firefox,webkit').split(',')){
 const row=report.browsers[name]={checks:[],cycles:[],blocked:[],errors:[]};let browser;
 const check=async(label,fn)=>{try{await fn();row.checks.push({label,status:'PASS'});}catch(e){row.checks.push({label,status:'FAIL',error:e.message.slice(0,1500)});}};
 try{
  browser=await {chromium,firefox,webkit}[name].launch({headless:true,args:name==='chromium'?['--use-angle=d3d11','--enable-gpu']:undefined});
  const context=await browser.newContext({viewport:{width:1440,height:1100},serviceWorkers:'block'});
  await context.route('**/*',r=>{const q=r.request(),u=new URL(q.url());if(u.protocol==='blob:'&&u.origin==='http://127.0.0.1:3020'&&q.method()==='GET')return r.continue();if(u.origin!=='http://127.0.0.1:3020'||!['GET','HEAD'].includes(q.method())||u.pathname.startsWith('/api/')){row.blocked.push({path:u.pathname,method:q.method()});return r.abort();}return r.continue();});
  if(context.routeWebSocket)await context.routeWebSocket('**/*',ws=>ws.close());
  await context.addInitScript(()=>{window.__v12Contexts=[];const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){const result=original.call(this,kind,...args);if((kind==='webgl2'||kind==='webgl')&&result&&!window.__v12Contexts.includes(result))window.__v12Contexts.push(result);return result;};});
  const page=await context.newPage();page.on('pageerror',e=>row.errors.push(e.message));row.navigationEvents=[];page.on('response',r=>{const u=new URL(r.url());if(['/citylight','/citylight/lab','/citylight/studio'].includes(u.pathname))row.navigationEvents.push({at:new Date().toISOString(),path:u.pathname,status:r.status()});});
  const stage=page.locator('.citylight-viewport'),controls=page.locator('.citylight-controls'),canvas=()=>stage.locator('canvas');
  const stable=async()=>{await expect(stage).toHaveAttribute('data-ready','true',{timeout:90000});await expect(canvas()).toHaveAttribute('data-stable','true',{timeout:45000});};
  await page.goto('http://127.0.0.1:3020/citylight/studio',{waitUntil:'domcontentloaded',timeout:120000});await stage.scrollIntoViewIfNeeded();await stable();
  await check('six LOD and environment cycles before explicit pause',async()=>{
   for(let i=0;i<6;i++){
    await controls.getByLabel('世界时间').fill(i%2?'0.35':'0.65');
    await controls.getByRole('button',{name:/^[AB] · /}).click();
    await controls.getByRole('button',{name:'LOD / 低分辨率',exact:true}).click();await stable();
    await controls.getByRole('button',{name:'恢复标准画质',exact:true}).click();await stable();
    await page.waitForTimeout(2250);
    const data=await canvas().evaluate(el=>({...el.dataset}));expect(Number(data.geometries)).toBeGreaterThan(0);expect(Number(data.textures)).toBeGreaterThan(0);row.cycles.push({cycle:i+1,data});
   }
  });
  await check('no monotonic allocator growth after warmup',async()=>{
   expect(row.cycles.length).toBe(6);const rows=row.cycles.slice(1),geo=rows.map(r=>Number(r.data.geometries)),tex=rows.map(r=>Number(r.data.textures));
   row.allocatorRange={geometry:[Math.min(...geo),Math.max(...geo)],textures:[Math.min(...tex),Math.max(...tex)]};expect(Math.max(...geo)-Math.min(...geo)).toBeLessThanOrEqual(2);expect(Math.max(...tex)-Math.min(...tex)).toBeLessThanOrEqual(2);
  });
  await check('six pause/recovery cycles retire their WebGL contexts',async()=>{
   row.pauseCycles=[];
   for(let i=0;i<6;i++){
    await controls.getByRole('button',{name:'暂停三维渲染',exact:true}).click();expect(await canvas().count()).toBe(0);await page.waitForTimeout(850);
    const paused=await page.evaluate(()=>window.__v12Contexts.map(g=>g.isContextLost()));row.pauseCycles.push({cycle:i+1,pausedContexts:paused});expect(paused.length).toBeGreaterThan(0);expect(paused.every(Boolean)).toBe(true);
    await stage.getByRole('button',{name:'重新加载三维',exact:true}).click();await stable();await page.waitForTimeout(850);
   }
  });
  await check('studio -> V11 -> original -> back twice preserves CSS scope',async()=>{
   await expect(page.locator('.noise-overlay')).toHaveCSS('display','none');await expect(page.locator('.interaction-atmosphere')).toHaveCSS('display','none');await page.evaluate(()=>{window.__citylightV12NavigationMarker='same-document';});
   row.navigationTimings=[];let started=Date.now();await page.getByRole('link',{name:'保留的 V11 工作台 ↗',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3020/citylight/lab',{timeout:30000});row.navigationTimings.push({path:'/citylight/lab',urlChangeMs:Date.now()-started});await stable();
   started=Date.now();await page.getByRole('link',{name:'保留的 V8.1 原版 ↗',exact:true}).click();await expect(page).toHaveURL('http://127.0.0.1:3020/citylight',{timeout:30000});row.navigationTimings.push({path:'/citylight',urlChangeMs:Date.now()-started});await stable();await expect(page.locator('.noise-overlay')).not.toHaveCSS('display','none');await expect(page.locator('.interaction-atmosphere')).not.toHaveCSS('display','none');
   expect(await page.evaluate(()=>window.__citylightV12NavigationMarker)).toBe('same-document');
   await page.goBack({waitUntil:'domcontentloaded'});await stable();await page.goBack({waitUntil:'domcontentloaded'});await stable();await expect(page.locator('.noise-overlay')).toHaveCSS('display','none');await expect(page.locator('.interaction-atmosphere')).toHaveCSS('display','none');await expect(page.locator('.citylight-v12-studio')).toBeVisible();
   await stage.screenshot({path:path.join(out,name+'-returned-studio.png')});
  });
  await check('no unexpected page exceptions',async()=>{expect(row.errors).toEqual([]);});await context.close();
 }catch(e){row.fatal=e.message;}finally{await browser?.close();fs.writeFileSync(path.join(out,'lifecycle.json'),JSON.stringify(report,null,2));}
 }console.log(JSON.stringify(report));if(Object.values(report.browsers).some(r=>r.fatal||r.checks.some(c=>c.status==='FAIL')))process.exitCode=1;
})();
