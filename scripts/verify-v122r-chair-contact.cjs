// Verify the real registered GLB in the production page. No paid endpoints.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const base=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3070';
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v122/r-chair-contact');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true}),viewport={width:1440,height:900};
 const context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}}),page=await context.newPage();
 const report={base,at:new Date().toISOString(),browser:browser.version(),errors:[],http:[],checks:[]};
 await context.route('**/api/**',r=>r.abort());page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({url:r.url(),status:r.status()})});
 try{
  await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:90000});
  const card=page.locator('.identity-unit[data-character=business]');await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
  const dialog=page.getByRole('dialog'),canvas=dialog.locator('canvas');
  await expect(dialog.locator('.avatar-stage')).toHaveAttribute('data-ready','true',{timeout:90000});
  await page.waitForTimeout(1800);
  let data=await canvas.evaluate(c=>({...c.dataset}));assert.equal(data.assetVersion,process.env.CT_BUSINESS_ART_REV||'v122r');
  for(const phase of ['initial','after-standing']){
   if(phase==='after-standing'){
    await dialog.getByRole('button',{name:'起身站立',exact:true}).click();await page.waitForTimeout(2200);
    // Reopen to recover the original seated action and independent skeleton.
    await page.getByRole('button',{name:'关闭角色展厅'}).click();await card.getByRole('button',{name:'进入角色展厅'}).click();
    await expect(dialog.locator('.avatar-stage')).toHaveAttribute('data-ready','true',{timeout:90000});await page.waitForTimeout(1800);
   }
   data=await canvas.evaluate(c=>({...c.dataset}));const rig=JSON.parse(data.nativeRig);assert(rig.chairContact);
   for(const side of ['R','L']){
    const c=rig.chairContact[side];assert(c,'Missing actual retained chair arm');assert(c.overSupport,'Palm must sit over the actual chair arm');
    assert(c.gap>-.015&&c.gap<.04,'Palm clearance must remain close to the upholstery');
    assert.equal(c.surfaceVertices,32,'Measure actual weighted hand mesh vertices');
    assert(c.supportedVertices>=24,'Palm surface must lie over the actual armrest');
    assert(c.surfaceGap>=-.003&&c.surfaceGap<.008,'Actual palm skin must touch without visible penetration or hovering');
   }
   report.checks.push({phase,modelSource:data.modelSource,chairContact:rig.chairContact});
   await dialog.getByRole('button',{name:'45°',exact:true}).click();await page.waitForTimeout(600);await page.screenshot({path:path.join(out,phase+'-seated.png')});
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
