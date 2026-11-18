/* One bounded native-window probe. Existing browser windows are untouched. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const out=path.resolve(__dirname,'../outputs/v10-explore/native-playback-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const page=await browser.newPage({viewport:{width:1200,height:850}}),report={at:new Date().toISOString(),version:browser.version(),samples:[],errors:[],warnings:[],passed:false};
 const timer=setTimeout(()=>browser.close().catch(()=>{}),65000);
 page.on('pageerror',e=>report.errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&report.warnings.length<8)report.warnings.push(m.text().slice(0,500));});
 try{
  await page.goto('http://127.0.0.1:3020',{waitUntil:'domcontentloaded'});await page.locator('.city-formation canvas[data-rendered=true]').waitFor({timeout:25000});
  await page.locator('.dust-playback button').first().click();
  const start=Date.now();
  for(let i=0;i<14;i++){
   await page.waitForTimeout(2000);
   const sample=await page.locator('.city-formation').evaluate(e=>({visibility:document.visibilityState,box:e.getBoundingClientRect().toJSON(),root:{...e.dataset},canvas:{...e.querySelector('canvas')?.dataset},mode:e.querySelector('.scene-stage')?.dataset.mode}));
   report.samples.push({elapsed:(Date.now()-start)/1000,...sample});
   if(sample.mode==='context-lost'||sample.mode==='error-fallback'||report.warnings.length)break;
   if(Number(sample.canvas.cityProgress)>.995){report.passed=true;break;}
  }
  await page.screenshot({path:path.join(out,'native-window.png'),timeout:8000});
 }catch(e){report.failure=String(e);}
 finally{clearTimeout(timer);await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({out,...report}));}
})();
