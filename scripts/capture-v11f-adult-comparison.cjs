const{chromium,expect}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const out=path.resolve(process.env.CT_CHARACTER_REVIEW_OUT||'outputs/v108/internal/v11f-native-adult-comparison');await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:'chrome'}),report={at:new Date().toISOString(),browser:browser.version(),viewport:{width:1440,height:900},checks:[],errors:[],routes:[]};
 try{
  for(const revision of(process.env.CT_COMPARE_REVISIONS||'v11e,v11f').split(',')){
   const context=await browser.newContext({viewport:report.viewport,recordVideo:{dir:out,size:report.viewport}});
   await context.route('**/api/**',r=>r.abort());
   await context.route(/CT_(Business|City)_Explore_v11[d-i](-portrait|-lite)?\.glb/,async route=>{
    const requestedIdentity=/CT_(Business|City)_/.exec(route.request().url())[1].toLowerCase();
    if(!(process.env.CT_COMPARE_IDENTITIES||'business,city').split(',').includes(requestedIdentity))return route.continue();
    const file=decodeURIComponent(new URL(route.request().url()).pathname).replace(/v11[d-i]/,revision).replace(/^\//,'');
    const actual=path.join(__dirname,'../public',file),data=await fs.readFile(actual);report.routes.push({revision,requested:route.request().url(),file,sha256:crypto.createHash('sha256').update(data).digest('hex')});
    await route.fulfill({body:data,contentType:'model/gltf-binary'});
   });
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push({revision,error:e.message}));
   try{
    await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/+$/,'')+'/#identities',{waitUntil:'domcontentloaded',timeout:90000});
    for(const id of(process.env.CT_COMPARE_IDENTITIES||'business,city').split(',')){
     const card=page.locator(`.identity-unit[data-character=${id}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
     const dialog=page.getByRole('dialog');await page.waitForFunction(id=>document.querySelector('.character-room canvas')?.dataset.avatarIdentity===id,id,{timeout:90000});
     await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();
     for(const[view,label]of[['front','正面'],['detail','面部'],['threequarter','45°'],['left','左侧'],['right','右侧']]){
      await dialog.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(view=>document.querySelector('.character-room canvas')?.dataset.avatarView===view,view);await page.waitForTimeout(700);
      await dialog.screenshot({path:path.join(out,`${revision}-${id}-${view}.png`)});
     }
     await dialog.getByRole('button',{name:'面部',exact:true}).click();await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
     await dialog.getByRole('button',{name:'眨眼',exact:true}).click();
     await page.waitForFunction(()=>{const canvas=document.querySelector('.character-room canvas');if(Number(canvas?.dataset.blink)<.8)return false;const pause=[...document.querySelectorAll('.character-room button')].find(b=>b.textContent.trim()==='暂停动作');pause?.click();return Boolean(pause);},undefined,{timeout:5000});
     await dialog.screenshot({path:path.join(out,`${revision}-${id}-blink.png`)});
     const state=await dialog.locator('canvas').evaluate(c=>({...c.dataset}));report.checks.push({revision,id,state});
     await page.getByRole('button',{name:'关闭角色展厅'}).click();
    }
   }finally{await context.close();report[revision+'Video']=await page.video().path();}
  }
  expect(report.errors).toEqual([]);report.passed=true;
 }catch(e){report.failure=String(e);process.exitCode=1;}
 finally{await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1;});
