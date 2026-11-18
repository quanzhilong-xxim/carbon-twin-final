const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
  const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v114-mobile-render');await fs.mkdir(out,{recursive:true});
  const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/$/,'');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const report={base,browser:browser.version(),at:new Date().toISOString(),deviceScaleFactor:3,checks:[],errors:[],http:[],videos:[],passed:false};
  try{
    for(const reducedMotion of ['no-preference','reduce']){
      const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion,recordVideo:{dir:out,size:{width:390,height:844}}});
      await context.route('**/api/**',r=>r.abort());const page=await context.newPage();
      page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:new URL(r.url()).pathname});});
      try{
        await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:60000});
        for(const [id,revision] of [['student','v11e'],['business','v11i'],['city','v11g']]){
          const card=page.locator(`.identity-unit[data-character="${id}"]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();const room=page.getByRole('dialog');
          await page.waitForFunction(({id,revision})=>{const c=document.querySelector('.character-room canvas');return c?.dataset.avatarIdentity===id&&c.dataset.assetVersion===revision&&Number(c.dataset.characterTriangles)>0&&document.querySelector('.character-room .avatar-stage')?.dataset.ready==='true';},{id,revision},{timeout:60000});
          const idleArm=await room.locator('canvas').getAttribute('data-arm');
          await room.getByRole('button',{name:id==='student'?'挥手':id==='business'?'致意':'引导',exact:true}).click();await page.waitForTimeout(500);
          const render=await room.locator('canvas').evaluate(c=>({dataset:{...c.dataset},bufferWidth:c.width,cssWidth:c.clientWidth,context:c.getContext('webgl2')?.getContextAttributes(),lost:c.getContext('webgl2')?.isContextLost()}));
          assert.equal(render.dataset.assetQuality,'lite');assert.equal(render.dataset.characterDpr,'1.00');assert.equal(render.context.antialias,false);assert.equal(render.lost,false);assert(render.bufferWidth<=render.cssWidth+1);assert(Number(render.dataset.characterTriangles)>0);assert.notEqual(render.dataset.arm,idleArm,'gesture must alter the actual controller pose');
          await expect(room.locator('.avatar-poster')).toHaveCount(0);await room.screenshot({path:path.join(out,`${id}-${reducedMotion}.png`)});
          report.checks.push({id,revision,reducedMotion,...render});await page.getByRole('button',{name:'关闭角色展厅'}).click();
        }
      }finally{await context.close();report.videos.push(await page.video().path());}
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
  }catch(e){report.failure=String(e);process.exitCode=1;}
  finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,checks:report.checks.length,errors:report.errors,http:report.http}));}
})().catch(e=>{console.error(e);process.exitCode=1});
