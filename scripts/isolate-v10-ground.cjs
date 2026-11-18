/* Local bounded render isolation. __ct_gpu is a temporary development hook. */
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const mode=process.argv[2]||'no-reveal';
(async()=>{
 const report={at:new Date().toISOString(),mode,events:[],samples:[]};
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1200,height:850}});
 page.on('console',m=>{if(m.type()==='error')report.events.push(m.text().slice(0,700));});
 page.on('pageerror',e=>report.events.push(String(e)));
 const timer=setTimeout(()=>browser.close().catch(()=>{}),70000);
 try{
  await page.goto('http://127.0.0.1:3020/?__ct_gpu=1',{waitUntil:'domcontentloaded'});
  await page.locator('.city-formation canvas[data-city-prepared=true]').waitFor({timeout:18000});
  report.materialHooks=await page.evaluate(()=>{
   const hooks={};window.__ctGpu.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!m.isMeshStandardMaterial)continue;const key=m.onBeforeCompile.toString()+' KEY '+m.customProgramCacheKey();hooks[key]=(hooks[key]||0)+1;
   }});return hooks;
  });
  await page.evaluate(mode=>{
   const {scene}=window.__ctGpu,street=scene.children[4].children[4];
   window.__probeScene=scene;
   if(mode==='all-native')scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(!m.isMeshStandardMaterial)continue;
    m.onBeforeCompile=()=>{};m.customProgramCacheKey=()=> 'isolated-native';m.needsUpdate=true;
   }});
   else if(mode==='no-reveal'||mode==='no-wind')street.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){
    if(mode==='no-wind'&&!m.customProgramCacheKey().includes('wind'))continue;
    m.onBeforeCompile=()=>{};m.customProgramCacheKey=()=> 'isolated-native';m.needsUpdate=true;
   }});
   else {
    const parts=street.children[0].children;
    for(let i=0;i<parts.length;i++)if(mode==='originals'?i>=5:mode==='merged'?i<5:true)parts[i].visible=false;
    if(mode==='originals'||mode==='merged')street.children[1].visible=false;
   }
  },mode);
  for(const stage of process.argv[3]==='sequence'?[0,1,2,3,4,5]:[2,5]){
   await page.locator('.dust-story-steps button').nth(stage).evaluate(e=>e.click());
   for(let i=0;i<5;i++){
    await page.waitForTimeout(1000);
    const s=await page.evaluate(()=>({sameScene:window.__probeScene===window.__ctGpu?.scene,mode:document.querySelector('.city-formation .scene-stage')?.dataset.mode,data:{...document.querySelector('.city-formation canvas')?.dataset}}));
    report.samples.push({stage,...s});console.log(JSON.stringify({stage,...s}));
    if(!s.sameScene||s.mode!=='3d')throw Error('Renderer restarted or fell back');
   }
  }
 }catch(e){report.failure=String(e);}
 finally{clearTimeout(timer);await fs.writeFile(path.resolve(__dirname,'../outputs/v10-explore/isolation-'+mode+'.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({mode,failure:report.failure,events:report.events.slice(0,3)}));}
})();
