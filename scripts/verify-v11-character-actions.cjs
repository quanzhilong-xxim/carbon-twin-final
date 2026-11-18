const { chromium } = require('@playwright/test');
const fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const out = path.resolve(process.env.CT_EVIDENCE_DIR || `outputs/v108/internal/v11-actions-${Date.now()}`); await fs.mkdir(out,{recursive:true});
  const base = (process.env.CT_PREVIEW_URL || 'http://127.0.0.1:3066').replace(/\/$/, '');
  const revisions = { student: process.env.CT_STUDENT_REVISION || process.env.CT_CHARACTER_REVISION || 'v11e', business: process.env.CT_ADULT_REVISION || process.env.CT_CHARACTER_REVISION || 'v11i', city: process.env.CT_CITY_REVISION || process.env.CT_CHARACTER_REVISION || 'v11g' };
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out,size:{width:1440,height:900}}});
  await context.route('**/api/**',r=>r.abort());
  const page = await context.newPage(), report={out,events:[],errors:[]}, started=Date.now();
  page.on('pageerror',e=>report.errors.push(e.message));
  try {
    await page.goto(base+'/#identities',{waitUntil:'domcontentloaded',timeout:60000});
    for(const [id,labels] of [['student',['挥手','观察城市','记录笔记','轻转身']],['business',['致意','观察趋势','思考']],['city',['引导','观察规划','思考']]]) {
      const card=page.locator(`.identity-unit[data-character=${id}]`); await card.locator('.identity-card').click(); await card.getByRole('button',{name:'进入角色展厅'}).click();
      const dialog=page.getByRole('dialog');
      await page.waitForFunction(expected=>document.querySelector('.character-room canvas')?.dataset.assetVersion===expected&&document.querySelector('.character-room .avatar-stage')?.dataset.ready==='true',revisions[id],{timeout:60000});
      if(id==='student') assert.equal(await dialog.locator('canvas').getAttribute('data-recording-visible'),'0','recording props must be hidden in idle');
      for(const label of labels) {
        await dialog.getByRole('button',{name:label,exact:true}).click(); await page.waitForTimeout(1350);
        const state=await dialog.locator('canvas').evaluate(c=>({...c.dataset}));
        assert(!['undefined','NaN'].includes(state.arm)); assert(!['undefined','NaN'].includes(state.nod));
        await dialog.getByRole('button',{name:'暂停动作',exact:true}).click(); await page.waitForTimeout(250);
        const before=await dialog.locator('canvas').getAttribute('data-character-frame'); await page.waitForTimeout(450);
        assert.equal(await dialog.locator('canvas').getAttribute('data-character-frame'),before);
        await dialog.screenshot({path:path.join(out,`${id}-${label}.png`)});
        report.events.push({seconds:(Date.now()-started)/1000,id,label,state,pausedFrame:before});
        await dialog.getByRole('button',{name:'继续动作',exact:true}).click();
      }
      await page.getByRole('button',{name:'关闭角色展厅'}).click();
    }
    assert.deepEqual(report.errors,[]);report.passed=true;
  } catch(e) {report.failure=String(e);process.exitCode=1;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
  finally {await context.close();report.video=await page.video().path();await browser.close();await fs.writeFile(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1});
