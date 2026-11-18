/* Bounded local GPU diagnostic; does not call AI/TTS or change stored data. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const angle=process.argv[2]||'d3d11',target=Number(process.argv[3]||2);
const out=path.resolve(__dirname,'../outputs/v10-explore/gpu-diagnostic-'+angle+'-'+target+'-'+Date.now());
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-angle='+angle,'--ignore-gpu-blocklist',...(angle==='swiftshader'?['--enable-unsafe-swiftshader']:[])]});
 const context=await browser.newContext({viewport:{width:1200,height:850}}),page=await context.newPage();
 const report={at:new Date().toISOString(),angle,target,console:[],events:[],samples:[]};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),45000);
 page.on('console',m=>{if(['warning','error'].includes(m.type()))report.console.push({type:m.type(),text:m.text().slice(0,1500)});});
 page.on('pageerror',e=>report.events.push(String(e)));page.on('crash',()=>report.events.push('page crashed'));
 await page.exposeFunction('recordGpuEvent',event=>report.events.push(event));
 await page.addInitScript(()=>{
  document.addEventListener('webglcontextlost',e=>window.recordGpuEvent({type:e.type,status:e.statusMessage,time:performance.now()}),true);
  document.addEventListener('webglcontextrestored',e=>window.recordGpuEvent({type:e.type,time:performance.now()}),true);
 });
 try{
  const cdp=await browser.newBrowserCDPSession();report.system=await cdp.send('SystemInfo.getInfo');
  await page.goto('http://127.0.0.1:3020',{waitUntil:'domcontentloaded'});
  await page.locator('.city-formation canvas[data-rendered=true]').waitFor({timeout:20000});
  const stages=target<0?[0,1,2,3,4,5]:[target];
  stageLoop:for(const stage of stages){
   await page.locator('.dust-story-steps button').nth(stage).evaluate(e=>e.click());
   for(let i=0;i<(target<0?5:18);i++){
    await page.waitForTimeout(700);
    const state=await page.locator('.city-formation').evaluate(e=>({mode:e.querySelector('.scene-stage')?.dataset.mode,canvas:{...e.querySelector('canvas')?.dataset}}));
    report.samples.push({stage,...state});if(state.mode==='context-lost'||state.mode==='error-fallback')break stageLoop;
   }
  }
  report.renderer=await page.locator('.city-formation canvas').evaluate(e=>{const g=e.getContext('webgl2'),x=g?.getExtension('WEBGL_debug_renderer_info');return x?g.getParameter(x.UNMASKED_RENDERER_WEBGL):'unknown';});
  await page.screenshot({path:path.join(out,'viewport.png'),timeout:6000}).catch(e=>report.events.push(String(e)));
 }catch(e){report.failure=String(e);}
 finally{clearTimeout(timer);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({out,events:report.events,console:report.console,last:report.samples.at(-1),renderer:report.renderer,failure:report.failure}));}
})();
