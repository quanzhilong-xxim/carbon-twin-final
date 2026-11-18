const {chromium,webkit,firefox,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');

(async()=>{
 const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/+$/,'')+'/',engine=process.env.CT_BROWSER||'chromium';
 assert(['chromium','webkit','firefox'].includes(engine),'Unknown CT_BROWSER');
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v108/internal/academic-recovery-'+engine+'-'+Date.now());
 await fs.mkdir(out,{recursive:true});
 const browser=await({chromium,webkit,firefox}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{}});
 const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}}),page=await context.newPage();
 page.setDefaultTimeout(45000);
 const report={base,browser:browser.version(),checks:[],expectedErrors:[],errors:[],modelRequests:0};
 let injectingFailure=true;
 page.on('pageerror',e=>(injectingFailure?report.expectedErrors:report.errors).push(e.message));
 page.on('request',r=>{if(new URL(r.url()).pathname==='/models/clothing/tshirt.glb')report.modelRequests++;});
 const route='**/models/clothing/tshirt.glb';
 await context.route(route,r=>r.fulfill({status:503,contentType:'text/plain',body:'Controlled transient model failure'}));
 try{
  await page.goto(base+'learn',{waitUntil:'domcontentloaded',timeout:90000});
  const garment=page.locator('.garment-lifecycle');await garment.scrollIntoViewIfNeeded();
  const retry=garment.getByRole('button',{name:'重新载入三维成衣',exact:true});await expect(retry).toBeVisible();
  await garment.getByRole('button',{name:'羊毛',exact:true}).click();await garment.locator('.lifecycle-path button').nth(4).click();
  await garment.locator('.scene-stage').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'01-model-request-failure.png')});
  report.checks.push('HTTP 503 exposes structure fallback and an explicit model retry');
  await context.unroute(route);injectingFailure=false;await retry.click();
  const canvas=garment.locator('canvas[data-garment-ready="true"]');await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-fabric-study','wool');await expect(canvas).toHaveAttribute('data-lifecycle-stage','4');
  await expect(garment.locator('.garment-view-status')).toContainText('三维成衣已就绪');
  assert(report.modelRequests>=2,'retry must request the model again');
  await canvas.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'02-model-request-restored.png')});
  report.checks.push('retry clears rejected GLTF cache and restores real GLB while retaining material and lifecycle stage');
  const supported=await canvas.evaluate(n=>{const gl=n.getContext('webgl2')||n.getContext('webgl'),extension=gl?.getExtension('WEBGL_lose_context');if(!extension)return false;window.__garmentContextExtension=extension;n.dataset.contextProbe='original-canvas';extension.loseContext();return true;});
  assert(supported,'WEBGL_lose_context is required for the actual GPU recovery check');
  await expect(garment.locator('.scene-stage')).toHaveAttribute('data-mode','context-lost');
  await page.evaluate(()=>window.__garmentContextExtension.restoreContext());
  await expect(garment.locator('.scene-stage')).toHaveAttribute('data-mode','3d');
  await expect(canvas).toHaveAttribute('data-context-probe','original-canvas');
  await expect(canvas).toHaveAttribute('data-fabric-study','wool');
  await expect(canvas).toHaveAttribute('data-lifecycle-stage','4');
  await garment.getByRole('button',{name:'背面',exact:true}).click();await expect(canvas).toHaveAttribute('data-garment-angle','2');
  await canvas.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'03-context-restored.png')});
  report.checks.push('real WEBGL_lose_context loss/restoration reuses the same canvas and restores interactive controls');
  report.rendering=await canvas.evaluate(n=>({...n.dataset}));
  assert.deepEqual(report.errors,[]);report.passed=true;
 }catch(error){report.failure=String(error);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(error=>{console.error(error);process.exitCode=1;});
