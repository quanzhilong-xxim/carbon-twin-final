const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:1200,height:850}}),samples=[],errors=[];
 const timer=setTimeout(()=>browser.close().catch(()=>{}),65000);
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:3020',{waitUntil:'domcontentloaded'});
  await page.locator('.city-formation canvas[data-rendered=true]').waitFor();
  for(let stage=0;stage<6;stage++){
   await page.locator('.dust-story-steps button').nth(stage).evaluate(e=>e.click());
   await page.waitForTimeout(1800);
   const state=await page.locator('.city-formation').evaluate(e=>({mode:e.querySelector('.scene-stage')?.dataset.mode,root:{...e.dataset},canvas:{...e.querySelector('canvas')?.dataset}}));
   samples.push({stage,...state});console.log(JSON.stringify({stage,...state}));
  }
  for(let i=0;i<6;i++){
   await page.waitForTimeout(3000);
   const state=await page.locator('.city-formation').evaluate(e=>({mode:e.querySelector('.scene-stage')?.dataset.mode,canvas:{...e.querySelector('canvas')?.dataset}}));
   samples.push({dwell:(i+1)*3,...state});console.log(JSON.stringify({dwell:(i+1)*3,...state}));
  }
 }finally{clearTimeout(timer);await fs.writeFile(path.resolve(__dirname,'../outputs/v10-explore/stability-probe.json'),JSON.stringify({at:new Date().toISOString(),samples,errors},null,2));await browser.close();}
})().catch(e=>{console.error(String(e));process.exitCode=1;});
