const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/+$/,'')+'/',out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v108/internal/academic-layout-'+Date.now());
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'}),report={base,browser:browser.version(),checks:[],errors:[]};
 try{
  for(const width of [1440,1024,768,390]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
   page.on('pageerror',e=>report.errors.push({width,error:e.message}));
   try{
    await page.goto(base+'learn',{waitUntil:'domcontentloaded',timeout:90000});
    const garment=page.locator('.garment-lifecycle');await garment.scrollIntoViewIfNeeded();
    await expect(garment.locator('canvas[data-garment-ready="true"]')).toBeVisible();
    await garment.getByRole('button',{name:'侧面',exact:true}).click();await expect(garment.locator('canvas')).toHaveAttribute('data-garment-angle','1');
    const sample=await garment.evaluate(root=>{const rect=s=>{const r=root.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return{heading:rect('.garment-study-heading'),grid:rect('.garment-research-grid'),exhibit:rect('.garment-exhibit'),notes:rect('.garment-research-notes'),canvas:rect('canvas'),overflow:document.documentElement.scrollWidth>innerWidth+1,rendering:{...root.querySelector('canvas').dataset}};});
    assert.equal(sample.overflow,false,'horizontal overflow at '+width);
    assert(sample.canvas.width>250&&sample.canvas.height>=400,'usable 3D exhibit at '+width);
    if(width>960){assert(sample.notes.x>=sample.exhibit.right,'research notes occupy the right column');assert(sample.notes.width>=300,'right column remains readable');}
    else{assert(sample.notes.y>=sample.exhibit.bottom,'research notes stack below the exhibit');assert(Math.abs(sample.notes.width-sample.exhibit.width)<2,'stacked sections use the same width');}
    // Keep the canvas in the actual viewport: a tall element screenshot can
    // scroll it outside IntersectionObserver's range and capture its deliberate
    // offscreen fallback instead of the verified 3D model.
    await garment.locator('canvas').scrollIntoViewIfNeeded();await expect(garment.locator('canvas[data-garment-ready="true"]')).toBeVisible();
    await page.screenshot({path:path.join(out,'garment-world-'+width+'.png')});
    await garment.locator('.garment-research-notes').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'garment-notes-'+width+'.png')});
    await garment.locator('.garment-study-heading').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'garment-heading-'+width+'.png')});
    report.checks.push({width,...sample});
   }finally{await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.failure=String(error);process.exitCode=1;}
 finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(error=>{console.error(error);process.exitCode=1;});
