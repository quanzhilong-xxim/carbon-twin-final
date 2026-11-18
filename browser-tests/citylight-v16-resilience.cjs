// Failure paths and preservation checks. This script blocks every /api request.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium,firefox,webkit,expect}=require('@playwright/test');const out=process.env.CITYLIGHT_OUTPUT;
if(!out||fs.existsSync(path.join(out,'resilience.json')))throw Error('Fresh output folder required');fs.mkdirSync(out,{recursive:true});
const base='http://127.0.0.1:3020',report={at:new Date().toISOString(),paidCalls:0,browsers:{},scope:'Non-billing pages; API traffic blocked. No claim of actual TTS/Decart availability.'};
(async()=>{
 for(const name of ['chromium','firefox','webkit']){
  const row=report.browsers[name]={checks:[],blocked:[],expectedErrors:[],errors:[],cycles:[],routes:[]};let b;
  try{
   b=await {chromium,firefox,webkit}[name].launch({headless:true,args:name==='chromium'?['--use-angle=d3d11','--enable-gpu']:undefined});
   const c=await b.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block'});
   let failModel=false,expected=false;
   await c.route('**/*',r=>{const u=new URL(r.request().url());if(failModel&&u.pathname==='/models/citylight/v16-study/r3/crystal.glb')return r.fulfill({status:404,body:'V16 controlled asset-not-found test'});if(u.origin===base&&!u.pathname.startsWith('/api/')&&r.request().method()==='GET')return r.continue();row.blocked.push({path:u.pathname,method:r.request().method()});return r.abort('blockedbyclient')});
   const p=await c.newPage();p.on('pageerror',e=>(expected?row.expectedErrors:row.errors).push(e.message));
   const check=async(label,fn)=>{try{await fn();row.checks.push({label,pass:true})}catch(e){row.checks.push({label,pass:false,error:e.message})}};
   const viewport=p.locator('.citylight-viewport'),cv=viewport.locator('canvas'),controls=p.locator('.citylight-controls');
   const ready=async()=>{await expect(viewport).toHaveAttribute('data-ready','true',{timeout:60000});await viewport.scrollIntoViewIfNeeded();await p.waitForTimeout(600)};
   failModel=true;expected=true;
   await p.goto(base+'/citylight/tower-study',{waitUntil:'domcontentloaded'});
   await check('GLB 404 shows Chinese recovery and no stale canvas',async()=>{await expect(p.getByRole('heading',{name:'模型加载失败，未使用旧画面'})).toBeVisible({timeout:60000});await expect(cv).toHaveCount(0);await p.screenshot({path:path.join(out,name+'-missing-asset.png'),fullPage:true})});
   failModel=false;expected=false;
   await check('Manual retry clears failed GLTF cache and loads real model',async()=>{await p.getByRole('button',{name:'手动恢复三维'}).click();await ready();expect(await cv.getAttribute('data-asset-id')).toBe('CL-T01-V16-CRYSTAL')});
   for(let i=0;i<5;i++){
    await check('Repeated pause/rebuild cycle '+(i+1),async()=>{
     await controls.getByRole('button',{name:'暂停本地三维',exact:true}).click();await expect(cv).toHaveCount(0);
     await p.getByRole('button',{name:'手动恢复三维',exact:true}).click();await ready();
     row.cycles.push(await cv.evaluate(el=>({geometries:Number(el.dataset.geometries),textures:Number(el.dataset.textures),drawCalls:Number(el.dataset.drawCalls),assetId:el.dataset.assetId})));
    });
   }
   await check('GPU resource counters stable across five rebuilds (not OS memory proof)',async()=>{
    for(const k of ['geometries','textures'])expect(Math.max(...row.cycles.map(x=>x[k]))-Math.min(...row.cycles.map(x=>x[k]))).toBeLessThanOrEqual(1);
   });
   await check('Reduced-motion mode retains fixed views',async()=>{
    await p.emulateMedia({reducedMotion:'reduce'});await controls.getByRole('button',{name:'人眼1.6m',exact:true}).click();await p.waitForTimeout(400);expect(Math.abs(Number((await cv.getAttribute('data-camera')).split(',')[1])-1.6)).toBeLessThan(.001);
   });
   await check('Rapid view selection and repeated current selection stay ready',async()=>{
    for(let i=0;i<3;i++){await controls.getByRole('button',{name:'屋顶',exact:true}).click();await controls.getByRole('button',{name:'正面45°',exact:true}).click()}
    for(let i=0;i<3;i++){await controls.getByRole('button',{name:'A · 连续晶体折面',exact:true}).click();await controls.getByRole('button',{name:'中性白模',exact:true}).click()}
    await ready();
   });
   for(const uri of ['/citylight/studio','/citylight/material-lab','/tts-audition','/']){
    await check('Existing route remains visible '+uri,async()=>{
     const response=await p.goto(base+uri,{waitUntil:'domcontentloaded',timeout:60000});expect(response.status()).toBe(200);await expect(p.locator('body')).toBeVisible();row.routes.push({uri,status:response.status(),title:await p.title()});
     if(uri==='/citylight/studio'||uri==='/citylight/material-lab'){await expect(p.locator('.citylight-viewport')).toHaveAttribute('data-ready','true',{timeout:60000});await expect(p.locator('canvas')).toHaveCount(1)}
    });
   }
   await p.goto(base+'/citylight/tower-study',{waitUntil:'domcontentloaded'});await ready();
   await check('Navigate back to new workbench restores actual model',async()=>expect(await cv.getAttribute('data-asset-id')).toBe('CL-T01-V16-CRYSTAL'));
   await check('No unexpected page exceptions',async()=>expect(row.errors).toEqual([]));
   row.status=row.checks.every(x=>x.pass)?'PASS_TECHNICAL_ONLY':'FAILED_CHECK';await c.close();
  }catch(e){row.status='FAILED';row.error=e.stack}
  finally{await b?.close();fs.writeFileSync(path.join(out,'resilience.json'),JSON.stringify(report,null,2))}
 }
 console.log(JSON.stringify(Object.fromEntries(Object.entries(report.browsers).map(([k,r])=>[k,{status:r.status,total:r.checks.length,failed:r.checks.filter(x=>!x.pass),errors:r.errors,error:r.error,cycles:r.cycles}]))));
 if(Object.values(report.browsers).some(r=>r.status!=='PASS_TECHNICAL_ONLY'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});

