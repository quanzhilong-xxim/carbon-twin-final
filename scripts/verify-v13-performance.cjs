// Short sustained rendering samples, separate from page navigation timings.
const {chromium,firefox,webkit,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.CT_BROWSER||'chromium',base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3099';
const mobile=process.env.CT_MOBILE==='1',out=process.env.CT_EVIDENCE_DIR;
const warmupMs=Number(process.env.CT_WARMUP_MS??500),sampleWindows=Number(process.env.CT_SAMPLE_WINDOWS??5);
assert(Number.isInteger(warmupMs)&&warmupMs>=0&&warmupMs<=60000,'CT_WARMUP_MS must be 0..60000');
assert(Number.isInteger(sampleWindows)&&sampleWindows>0&&sampleWindows<=60,'CT_SAMPLE_WINDOWS must be 1..60');
const scenes=[['/citylight','.citylight-viewport','citylight'],['/city-studies','.city-studies-viewport','buildings'],['/workspace','.clothing-gallery','million-triangle-jeans'],['/simulator#activity-lab','.carbon-particle-stage','particles']];
const requested=process.env.CT_SCENES?.split(',').map(s=>s.trim()).filter(Boolean);
if(requested)assert(requested.every(id=>scenes.some(s=>s[2]===id)),'Unknown CT_SCENES id');
if(!out)throw Error('Set a new CT_EVIDENCE_DIR');
(async()=>{
 await fs.mkdir(out,{recursive:true});try{await fs.access(path.join(out,'result.json'));throw Error('Existing evidence');}catch(e){if(e.code!=='ENOENT')throw e;}
 const report={base,engine,mobile,warmupMs,sampleWindows,started:new Date().toISOString(),samples:[],errors:[],passed:false,limits:'Local short samples of Fiber lifecycle attribute updates per second, not displayed FPS, Lighthouse, WAN, physical mobile, or thermal endurance. Loading/remount/counter-reset windows are transitions and excluded from steady-state statistics.'};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...require('./browser-runtime.cjs').launchOptions(),...engine==='chromium'?{channel:'chrome'}:{}});
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.route('**/api/**',r=>r.abort());const page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>report.errors.push(e.message));
 const state=stage=>stage.evaluate(root=>{
  const c=root.querySelector('canvas');if(!c)return{ready:false,reason:'no-canvas'};
  const runtime=root.hasAttribute('data-load-state')?root:root.querySelector('[data-load-state]');
  const loadState=c.dataset.loadState??runtime?.dataset.loadState,loaded=c.dataset.assetsLoaded,total=c.dataset.assetsTotal;
  const assetsComplete=loaded===undefined&&total===undefined||loaded!==undefined&&total!==undefined&&Number(loaded)===Number(total);
  const gl=c.getContext('webgl2');if(!gl)return{ready:false,reason:'no-webgl2',loadState};
  const ext=gl.getExtension('WEBGL_debug_renderer_info');
  return{data:{...c.dataset},loadState,assetsLoaded:loaded===undefined?null:Number(loaded),assetsTotal:total===undefined?null:Number(total),ready:loadState==='rendered'&&assetsComplete&&!gl.isContextLost(),renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),lost:gl.isContextLost(),buffer:[gl.drawingBufferWidth,gl.drawingBufferHeight],canvasGeneration:window.__ctPerf?.generation??0};
 });
 try{
  for(const[route,selector,id]of scenes.filter(s=>!requested||requested.includes(s[2]))){
   await page.goto(base+route,{waitUntil:'domcontentloaded'});const stage=page.locator(selector);await stage.scrollIntoViewIfNeeded();
   if(id==='million-triangle-jeans'){await page.locator('.clothing-gallery-nav button').nth(2).click();await stage.locator('.clothing-gallery-canvas').scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-load-state','rendered');}
   const canvas=stage.locator('canvas').first();await expect(canvas).toBeVisible();await expect.poll(async()=>Number(await canvas.getAttribute('data-scene-triangles'))).toBeGreaterThan(0);
   await page.waitForTimeout(warmupMs);await expect.poll(async()=>(await state(stage)).ready,{timeout:60000,message:'Wait for current Canvas rendered with all tracked assets'}).toBe(true);
   const before=await state(stage),key=['sceneFrames','renderFrame'].find(k=>before.data[k]!==undefined);assert(key,'No renderer frame counter');
   // gl.info.render.frame also includes shadows/reflection render passes. Count
   // one lifecycle attribute delivery per Fiber tick for animation throughput.
   await page.evaluate(({selector,key})=>{
    window.__ctPerfObserver?.disconnect();const frameAttr=key==='sceneFrames'?'data-scene-frames':'data-render-frame';
    const p=window.__ctPerf={ticks:0,generation:0,canvas:document.querySelector(selector)?.querySelector('canvas'),lastCounter:null,events:[]};p.lastCounter=Number(p.canvas?.dataset[key]);
    window.__ctPerfObserver=new MutationObserver(records=>{
     const root=document.querySelector(selector),c=root?.querySelector('canvas'),runtime=root?.hasAttribute('data-load-state')?root:root?.querySelector('[data-load-state]');
     const loadState=c?.dataset.loadState??runtime?.dataset.loadState,loaded=c?.dataset.assetsLoaded,total=c?.dataset.assetsTotal;
     const assetsComplete=loaded===undefined&&total===undefined||loaded!==undefined&&total!==undefined&&Number(loaded)===Number(total);
     const add=reason=>{if(p.events.length<100)p.events.push({at:performance.now(),reason,loadState:loadState??null,assetsLoaded:loaded??null,assetsTotal:total??null,generation:p.generation});};
     if(c!==p.canvas){p.generation++;p.canvas=c;add('canvas-remount');p.lastCounter=null;}
     const relevant=records.filter(r=>r.target===c||r.target===runtime);
     if(loadState!=='rendered'||!assetsComplete)add('not-rendered-or-assets-pending');
     // Capture a loading phase even if multiple state writes finish in one task.
     if(relevant.some(r=>r.attributeName==='data-load-state'&&r.oldValue!==null&&r.oldValue!=='rendered'))add('load-state-transition');
     if(relevant.some(r=>r.target===c&&r.attributeName==='data-assets-loaded'&&r.oldValue!==null&&total!==undefined&&Number(r.oldValue)<Number(total)))add('assets-loading-transition');
     if(relevant.some(r=>r.target===c&&r.attributeName===frameAttr)){
      p.ticks++;const counter=Number(c.dataset[key]);if(p.lastCounter!==null&&counter<p.lastCounter)add('counter-reset');p.lastCounter=counter;
     }
    });
    window.__ctPerfObserver.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:[frameAttr,'data-load-state','data-assets-loaded','data-assets-total']});
   },{selector,key});
   let previous=before,previousTime=Date.now(),previousTick=0;const fps=[],passes=[],windows=[];
   for(let i=0;i<sampleWindows;i++){
    await page.waitForTimeout(2000);const now=Date.now(),next=await state(stage),monitor=await page.evaluate(()=>({tick:window.__ctPerf.ticks,generation:window.__ctPerf.generation,events:window.__ctPerf.events.splice(0)}));assert(!next.lost);
    const rate=(monitor.tick-previousTick)*1000/(now-previousTime),delta=Number(next.data?.[key])-Number(previous.data?.[key]);
    const counterReset=delta<0||monitor.events.some(e=>e.reason==='counter-reset'),remounted=next.canvasGeneration!==previous.canvasGeneration||monitor.events.some(e=>e.reason==='canvas-remount');
    const classification=previous.ready&&next.ready&&!counterReset&&!remounted&&monitor.events.length===0?'steady':'transition';
    fps.push(rate);passes.push(delta*1000/(now-previousTime));windows.push({index:i+1,elapsedMs:now-previousTime,classification,lifecycleUpdatesPerSecond:rate,rendererCounterPerSecond:passes.at(-1),counterReset,remounted,start:{loadState:previous.loadState,assetsLoaded:previous.assetsLoaded,assetsTotal:previous.assetsTotal,canvasGeneration:previous.canvasGeneration,counter:Number(previous.data?.[key])},end:{loadState:next.loadState,assetsLoaded:next.assetsLoaded,assetsTotal:next.assetsTotal,canvasGeneration:next.canvasGeneration,counter:Number(next.data?.[key])},events:monitor.events});
    previous=next;previousTime=now;previousTick=monitor.tick;
   }
   await page.evaluate(()=>window.__ctPerfObserver.disconnect());
   const steady=windows.filter(w=>w.classification==='steady').map(w=>w.lifecycleUpdatesPerSecond);
   report.samples.push({id,route,renderer:before.renderer,buffer:before.buffer,triangles:previous.data?Number(previous.data.sceneTriangles):null,frameCounter:key,seconds:sampleWindows*2,measurement:'Fiber lifecycle attribute deliveries per second; renderer counter includes extra render passes; transitions excluded from steady statistics',windows,steadyWindowCount:steady.length,transitionWindowCount:windows.length-steady.length,steadyMeanUpdatesPerSecond:steady.length?steady.reduce((a,b)=>a+b,0)/steady.length:null,steadyMinimumUpdatesPerSecond:steady.length?Math.min(...steady):null,intervalFps:fps,rendererCounterPerSecond:passes,meanFps:fps.reduce((a,b)=>a+b,0)/fps.length,minimumIntervalFps:Math.min(...fps),data:previous.data??null});
   await stage.screenshot({path:path.join(out,id+'.png')});console.log('SAMPLED '+id);
  }
  assert.deepEqual(report.errors,[]);report.allWindowsSteady=report.samples.every(s=>s.transitionWindowCount===0);report.passed=true;
 }catch(e){report.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{report.version=browser.version();report.finished=new Date().toISOString();await context.close();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,allWindowsSteady:report.allWindowsSteady,samples:report.samples.map(s=>({id:s.id,steadyWindows:s.steadyWindowCount,transitionWindows:s.transitionWindowCount,steadyMeanUpdatesPerSecond:s.steadyMeanUpdatesPerSecond,steadyMinimumUpdatesPerSecond:s.steadyMinimumUpdatesPerSecond})),failure:report.failure}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
