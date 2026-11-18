const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=(process.env.CT_PREVIEW_URL||'http://127.0.0.1:3066').replace(/\/$/,'');
const out=path.resolve(process.env.CT_EVIDENCE_DIR||'outputs/v113/walkthrough');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const viewport={width:1440,height:900};
  const context=await browser.newContext({viewport,deviceScaleFactor:1,recordVideo:{dir:out,size:viewport}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const started=Date.now(),report={base,browser:browser.version(),viewport,at:new Date().toISOString(),events:[],errors:[],http:[],api:[],models:[],files:[],memory:[]};
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)report.http.push({status:r.status(),url:r.url().split('?')[0]});});
  // This walkthrough exercises local interactions and never spends AI credits.
  await context.route('**/api/**',r=>{report.api.push(new URL(r.request().url()).pathname);return r.abort();});
  const event=label=>report.events.push({seconds:+((Date.now()-started)/1000).toFixed(2),label});
  const shot=async (name,options={})=>{await page.screenshot({path:path.join(out,name+'.png'),...options});const data=await fs.readFile(path.join(out,name+'.png'));report.files.push({file:name+'.png',bytes:data.length,sha256:hash(data)});};
  const inspect=async label=>{
    report.models.push({label,canvases:await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>({...n.dataset})))});
    report.memory.push({label,...await page.evaluate(()=>({jsHeapBytes:performance.memory?.usedJSHeapSize??null,domNodes:document.getElementsByTagName('*').length}))});
  };
  try{
    event('open existing CarbonTwin site');
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:90000});
    await page.waitForTimeout(2500);await shot('home-top');
    await page.locator('#city-journey').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);await shot('explore-city-journey');
    await page.locator('#identities').scrollIntoViewIfNeeded();await page.waitForTimeout(1800);await shot('identities');
    await shot('home-explore-full',{fullPage:true});
    for(const id of ['student','business','city']){
      event('enter interactive '+id);
      const card=page.locator(`.identity-unit[data-character="${id}"]`);
      await card.locator('.identity-card').click();await card.getByRole('button',{name:'进入角色展厅'}).click();
      const room=page.getByRole('dialog');
      await page.waitForFunction(id=>document.querySelector('.character-room .avatar-stage')?.dataset.ready==='true'&&document.querySelector('.character-room canvas')?.dataset.avatarIdentity===id,id,{timeout:90000});
      await page.waitForTimeout(700);await shot('character-'+id+'-front');
      await room.getByRole('button',{name:'45°',exact:true}).click();await page.waitForTimeout(700);
      const canvas=room.locator('canvas'),rect=await canvas.boundingBox();assert(rect);
      await page.mouse.move(rect.x+rect.width*.55,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.25,rect.y+rect.height*.52,{steps:18});await page.mouse.up();
      await page.waitForTimeout(800);await shot('character-'+id+'-rotated');event('rotate '+id+' using pointer');
      await room.getByRole('button',{name:'正面',exact:true}).click();
      await room.getByRole('button',{name:id==='student'?'挥手':id==='business'?'致意':'引导',exact:true}).click();await page.waitForTimeout(1500);await shot('character-'+id+'-gesture');
      if(id==='student'){
        await room.getByRole('button',{name:'手部',exact:true}).click();await room.getByRole('button',{name:'记录笔记',exact:true}).click();await page.waitForTimeout(2000);await shot('student-writing');
        const state=await canvas.evaluate(c=>({...c.dataset}));assert(Number(state.recordingVisible)>0);report.writing=state;
      }
      await room.getByRole('button',{name:'暂停动作',exact:true}).click();await page.waitForTimeout(200);const frame=await canvas.getAttribute('data-character-frame');await page.waitForTimeout(500);assert.equal(await canvas.getAttribute('data-character-frame'),frame);
      await inspect(id);await room.getByRole('button',{name:'继续动作',exact:true}).click();await page.getByRole('button',{name:'关闭角色展厅'}).click();
    }
    event('navigate to academic archive');
    await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'学术档案',exact:true}).click();
    await page.waitForSelector('canvas[data-library-ready="true"]',{timeout:90000});await page.waitForTimeout(1000);await shot('academic-top');
    const garment=page.locator('.garment-lifecycle');await garment.locator('.scene-stage').scrollIntoViewIfNeeded();
    await expect(garment.locator('canvas[data-garment-ready="true"]')).toBeVisible({timeout:60000});
    await garment.getByRole('button',{name:'背面',exact:true}).click();await page.waitForTimeout(600);
    await garment.getByRole('button',{name:'展开材料分层',exact:true}).click();await garment.getByRole('button',{name:'羊毛',exact:true}).click();
    await garment.locator('.lifecycle-path button').nth(7).click();await garment.locator('canvas').scrollIntoViewIfNeeded();await page.waitForTimeout(900);await shot('garment-lifecycle');await inspect('garment');event('operate real garment, material and lifecycle');
    await shot('academic-full',{fullPage:true});
    await page.getByRole('link',{name:'搜索全站',exact:true}).click();await page.getByRole('searchbox',{name:'搜索 CarbonTwin'}).fill('咖啡');await page.waitForTimeout(700);await shot('search');
    await page.getByRole('navigation',{name:'搜索内容分类'}).getByRole('button',{name:'行为沙盘'}).click();await page.locator('.site-search-result').filter({hasText:'咖啡时光'}).click();
    await expect(page.locator('#coffee-time')).toBeInViewport();event('search navigates to real chapter');
    const chapters=['sakura-meeting','daily-choices','ecology-lab','digital-room','coffee-time','eco-companion','two-lives','pasture-letter','data-echo','story-reflection'];
    report.chapters=[];
    const visit=async (id,number)=>{await page.locator('#'+id).scrollIntoViewIfNeeded();await page.waitForTimeout(900);event('chapter '+number+' '+id);report.chapters.push(id);};
    await expect(page.locator('.lab-chapters a')).toHaveCount(10);
    await visit(chapters[0],1);await expect(page.locator('.behaviour-intro .sakura-scene')).toHaveAttribute('data-ready','true',{timeout:60000});
    await page.locator('.behaviour-intro').getByRole('button',{name:'小雨',exact:true}).click();await page.locator('.behaviour-intro').getByRole('button',{name:'清晨',exact:true}).click();await page.waitForTimeout(1300);await shot('chapter-01-sakura');await shot('behaviour-top');
    await visit(chapters[1],2);await page.getByRole('button',{name:/城市旅程/}).click();
    await page.waitForFunction(()=>document.querySelector('#story-reflection .story-reflection-ledger strong')?.textContent?.includes('3.89'),null,{timeout:30000});await shot('behaviour-choice');event('change scenario and verify computed feedback');
    await visit(chapters[2],3);const ecology=page.locator('#ecology-lab');await ecology.getByRole('button',{name:'冬',exact:true}).click();await expect(ecology.locator('canvas[data-season=winter]')).toBeVisible({timeout:60000});await expect(ecology.locator('.botanical-diorama .scene-stage')).toHaveAttribute('data-mode','3d');await shot('behaviour-ecology');
    await visit(chapters[3],4);const twin=page.locator('#digital-room .twin-canvas');await expect(twin).toHaveAttribute('data-experience','orbit',{timeout:60000});await page.locator('#digital-room').getByRole('button',{name:'03 咖啡厅',exact:true}).click();await expect(twin).toHaveAttribute('data-experience','focused',{timeout:30000});await page.locator('#digital-room').getByRole('button',{name:'02 进入室内 ↗',exact:true}).click();await expect(twin).toHaveAttribute('data-room-ready','true',{timeout:60000});await expect(twin).toHaveAttribute('data-space','cafe');await shot('chapter-04-interior');
    await visit(chapters[4],5);const cafe=page.locator('#coffee-time');await expect(cafe.locator('.scene-stage')).toHaveAttribute('data-mode','3d',{timeout:60000});const cafeBefore=await cafe.locator('.story-live-strip').innerText();await cafe.getByRole('button',{name:/意式咖啡机/}).click();assert.notEqual(await cafe.locator('.story-live-strip').innerText(),cafeBefore);await shot('chapter-05-cafe');
    await visit(chapters[5],6);await page.locator('#companion-electricity-number').fill('90');await page.locator('#companion-gasoline-number').fill('10');await page.waitForFunction(()=>document.querySelector('.story-reflection-ledger strong')?.textContent?.includes('1.61'));await expect(page.locator('#electricity-number')).toHaveValue('90');await page.locator('#eco-companion').getByRole('button',{name:'轻触猫咪',exact:true}).click();await expect(page.locator('#eco-companion [role=status]')).toContainText('1 次');await page.waitForTimeout(1300);await shot('behaviour-companion');await inspect('behaviour');
    await visit(chapters[6],7);const compare=page.locator('#two-lives');await compare.getByRole('button',{name:'按使用人数'}).click();await expect(compare.locator('.building-comparison')).toHaveAttribute('data-metric','person');await expect(compare.locator('.building-comparison')).toContainText('653.63');await shot('chapter-07-comparison');
    await visit(chapters[7],8);const pasture=page.locator('#pasture-letter');for(const label of ['牧场','加工','冷链','消费']){await pasture.getByRole('navigation',{name:'乳品四节点'}).getByRole('button',{name:new RegExp(label)}).click();await page.waitForTimeout(500);}await expect(pasture).toHaveAttribute('data-milk-stage','3');await expect(pasture.locator('.story-live-strip')).toContainText('3.33');await shot('chapter-08-pasture');
    await visit(chapters[8],9);await page.locator('#data-echo').getByRole('button',{name:/汽油燃烧/}).click();await expect(page.locator('.story-evidence')).toContainText('2.3');await page.getByRole('button',{name:'保存当前为 A',exact:true}).click();await shot('chapter-09-evidence');
    await visit(chapters[9],10);await expect(page.locator('.story-reflection-ledger strong')).toContainText('1.61');await shot('chapter-10-ending');await shot('behaviour-full',{fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    for(const [id,route] of [['city-studies','/city-studies'],['citylight-studio','/citylight/studio']]){event('open protected '+id);const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(response.status(),200);await page.waitForTimeout(3500);await shot(id+'-top');await shot(id+'-full',{fullPage:true});}
    await page.getByRole('navigation',{name:'主导航'}).getByRole('link',{name:'探索',exact:true}).click();await page.waitForTimeout(1700);await shot('returned-home');event('return to explore');
    report.resourceTimings=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/\.(glb|gltf|hdr|woff2)(\?|$)/.test(r.name)).map(r=>({url:new URL(r.name).pathname,durationMs:Math.round(r.duration),transferBytes:r.transferSize})));
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.http,[]);assert.deepEqual(report.api,[]);report.passed=true;
  }catch(e){report.failure=String(e);process.exitCode=1;await shot('failure').catch(()=>{});}
  finally{await context.close();report.video=await page.video().path();await browser.close();const data=await fs.readFile(report.video);report.files.push({file:path.basename(report.video),bytes:data.length,sha256:hash(data),type:'raw continuous browser recording'});await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({out,passed:report.passed,failure:report.failure,errors:report.errors,http:report.http}));}
})().catch(e=>{console.error(e);process.exitCode=1});
