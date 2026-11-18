// FREE tests only. SDK replaced at bundling; all outbound network is denied.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'D:/PlaywrightBrowsers';
process.env.PLAYWRIGHT_SKIP_BROWSER_GC = '1';
const { chromium, firefox, webkit, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = process.env.TRYON_TEST_OUTPUT || path.join(root, 'work/tryon-safety', new Date().toISOString().replace(/[:.]/g, '-'));
if(fs.existsSync(out)) throw new Error('Use a fresh test output path');
fs.mkdirSync(out, { recursive: true });
const scratch = path.join(out, 'harness'); fs.mkdirSync(scratch);
const compiler = require('next/dist/compiled/webpack/webpack'); compiler.init();
fs.writeFileSync(path.join(scratch, 'loader.cjs'), `module.exports = source => require(${JSON.stringify(require.resolve('typescript'))}).transpileModule(source,{compilerOptions:{jsx:4,target:9,module:99,esModuleInterop:true}}).outputText;`);
fs.writeFileSync(path.join(scratch, 'sdk.js'), `export const models={realtime:name=>({name})}; export function createDecartClient(){throw Error('REAL SDK DISABLED IN FREE TESTS')}`);
fs.writeFileSync(path.join(scratch, 'app.tsx'), `import React from 'react';import {createRoot} from 'react-dom/client';import {useDecartTryOn} from '@/lib/hooks/useDecartTryOn';import {TRY_ON_GARMENTS} from '@/lib/tryon/garments';
const t=window.test;
const factory=opts=>({realtime:{connect:async(camera,o)=>{t.connects++;t.options={model:o.model.name,retries:o.retries,capacityRetryBudgetMs:o.capacityRetryBudgetMs,speed:o.speed||null};t.change=o.onConnectionChange;await opts.apiKeyProvider();t.provider=opts.apiKeyProvider;
if(t.mode==='late')await new Promise(r=>t.release=r);
if(t.mode==='error')throw Error('simulated upstream failure');
const client={disconnect(){t.disconnects++},on(name,fn){t.events[name]=fn},set:async()=>{t.updates++}};
if(t.mode!=='no-stream')o.onRemoteStream(t.mode==='same-stream'?camera:window.fakeStream('remote'));
return client;}}});
const view=createRoot(document.getElementById('root'));
function App(){const [id,select]=React.useState('tshirt');const ar=useDecartTryOn(id,factory);window.ar=ar;return <main data-status={ar.status} data-ready={ar.remoteReady} data-camera={ar.cameraReady}><h1>模拟生命周期测试 / 非 AI 试穿</h1><video ref={ar.video} muted/><video ref={ar.localVideo} muted/><p role='alert'>{ar.error}</p><p id='notice'>{ar.notice}</p><button id='preview' onClick={ar.preview}>preview</button><button id='start' onClick={()=>ar.start(t.seconds,true)}>start</button><button id='no-consent' onClick={()=>ar.start(3,false)}>no consent</button><button id='stop' onClick={ar.stop}>stop</button><button id='select' onClick={()=>select('shorts')}>select shorts</button><button id='upload' onClick={()=>ar.uploadGarment(new File(['test'],'test.png',{type:'image/png'}),'reference')}>stage upload</button><button id='bad-upload' onClick={()=>ar.uploadGarment(new File(['test'],'test.txt',{type:'text/plain'}),'reference')}>bad upload</button><button id='unmount' onClick={()=>view.unmount()}>unmount</button></main>};view.render(<React.StrictMode><App/></React.StrictMode>);`);
function init(mode){
  window.test={mode,seconds:3,connects:0,disconnects:0,updates:0,cameras:0,stopped:0,events:{},tokenFetches:0};
  window.fakeStream=label=>{const track={id:label+'-'+Math.random(),readyState:'live',addEventListener(){},stop(){this.readyState='ended';window.test.stopped++}};return {getTracks:()=>[track],getVideoTracks:()=>[track],getAudioTracks:()=>[]}};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{window.test.cameras++;if(window.test.mode==='permission')throw new DOMException('denied','NotAllowedError');return window.fakeStream('camera')}}});
  const sources=new WeakMap(),playing=new WeakMap(),starts=new WeakMap();
  Object.defineProperty(HTMLMediaElement.prototype,'srcObject',{configurable:true,get(){return sources.get(this)||null},set(s){sources.set(this,s)}});
  Object.defineProperty(HTMLMediaElement.prototype,'paused',{configurable:true,get(){return !playing.get(this)}});
  Object.defineProperty(HTMLMediaElement.prototype,'currentTime',{configurable:true,get(){return playing.get(this)?(performance.now()-(starts.get(this)||0))/1000:0}});
  HTMLMediaElement.prototype.play=function(){playing.set(this,true);starts.set(this,performance.now());queueMicrotask(()=>this.dispatchEvent(new Event('playing')));return Promise.resolve()};
  HTMLMediaElement.prototype.pause=function(){playing.set(this,false)};
}
const report={kind:'FREE / mocked SDK, camera and video playback',paidProviderRequests:0,browsers:{}};
const save=()=>fs.writeFileSync(path.join(out,'safety-results.json'),JSON.stringify(report,null,2));
(async()=>{
await new Promise((resolve,reject)=>compiler.webpack({mode:'development',target:'web',entry:path.join(scratch,'app.tsx'),devtool:false,output:{path:scratch,filename:'bundle.js'},resolve:{modules:[path.join(root,'node_modules'),'node_modules'],extensions:['.tsx','.ts','.js'],alias:{'@':root,'@decartai/sdk':path.join(scratch,'sdk.js')}},module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(scratch,'loader.cjs')}]}},(e,s)=>e||s.hasErrors()?reject(e||Error(s.toString({all:false,errors:true}))):resolve()));
const server=http.createServer((req,res)=>{
if(req.url==='/api/decart/token'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({apiKey:'test-only-credential-not-real',model:'lucy-vton-3.6',serverMaxSeconds:10}))}
if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return fs.createReadStream(path.join(scratch,'bundle.js')).pipe(res)}
if(req.url.startsWith('/garments/')){res.setHeader('Content-Type','image/png');return fs.createReadStream(path.join(root,'public/garments',path.basename(req.url))).pipe(res)}
res.setHeader('Content-Type','text/html;charset=utf-8');res.end('<meta charset="utf-8"><div id="root"></div><script src="/bundle.js"></script>')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
try{for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
const results=report.browsers[name]={checks:[],pageErrors:[],blockedOutbound:0};let browser;
const check=async(label,fn)=>{try{await fn();results.checks.push({label,status:'pass'})}catch(e){results.checks.push({label,status:'fail',error:e.message.slice(0,800)})}save();console.log(name,label,results.checks.at(-1).status)};
try{browser=await engine.launch({headless:true});results.version=browser.version();const ctx=await browser.newContext();await ctx.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():(results.blockedOutbound++,route.abort()));await ctx.routeWebSocket('**/*',ws=>{results.blockedOutbound++;ws.close()});
async function page(mode='success'){const p=await ctx.newPage();p.on('pageerror',e=>results.pageErrors.push(e.message));await p.addInitScript(init,mode);await p.goto(base);await expect(p.locator('#preview')).toBeVisible();return p}
const state=p=>p.locator('main');const start=async p=>{await p.click('#preview');await expect(state(p)).toHaveAttribute('data-camera','true');await p.click('#start')};
await check('摄像头单独预览、选衣和上传均不创建会话',async()=>{const p=await page();await p.click('#preview');await p.click('#select');await p.click('#upload');assert.equal(await p.evaluate(()=>test.connects),0);await p.close()});
await check('未勾选收费同意不申请 Token',async()=>{const p=await page();await p.click('#preview');await p.click('#no-consent');assert.equal(await p.evaluate(()=>test.connects),0);await expect(p.getByRole('alert')).toContainText('确认收费');await p.close()});
await check('双击仅一次连接；标准3.6且无重试',async()=>{const p=await page();await p.click('#preview');await p.evaluate(()=>{ar.start(3,true);ar.start(3,true)});await expect(state(p)).toHaveAttribute('data-ready','true');assert.equal(await p.evaluate(()=>test.connects),1);assert.deepEqual(await p.evaluate(()=>test.options),{model:'lucy-vton-3.6',retries:0,capacityRetryBudgetMs:0,speed:null});await p.close()});
await check('连接中停止；迟到连接必须断开且禁止新连接',async()=>{const p=await page('late');await start(p);await p.waitForFunction(()=>!!test.release);await p.click('#stop');await p.evaluate(()=>ar.start(3,true));assert.equal(await p.evaluate(()=>test.connects),1);await p.evaluate(()=>test.release());await p.waitForFunction(()=>test.disconnects===1);assert.equal(await p.evaluate(()=>ar.video.current.srcObject),null);await p.close()});
await check('3秒目标自动停止并清理远端与摄像头',async()=>{const p=await page();await start(p);await expect(state(p)).toHaveAttribute('data-status','stopped',{timeout:6000});assert.equal(await p.evaluate(()=>test.disconnects),1);assert.equal(await p.evaluate(()=>ar.video.current.srcObject),null);assert.equal(await p.evaluate(()=>ar.localVideo.current.srcObject),null);await p.close()});
await check('无远端画面也在5秒主动停止',async()=>{const p=await page('no-stream');await start(p);await expect(state(p)).toHaveAttribute('data-status','stopped',{timeout:7500});assert.equal(await p.evaluate(()=>test.disconnects),1);await p.close()});
await check('切换服装不更新云端或创建第二会话',async()=>{const p=await page();await start(p);await expect(state(p)).toHaveAttribute('data-ready','true');await p.click('#select');assert.equal(await p.evaluate(()=>test.updates),0);assert.equal(await p.evaluate(()=>test.connects),1);await p.close()});
await check('拒绝把原始摄像头流当远端AI',async()=>{const p=await page('same-stream');await start(p);await expect(state(p)).toHaveAttribute('data-status','unavailable');assert.equal(await p.evaluate(()=>ar.video.current.srcObject),null);assert.equal(await p.evaluate(()=>test.disconnects),1);await p.close()});
await check('断网清除画面，不自动重连',async()=>{const p=await page();await start(p);await expect(state(p)).toHaveAttribute('data-ready','true');await p.evaluate(()=>dispatchEvent(new Event('offline')));await expect(state(p)).toHaveAttribute('data-status','unavailable');assert.equal(await p.evaluate(()=>test.disconnects),1);assert.equal(await p.evaluate(()=>ar.video.current.srcObject),null);assert.equal(await p.evaluate(()=>test.connects),1);await p.close()});
await check('SDK重连事件立即停止且不提供第二枚凭证',async()=>{const p=await page();await start(p);await expect(state(p)).toHaveAttribute('data-ready','true');const denied=await p.evaluate(async()=>{test.change('reconnecting');try{await test.provider();return false}catch{return true}});assert.ok(denied);assert.equal(await p.evaluate(()=>test.disconnects),1);await p.close()});
await check('pagehide主动清理会话',async()=>{const p=await page();await start(p);await expect(state(p)).toHaveAttribute('data-ready','true');await p.evaluate(()=>dispatchEvent(new Event('pagehide')));assert.equal(await p.evaluate(()=>test.disconnects),1);assert.equal(await p.evaluate(()=>ar.video.current.srcObject),null);await p.close()});
await check('组件卸载主动清理会话',async()=>{const p=await page();await start(p);await expect(state(p)).toHaveAttribute('data-ready','true');await p.click('#unmount');assert.equal(await p.evaluate(()=>test.disconnects),1);await p.close()});
await check('摄像头拒绝权限不创建会话',async()=>{const p=await page('permission');await p.click('#preview');await expect(state(p)).toHaveAttribute('data-status','unavailable');assert.equal(await p.evaluate(()=>test.connects),0);await p.close()});
await check('无效上传被拒绝且不创建会话',async()=>{const p=await page();await p.click('#bad-upload');await expect(p.getByRole('alert')).toContainText('JPEG');assert.equal(await p.evaluate(()=>test.connects),0);await p.close()});
await check('SDK错误不重试、不显示旧AI帧',async()=>{const p=await page('error');await start(p);await expect(state(p)).toHaveAttribute('data-status','unavailable');assert.equal(await p.evaluate(()=>test.connects),1);assert.equal(await p.evaluate(()=>ar.video.current.srcObject),null);await p.close()});
await ctx.close();}catch(e){results.fatal=e.message.slice(0,1000)}finally{await browser?.close();save()}}
}finally{await new Promise(r=>server.close(r));save()}
if(Object.values(report.browsers).some(b=>b.fatal||b.checks.some(c=>c.status==='fail')))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
