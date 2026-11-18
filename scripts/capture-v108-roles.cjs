const {chromium,firefox,webkit}=require('@playwright/test'),fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const engine=process.env.CT_BROWSER||'chromium',mobile=process.argv.includes('mobile');
 const out=path.resolve(process.env.CT_EVIDENCE_DIR||`outputs/v108/internal/roles-${engine}-${mobile?'mobile-':''}${Date.now()}`);await fs.mkdir(out,{recursive:true});
 const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
 const browser=await({chromium,firefox,webkit}[engine]).launch({headless:true,...engine==='chromium'?{channel:'chrome'}:{}}),context=await browser.newContext({viewport,recordVideo:{dir:out,size:viewport}});
 await context.route('**/api/**',r=>r.abort());
 const page=await context.newPage(),start=Date.now(),report={out,engine,browser:browser.version(),viewport,events:[],errors:[],roles:[]};
 page.on('pageerror',e=>report.errors.push(e.message));
 try{
  await page.goto((process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066')+'/#identities',{waitUntil:'domcontentloaded',timeout:60000});
  for(const [id,label,version] of [['student','学生',process.env.CT_STUDENT_REVISION||'v11e'],['business','企业主',process.env.CT_ADULT_REVISION||'v11i'],['city','城市管理者',process.env.CT_CITY_REVISION||'v11g']]){
   if(['student','business','city'].includes(process.argv[2])&&id!==process.argv[2])continue;
   const card=page.locator(`.identity-unit[data-character=${id}]`);await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
   const dialog=page.getByRole('dialog');
   await page.waitForFunction(v=>document.querySelector('.character-room canvas')?.dataset.assetVersion===v,version,{timeout:60000});
   const source=await dialog.locator('canvas').getAttribute('data-model-source');if(!source?.includes(`_${version}`))throw Error(`Wrong integrated model: ${source}`);
   await dialog.getByRole('button',{name:'暂停动作',exact:true}).click();
   const entry={id,version,views:[],actions:[]};report.roles.push(entry);
   for(const [view,label] of [['front','正面'],['detail','面部'],['eyes','眼部'],['hair','头发'],['outfit','服装'],['hands','手部'],['prop','道具'],['threequarter','45°'],['left','左侧'],['right','右侧'],['back','背面']]){
    report.events.push({seconds:(Date.now()-start)/1000,id,view});await dialog.getByRole('button',{name:label,exact:true}).click();
    await page.waitForFunction(view=>document.querySelector('.character-room canvas')?.dataset.avatarView===view,view);await page.waitForTimeout(1800);
    await dialog.screenshot({path:path.join(out,`${id}-${view}.png`)});entry.views.push(view);
   }
   await dialog.getByRole('button',{name:'正面',exact:true}).click();await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
   for(const label of [id==='student'?'挥手':id==='business'?'致意':'引导','眨眼','点头']){report.events.push({seconds:(Date.now()-start)/1000,id,action:label});await dialog.getByRole('button',{name:label,exact:true}).click();await page.waitForTimeout(200);entry.actions.push({label,...await dialog.locator('canvas').evaluate(c=>({...c.dataset}))});await page.waitForTimeout(3000);}
   await page.getByRole('button',{name:'关闭角色展厅'}).click();
  }
 }catch(e){report.failure=String(e);await page.screenshot({path:path.join(out,'failure.png')});process.exitCode=1;}
 finally{await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
