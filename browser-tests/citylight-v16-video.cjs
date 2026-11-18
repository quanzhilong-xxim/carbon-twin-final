// Uncut recording of the actual local WebGL canvas. No audio/provider requests.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawnSync}=require('child_process');
const {chromium,expect}=require('@playwright/test');const out=process.env.CITYLIGHT_OUTPUT;
if(!out||fs.existsSync(path.join(out,'operation.webm')))throw Error('Use a fresh output folder');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=d3d11','--enable-gpu']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1,serviceWorkers:'block'}),blocked=[];
  await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin==='http://127.0.0.1:3020'&&!u.pathname.startsWith('/api/')&&r.request().method()==='GET'?r.continue():(blocked.push(u.pathname),r.abort('blockedbyclient'))});
  const page=await context.newPage();await page.goto('http://127.0.0.1:3020/citylight/tower-study',{waitUntil:'domcontentloaded'});
  const view=page.locator('.citylight-viewport'),canvas=view.locator('canvas'),controls=page.locator('.citylight-controls');
  await expect(view).toHaveAttribute('data-ready','true',{timeout:60000});await view.scrollIntoViewIfNeeded();
  const initial=await canvas.evaluate(el=>({...el.dataset,width:el.width,height:el.height}));
  const mime=await canvas.evaluate(el=>{
   const stream=el.captureStream(25),type=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!type)throw Error('No supported recorder');
   const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:4500000}),chunks=[];
   window.__towerVideo={recorder,stream,chunks,start:performance.now()};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start(100);return type;
  });
  const marks=[],poses=[];const mark=async text=>marks.push({elapsedMs:await page.evaluate(()=>performance.now()-window.__towerVideo.start),text,camera:await canvas.getAttribute('data-camera')});
  await mark('V16真实白模；没有玻璃与内装完成声明');await page.waitForTimeout(1200);
  const box=await canvas.boundingBox(),y=box.y+box.height*.45,x=box.x+box.width*.85;
  await mark('真实鼠标Orbit环绕，保持同一GLB');await page.mouse.move(x,y);await page.mouse.down();
  for(let i=0;i<=180;i++){await page.mouse.move(x-box.height*i/180,y);await page.waitForTimeout(30);if(i%3===0)poses.push((await canvas.getAttribute('data-camera')).split(',').map(Number))}
  await page.mouse.up();await page.waitForTimeout(700);
  await mark('固定屋顶机位检查冠环与天线，不是连续步行');await controls.getByRole('button',{name:'屋顶',exact:true}).click();await view.scrollIntoViewIfNeeded();await page.waitForTimeout(1300);
  await mark('固定1.6m入口机位；只是结构空腔，没有合格内装');await controls.getByRole('button',{name:'人眼1.6m',exact:true}).click();await view.scrollIntoViewIfNeeded();await page.waitForTimeout(1800);
  await mark('Esc恢复真实正面坐标');await page.keyboard.press('Escape');await page.waitForTimeout(2000);
  const final=await canvas.evaluate(el=>({...el.dataset}));await mark('正面停留后结束；不是完整城市或WALK证据');
  const encoded=await page.evaluate(async()=>{
   const s=window.__towerVideo;await new Promise(resolve=>{s.recorder.onstop=resolve;s.recorder.stop()});s.stream.getTracks().forEach(t=>t.stop());
   return await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(s.chunks,{type:s.recorder.mimeType}))});
  });
  fs.writeFileSync(path.join(out,'operation.webm'),Buffer.from(encoded,'base64'));await canvas.screenshot({path:path.join(out,'last-frame.png')});
  let radians=0;for(let i=1;i<poses.length;i++){const d=Math.atan2(poses[i][0],poses[i][2])-Math.atan2(poses[i-1][0],poses[i-1][2]);radians+=Math.atan2(Math.sin(d),Math.cos(d))}
  const log={at:new Date().toISOString(),source:'Actual live WebGL canvas.captureStream; no edits; MP4 is a codec conversion only',mime,initial,final,marks,poses,orbitDegrees:radians*180/Math.PI,blocked,scope:'First-tower opaque geometry study only; fixed-view jumps are labelled; no completed city, WALK, TTS or glass claim',modelSHA256:crypto.createHash('sha256').update(fs.readFileSync('public/models/citylight/v16-study/r3/crystal.glb')).digest('hex'),codeSHA256:crypto.createHash('sha256').update(fs.readFileSync('components/3d/CitylightTowerStudy.tsx')).digest('hex')};
  fs.writeFileSync(path.join(out,'recording.json'),JSON.stringify(log,null,2));
  const stamp=ms=>{const n=Math.floor(ms/1000),m=Math.floor(n/60);return '00:'+String(m).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+'.'+String(Math.floor(ms%1000)).padStart(3,'0')};
  fs.writeFileSync(path.join(out,'operation.vtt'),'WEBVTT\n\n'+marks.slice(0,-1).map((m,i)=>stamp(m.elapsedMs)+' --> '+stamp(marks[i+1].elapsedMs)+'\n'+m.text+'\n').join('\n'));
  const exe=path.join(process.cwd(),'node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
  const result=spawnSync(exe,['-y','-i',path.join(out,'operation.webm'),'-vf','fps=25,scale=trunc(iw/2)*2:trunc(ih/2)*2','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart','-an',path.join(out,'operation.mp4')],{encoding:'utf8',windowsHide:true});
  fs.writeFileSync(path.join(out,'transcode.log'),result.stderr||'');if(result.status!==0)throw Error('MP4 conversion failed: see retained log');
  const decode=spawnSync(exe,['-v','error','-i',path.join(out,'operation.mp4'),'-f','null','-'],{encoding:'utf8',windowsHide:true});
  fs.writeFileSync(path.join(out,'decode.log'),decode.stderr||'');if(decode.status!==0)throw Error('Complete MP4 decode failed');
  console.log(JSON.stringify({video:path.join(out,'operation.mp4'),orbitDegrees:log.orbitDegrees,completeFFmpegDecode:true,modelSHA256:log.modelSHA256}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

