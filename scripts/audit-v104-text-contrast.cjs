/* Opaque CSS text surfaces only. Image/gradient backgrounds need visual QA. */
const {chromium}=require('playwright'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3040/',out=path.resolve('outputs/v10-explore/contrast-'+Date.now());await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:false}),context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});await context.route('**/api/**',r=>r.abort());const page=await context.newPage(),reports=[];
 try{for(const route of ['', 'learn']){
  await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(500);
  const report=await page.evaluate(()=>{
   const rgba=s=>{const a=s.match(/[\d.]+/g)?.map(Number);return a&&a.length>=3?[a[0]/255,a[1]/255,a[2]/255,a[3]??1]:null};
   const blend=(a,b)=>a.slice(0,3).map((c,i)=>c*a[3]+b[i]*(1-a[3]));
   const lum=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
   const checks=[],skipped=[];
   for(const e of document.querySelectorAll('h1,h2,h3,p,span,small,button,a,label,input,select')){
    if(![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))continue;
    const cs=getComputedStyle(e),rect=e.getBoundingClientRect();if(cs.visibility==='hidden'||cs.display==='none'||rect.width<1||rect.height<1)continue;
    let chain=[],el=e,unsafe=null;
    while(el){const s=getComputedStyle(el);if(Number(s.opacity)<.999){unsafe='group opacity';break}if(s.backgroundImage!=='none'){unsafe='image/gradient background';break}const c=rgba(s.backgroundColor);if(c)chain.push(c);if(c?.[3]===1)break;el=el.parentElement;}
    const text=e.textContent.trim().slice(0,80);if(unsafe){skipped.push({text,reason:unsafe});continue}
    let bg=[1,1,1];for(const c of chain.reverse())bg=blend(c,bg);const color=rgba(cs.color);if(!color){skipped.push({text,reason:'unsupported colour syntax'});continue}
    const fg=blend(color,bg),ratio=(Math.max(lum(fg),lum(bg))+.05)/(Math.min(lum(fg),lum(bg))+.05),large=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.66&&parseFloat(cs.fontWeight)>=700),minimum=large?3:4.5;
    checks.push({text,tag:e.tagName,className:typeof e.className==='string'?e.className:'',color:cs.color,background:bg.map(v=>Math.round(v*255)),size:cs.fontSize,ratio:Number(ratio.toFixed(2)),minimum,passed:ratio>=minimum});
   }
   return {checks,skipped,failures:checks.filter(c=>!c.passed)};
  });reports.push({route,...report});
 }}finally{await browser.close()}
 const report={base,at:new Date().toISOString(),method:'Computed text colour over composited opaque CSS ancestors; excludes imagery/gradients/group opacity, focus borders and 3D text',reports};await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,reports:reports.map(r=>({route:r.route,checked:r.checks.length,skipped:r.skipped.length,failures:r.failures}))}));
})().catch(e=>{console.error(e);process.exitCode=1});
