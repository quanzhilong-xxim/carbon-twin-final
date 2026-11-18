/* Sequential production checks for real role rendering across reload/remount.
 * The artificial delay is local, bounded, and does not call paid APIs. */
const {chromium, expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/$/,'');
const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v114-role-lifecycle');
const roles=process.env.CT_ROLE_REVISIONS?JSON.parse(process.env.CT_ROLE_REVISIONS):{student:'v11e',business:'v11i',city:'v11g'};
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const report={base,at:new Date().toISOString(),checks:[],errors:[],http:[],passed:false};
  const browser=await chromium.launch({channel:'chrome',headless:true});
  report.browser=browser.version();
  try{
    for(const mobile of process.env.CT_LIFECYCLE_MOBILE_ONLY==='1'?[true]:[false,true]){
      const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
      const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,reducedMotion:mobile?'reduce':'no-preference',recordVideo:{dir:out,size:viewport}});
      await context.route('**/api/**',route=>route.abort());
      const page=await context.newPage();page.setDefaultTimeout(45000);
      page.on('pageerror',e=>report.errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)report.http.push({url:new URL(r.url()).pathname,status:r.status()});});
      const open=async(id,phase)=>{
        const card=page.locator(`.identity-unit[data-character="${id}"]`);
        await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
        const room=page.getByRole('dialog');
        await page.waitForFunction(({id,version})=>{const c=document.querySelector('.character-room canvas');return c?.dataset.avatarIdentity===id&&c.dataset.assetVersion===version&&Number(c.dataset.characterTriangles)>0&&document.querySelector('.character-room .avatar-stage')?.dataset.ready==='true';},{id,version:roles[id]},{timeout:60000});
        const rendering=await room.locator('canvas').evaluate(c=>({...c.dataset,contextLost:c.getContext('webgl2')?.isContextLost()}));
        assert.equal(rendering.contextLost,false);assert.equal(rendering.assetQuality,mobile?'lite':'standard');
        report.checks.push({mobile,reducedMotion:mobile,id,phase,rendering});
        await room.screenshot({path:path.join(out,`${mobile?'mobile':'desktop'}-${id}-${phase}.png`)});
        return room;
      };
      try{
        await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:60000});
        for(const id of Object.keys(roles)){await open(id,'first');await page.getByRole('button',{name:'关闭角色展厅'}).click();}
        await page.reload({waitUntil:'domcontentloaded'});
        for(const id of Object.keys(roles)){await open(id,'reload');await page.getByRole('button',{name:'关闭角色展厅'}).click();}
        await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'学术档案',exact:true}).click();
        await expect(page.locator('.library-hero')).toBeVisible();
        await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'探索',exact:true}).click();
        for(const id of Object.keys(roles)){await open(id,'return');await page.getByRole('button',{name:'关闭角色展厅'}).click();}
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        if(!mobile){
          let release,requested;const seen=new Promise(resolve=>requested=resolve);
          await context.route(`**/CT_Student_Explore_${roles.student}-portrait.glb`,route=>new Promise(resolve=>{release=()=>resolve(route.continue());requested();}));
          const room=await open('student','before-delayed-portrait');
          try{
            await room.getByRole('button',{name:'面部',exact:true}).click();
            await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('No portrait request')),15000).unref())]);
            await expect(room.locator('.avatar-poster')).toBeVisible();
            await expect(room.getByRole('button',{name:'重试三维'})).toHaveCount(0);
            await page.waitForTimeout(3000);
            await expect(room.locator('.avatar-stage')).toHaveAttribute('data-ready','false');
            await room.screenshot({path:path.join(out,'desktop-delayed-loading.png')});
            release();release=null;
            await expect(room.locator('.avatar-stage')).toHaveAttribute('data-ready','true',{timeout:60000});
            await expect(room.locator('.avatar-poster')).toHaveCount(0);
            report.checks.push({phase:'portrait locally delayed 3 seconds',readyAfterRelease:true,permanent2d:false});
          }finally{if(release)release();}
        }
      }catch(error){
        report.lastFailure={mobile,message:String(error),stage:await page.locator('.character-room .avatar-stage').evaluateAll(nodes=>nodes.map(node=>({stage:{...node.dataset},canvas:node.querySelector('canvas')?{...node.querySelector('canvas').dataset}:null,text:node.parentElement?.textContent}))).catch(()=>[])};
        await page.screenshot({path:path.join(out,`${mobile?'mobile':'desktop'}-failure.png`)}).catch(()=>{});throw error;
      }finally{
        await context.close();report[mobile?'mobileVideo':'desktopVideo']=await page.video().path();
      }
    }
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);report.passed=true;
  }catch(e){report.failure=String(e);process.exitCode=1;}
  finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,checks:report.checks.length,errors:report.errors,http:report.http}));}
})().catch(e=>{console.error(e);process.exitCode=1});
