/* Consolidate existing, verified evidence. Never turns technical passes into
 * art approval, copies secrets, publishes a website or changes Git history. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/v10-explore/V104-CURRENT-REVIEW'),doc=path.join(root,'docs/recovery/v10.4');
fs.mkdirSync(out,{recursive:true});
const rel=p=>path.relative(root,p).replaceAll('\\','/'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const ev={
 detail:'outputs/v10-explore/character-detail-final-1794201297766',runtime:'outputs/v10-explore/character-v10-runtime-1794201360057',
 compare:'outputs/v10-explore/reference-fit-comparisons-1794201297766',explore:'outputs/v10-explore/scroll-page-1794201784515',
 identity:'outputs/v10-explore/page-identities-1794201831658',academic:'outputs/v10-explore/page-learn-1794201849613',
 academicTest:'outputs/academic-archive/v104-1794201700042',journey:'outputs/v10-explore/journey-current-1794201750375',
 video:'outputs/v10-explore/experience-video-1794201873262',academicDesktop:'outputs/academic-archive/desktop-video-1794204611102',contrast:'outputs/v10-explore/contrast-1794201518711',
 webkit:'outputs/v10-explore/compat-production-1794201526106',firefoxFail:'outputs/v10-explore/firefox-stage-probe-1794200359346',
 firefoxReading:'outputs/v10-explore/firefox-reading-1794202025816',navigation:'outputs/v10-explore/navigation-1794202678204',
 voice:'outputs/v10-explore/saved-voice-1794202181061',protection:'outputs/v10-explore/protection-and-restore.json',build:'outputs/v10-explore/build-v104g-review.log'};
for(const key of ['detail','runtime','academicTest','academicDesktop','journey','video','firefoxReading','navigation','voice'])assert(read(ev[key]+'/result.json').passed,key+' evidence failed');
assert(read(ev.webkit+'/result.json').reports.every(r=>r.passed));assert(read(ev.protection).passed);
assert(read(ev.contrast+'/result.json').reports.every(r=>!r.failures.length));
const base='http://127.0.0.1:3044/';
for(const key of ['detail','runtime','academicTest','video','navigation','voice'])assert.equal(read(ev[key]+'/result.json').base,base);
const copy=(source,dest)=>{const from=path.isAbsolute(source)?source:path.join(root,source),to=path.join(out,dest);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);assert.equal(hash(from),hash(to));};
copy(ev.explore+'/explore-visible-page.png','final-explore.png');copy(ev.identity+'/identities-section.png','final-identities.png');copy(ev.academic+'/academic-visible-page.png','final-academic.png');
copy(ev.explore+'/current-home.png','home.png');copy(ev.academic+'/academic-hero.png','academic-hero.png');
for(const who of ['student','business','city']){
 copy(ev.compare+'/'+who+'-front-45-side-back.png','character-'+who+'-front-45-side-back.png');
 for(const suffix of ['target-current','before-current'])copy(ev.compare+'/'+who+'-'+suffix+'.png','before-after/'+who+'-'+suffix+'.png');
 copy(ev.detail+'/'+who+'-detail.png','details/'+who+'-detail.png');
}
copy(ev.explore+'/home-before-current.png','before-after/home-before-current.png');
copy(ev.navigation+'/identity-375.png','identity-mobile.png');
copy(ev.protection,'recovery/protection-and-restore.json');
const assets=[];
for(const who of ['Student','Business','City']){
 const sourceFile=`public/models/characters-v10/CT_${who}_Explore_v104g.sources.json`,source=read(sourceFile);source.web_bytes=fs.statSync(path.join(root,`public/models/characters-v10/CT_${who}_Explore_v104g.glb`)).size;source.current_verification={revision:'v104g',runtime:ev.runtime+'/result.json',detail:ev.detail+'/result.json',artAccepted:false,paidCalls:0};fs.writeFileSync(path.join(root,sourceFile),JSON.stringify(source,null,2));
 for(const suffix of ['.blend','.glb','-portrait.glb','-lite.glb','.sources.json']){const file=`public/models/characters-v10/CT_${who}_Explore_v104g${suffix}`,p=path.join(root,file);assets.push({id:who,file,bytes:fs.statSync(p).size,sha256:hash(p),license:source.license,source:source.source,artAccepted:false});}
}
for(const file of ['public/models/research/CT_LibraryShelf_v104.glb','public/models/research/CT_LibraryShelf_v104.blend',...['color','normal','roughness'].map(n=>'public/textures/research/library-floor-v104/'+n+'.jpg')])assets.push({file,bytes:fs.statSync(path.join(root,file)).size,sha256:hash(path.join(root,file)),license:'CC0-1.0'});
fs.writeFileSync(path.join(out,'assets.json'),JSON.stringify(assets,null,2));
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv=[['asset','format','source','license','quality','action','page','version','strategy'],...['Student','Business','City'].map(w=>[w,'blend / GLB standard portrait lite',read(`public/models/characters-v10/CT_${w}_Explore_v104g.sources.json`).source,'CC BY 4.0 + original additions','art acceptance failed; functional checks passed','measured Blender geometry/material refinement; prior versions retained','Explore and Identity','v104g candidate','same mother model; source/GLBs/posters retained']),['LibraryShelf','blend / GLB','https://polyhaven.com/a/wooden_bookshelf_worn','CC0-1.0','browser verified; visual fit partial','adapt 1K source; fit books to actual shelves','Academic Archive','v104','reused room'],['LibraryFloor','JPG color normal roughness','https://polyhaven.com/a/wooden_floor_02','CC0-1.0','source checksums verified; browser verified','owned repeating samplers; dispose clones','Academic Archive','v104','1K maps; no new dependency'],['Globe land','PNG','Natural Earth land GeoJSON','Public domain','illustrative geography; not emissions data','retain original adaptation','Academic Archive','existing','license in docs/academic-ai-assets/LICENSES.md'],['Evidence illustrations','SVG code','CarbonTwin original','Project code','six distinct subjects; not official covers','original diagrams','Academic Archive','v104','reusable accessible SVG'],['Fabric structure','Three geometry','CarbonTwin original','Project code','illustrative weave; not microscopy','merged real yarn geometry','Academic Archive','v104','four materials; three draw groups']];
fs.writeFileSync(path.join(doc,'asset-register.csv'),csv.map(row=>row.map(quote).join(',')).join('\n')+'\n');
const text=fs.readFileSync(path.join(doc,'instruction-v104.md'),'utf8').split('## 17｜')[1].split('## 18｜')[0];
const items=[...text.matchAll(/^(\d+)\. \[ \] (.+)$/gm)].map(m=>({id:Number(m[1]),requirement:m[2].trim(),status:'pending',note:'Not independently verified.',evidence:[]}));assert.equal(items.length,100);
const mark=(ids,status,note,evidence)=>{for(const id of ids){const item=items.find(x=>x.id===id);assert(item);Object.assign(item,{status,note,evidence})}};
const refs=['docs/recovery/v10.4/reference-map.md'];
mark([1,3,4],'pass','Original role targets and 25 archive images classified. Exact Academic (2) ZIP was absent; available Academic ZIP contains 11 entries.',refs);
mark([2],'pending','Two latest runtime photos were not uniquely identified; never treated as ideal references.',refs);
mark([5],'partial','V10.4 priority and V10.1/V10.3 protection mapped; not every historical V10.2 clause independently re-audited.',refs);
mark([6,7,8,9,10],'pass','Actual project, Git/process baseline, verified external increments, asset hashes and scratch-only restoration. No live restore, reset, clean or history deletion.',[ev.protection,'docs/recovery/v10.4/baseline.json','assets.json']);
mark([11,12,14,15,16,18,20],'partial','Recognizable Student design and actual geometry improved; facial acting, hair construction, coat drape and backpack integration remain below target.',[ev.detail+'/student-detail.png',ev.detail+'/student-front.png',ev.compare+'/student-target-current.png']);
mark([13,17,19],'pass','Actual eyelid/iris structures, camera and straps, curved layered deck/trucks/four wheels present in editable and exported geometry; this is a structural pass, not full art approval.',[ev.detail+'/student-detail.png',ev.detail+'/student-prop.png','scripts/sculpt-characters-v104.py']);
mark([21,22,24,26,27,29,30],'partial','Business face still doll-like and shoulder/collar tailoring remains simplified. G fixes rear hair knot and some shoulder gaps; complete target fidelity not achieved.',[ev.detail+'/business-detail.png',ev.detail+'/business-outfit.png',ev.compare+'/business-target-current.png','docs/recovery/v10.4/shoulder-neck-fit-g.json']);
mark([23,25,28],'partial','Spectacle rims, restrained optical surface, cloth texture and wristwatch exist; optical/reflection and fabric detail are not yet reference-level.',[ev.detail+'/business-detail.png',ev.detail+'/business-hands.png',ev.detail+'/business-prop.png']);
mark([31,32,33,34,35,38,39],'fail','City remains below the requested art gate: helmet-like groom, simplified shoulder cape, flat fingers and tablet support. Collar repair does not resolve these.',[ev.detail+'/city-detail.png',ev.detail+'/city-hands.png',ev.detail+'/city-front.png',ev.compare+'/city-target-current.png']);
mark([36,37,40],'pass','Distinct cloth/skin/metal/glass materials, solid tablet edge and separate governance setting are actually present.',[ev.detail+'/city-prop.png',ev.detail+'/city-front.png']);
mark([41,42,43,45,50],'partial','Skin normals and optics improved; full face anatomy and five-finger/prop contact quality are not accepted. Multiview loading does not establish beauty.',[ev.detail+'/result.json',ev.runtime+'/result.json',ev.compare+'/sources.json']);
mark([44,46,47,48,49],'pass','Actual controllable blink/gaze/smile, articulated gestures, pause and LOD pose continuity tested and recorded. Naturalness remains subject to art review.',[ev.runtime+'/result.json','outputs/v10-explore/pose-surface-regression.json']);
mark([51,52,55,56,57,58,59,60],'pass','Both entry forms resolve the same G asset registry, with distinct role settings. Real views, touch/lite, selection/pause and retained contact shadows recorded.',[ev.runtime+'/result.json',ev.identity+'/identities-section.png','lib/visuals/exploreCharacterAssets.ts']);
mark([53,54],'partial','Faces unobscured and full bodies visible, but card-scale face detail does not match target quality.',[ev.identity+'/identities-section.png',ev.journey+'/05-roles-1440.png']);
mark([61,62,68],'pass','Single navigation and actual keyboard/filtered archive search verified. No separate global-search component was found. Six distinct scenes each have three observations.',[ev.journey+'/result.json',ev.navigation+'/result.json',ev.academicTest+'/result.json']);
mark([63,64,65,66,67,69,70],'partial','Actual surface sampled particle stages, 25 buildings/7 types, roads, trees, citizens and reversible story exist and Chrome playback is recorded. About 31 FPS on this machine; geometry/material realism remains a visual limitation.',[ev.video+'/result.json','outputs/v10-explore/formation-stability-chrome-1794194899554/result.json']);
mark([71,72],'partial','CC0 wooden shelves/floor, globe texture/supports and actual room are integrated. The room remains simpler than the target concept.',[ev.academicTest+'/hero-desktop.png','docs/recovery/v10.4/bookshelf-export.json','docs/recovery/v10.4/floor-source-manifest.json']);
mark([73,74,76,77,78,79,80],'pass','Actual book pull-out opens IPCC evidence; Scope teaching, three garment views, nine lifecycle stages, four archive paths, six original subject diagrams, normalized search/bookmarks/related reading/local records tested.',[ev.academicTest+'/result.json']);
mark([75],'partial','Actual garment model, woven-yarn geometry and controls work; garment/cuff/fold realism remains below target.',[ev.academicTest+'/garment-study.png','components/3d/FabricStructure.tsx']);
mark([81,83,84,90],'pass','Blender edited independent masters and GLBs; third-party material sources/licenses recorded. V10.4 paid requests zero, no new agents, purchases or exposed credentials. Unknown balances prevented paid generation.',['assets.json','usage-and-licenses.md','docs/recovery/v10.4/tool-decisions.md']);
mark([82],'partial','Tripo previous 200 credits/export upgrade gating recorded; current balance not reverified. Tencent public page logged out. No supported account export rights proved.', ['docs/recovery/v10.4/tool-decisions.md']);
mark([85],'partial','Three exact Opus prompts analyzed with adopt/reject decisions. Skillry page availability checked; three comparative videos were not visually reviewed.', ['docs/recovery/v10.4/tool-decisions.md']);
mark([86],'partial','50 resources indexed; selected exact official docs and actual adopted Poly Haven licenses checked. Unreviewed resources retain pending status.', ['docs/academic-ai-assets/REFERENCE_CATALOG.md','docs/recovery/v10.4/reference-pages/consulted.json']);
mark([87],'partial','Standard/portrait/lite sizes and real browser LOD tested. WebP textures already exported; no new Draco/KTX2 path certified. Some lite assets remain multi-megabyte.', ['assets.json',ev.runtime+'/result.json']);
mark([88],'partial','Shared scene ownership, instance geometry/skeleton cleanup and context restore tested previously. No exhaustive long-duration memory-leak certification.', ['components/3d/SceneStage.tsx','lib/visuals/characterArm.ts',ev.runtime+'/result.json']);
mark([89],'pass','375/768/1440 layouts, real lite characters and reduced-motion Academic fallback tested. Physical handset performance was not tested.', [ev.runtime+'/result.json',ev.navigation+'/result.json',ev.academicTest+'/result.json']);
mark([91],'pass','All three G roles have nine camera-view captures and actual gesture/blink/pause video.', [ev.detail+'/result.json',ev.runtime+'/result.json']);
mark([92],'partial','Unretouched target/before/current and matched browser multiviews provided. Concept perspectives are not pixel-equivalent runtime views.', [ev.compare+'/sources.json',ev.explore+'/home-before-current.png']);
mark([93],'pass','Chrome records actual AMD D3D11 renderer and measured render sample. Masked WebKit/Firefox renderer names are not treated as proof of physical hardware.',[ev.video+'/result.json',ev.academicTest+'/result.json']);
mark([94],'partial','Chrome and WebKit tested paths pass. Visible Firefox 157 GPU rendering and input stall; headless reduced-motion reading passes. Full Firefox desktop compatibility not accepted.',[ev.webkit+'/result.json',ev.firefoxFail+'/result.json',ev.firefoxReading+'/result.json']);
mark([95],'pass','Production build completed compilation, lint/type validation and all 19 generated routes. Existing localStorage/Three.Clock warnings retained.',[ev.build]);
mark([96],'partial','Search/identity/bookmarks/Scope and saved genuine TTS replay passed on current page in Chromium/Firefox. No new synthesis; no human loudspeaker audition; bundled WebKit has no native WebAudio.',[ev.voice+'/result.json',ev.academicTest+'/result.json','outputs/v10-explore/tts-local-browser-v104-retest.log']);
mark([97],'pass','Verified source/model backup and copied evidence SHA256 manifests are included; CP-00 and historical increments retained.',[ev.protection,'recovery/']);
mark([98],'fail','No final numerical score. Character face/hair/hands fail mandatory art gates; 98/100 has not been achieved or claimed.',[ev.compare+'/sources.json','qa.json']);
mark([99],'partial','Adopted resources and zero spend documented. Some requested reference/third-party account rights remain unverified; no inference of universal permission.', ['usage-and-licenses.md','docs/academic-ai-assets/REFERENCE_CATALOG.md']);
mark([100],'partial','The evidence is truthful and raw failures/originals are retained, but this is a runnable checkpoint, not the final art product requested. Final-product delivery remains incomplete.', ['README.md','qa.json']);
const runtime=read(ev.runtime+'/result.json'),video=read(ev.video+'/result.json'),academic=read(ev.academicTest+'/result.json');
const report={at:new Date().toISOString(),status:'RUNNABLE_CHECKPOINT_ART_ACCEPTANCE_FAILED',finalScore:null,finalAccepted:false,preview:base,onlineDeployment:'No V10.4 deployment. Local candidate only; stable default revision remains v10.',timebox:{receivedAt:read('docs/recovery/v10.4/baseline.json').receivedAt,hours:24,unattendedContinuation:false},assetVersion:'v104g',evidence:ev,environment:{chrome:runtime.browser,webkit:read(ev.webkit+'/result.json').reports[0].version,firefox:read(ev.firefoxReading+'/result.json').browser,physicalPhoneTested:false},performance:{city:{wallPlaybackSeconds:video.playbackWallSeconds,canvasSample:video.playbackState.canvas},library:academic.checks[0].detail},accounting:{paidGenerationCalls:0,newTtsSynthesisCalls:0,savedGenuineVoiceReplays:2,newAgents:0,credentialExports:0},protection:read(ev.protection),summary:items.reduce((a,x)=>(a[x.status]=(a[x.status]||0)+1,a),{}),checks:items,checkpoint:null,limitations:['Three role art fidelity remains below original targets; geometry/material/detail repair is incomplete.','Firefox visible-window rendering/input stalled. Headless reading fallback is a separate limited pass.','Skillry video comparison, some reference resources and paid export rights remain unverified.','No new online deployment, physical-phone test or human voice audition.'],nextSuccessfulCheckpoint:'G exported models, production build and current Chrome/WebKit evidence; do not rerun completed one-shot sculpt scripts.'};
fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(doc,'qa.json'),JSON.stringify(report,null,2));
const start=read('docs/recovery/v10.4/baseline.json'),baseline=JSON.parse(fs.readFileSync(path.join(start.checkpoint,'manifest.json'),'utf8'));
const old=new Map(baseline.files.map(x=>[x.file,x.sha256]));
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','ignore']});
const list=git('ls-files','-co','--exclude-standard','-z').split('\0').filter(Boolean),changes=[];
for(const file of new Set(list)){if(!/^(app|components|lib|scripts|docs\/(recovery|academic-ai-assets)|public\/(models\/(characters-v10|research)|media\/explore-v10|textures\/research))\//.test(file))continue;const p=path.join(root,file);if(!fs.existsSync(p)||!fs.statSync(p).isFile())continue;const sha256=hash(p);if(old.get(file)!==sha256)changes.push({file,change:old.has(file)?'modified since V10.4 baseline':'new or absent from scoped baseline',bytes:fs.statSync(p).size,sha256});}
fs.writeFileSync(path.join(out,'recovery/changed-files.json'),JSON.stringify({at:new Date().toISOString(),baseline:start.checkpoint,scope:'Selected source and assets, not all historical Git changes. A file absent from baseline is not proof it was newly authored this turn.',files:changes},null,2));
fs.writeFileSync(path.join(out,'recovery/git-status.txt'),git('status','--porcelain=v1','-uall'));fs.writeFileSync(path.join(out,'recovery/git-head.txt'),git('rev-parse','HEAD'));
const originalTts='C:/Users/23242/Documents/Codex/2026-11-07/ni/outputs/v7/tts';
copy(path.join(originalTts,'extra-real-playback.json'),'evidence/original-voice-authorization-result.json');copy(ev.voice+'/result.json','evidence/current-saved-voice-replay.json');
const desktop=read(ev.academicDesktop+'/result.json');
copy(ev.academicDesktop+'/result.json','evidence/academic-desktop-recording.json');
const videos=[{name:'explore',file:video.video},{name:'characters',file:runtime.video},{name:'academic-desktop',file:desktop.video}];fs.writeFileSync(path.join(out,'video-sources.json'),JSON.stringify({method:'Consecutive actual browser recordings, padded to common size and concatenated; raw source videos remain unmodified. No synthetic frames, speed-up or invented interactions. Fixed-desktop Academic recording replaces the responsive-test recording in the presentation; the latter remains retained.',sources:videos.map(x=>({...x,sha256:hash(x.file)}))},null,2));
const licenses=fs.readFileSync(path.join(doc,'usage-and-licenses.md'),'utf8');fs.writeFileSync(path.join(out,'usage-and-licenses.md'),licenses);
const md=`# CarbonTwin V10.4 可运行检查点

状态：**美术终验未通过；没有评分，没有宣称98分或全站完成。** 文件名 final-* 按要求命名，表示本次取证版本，不代表最终美术通过。

本机预览：${base}；身份：${base}#identities；学术档案：${base}learn。V10.4 未线上部署，稳定默认模型仍为v10，候选构建显式使用v104g。

已落实：三角色独立Blender源文件与标准/近景/轻量GLB；脸/眉眼/材质、粉发/低发髻、袖子/口袋/滑板和肩领局部精修；两处角色入口共享母体。学术档案使用CC0实体木书架、木地板、带真实地理纹理的地球仪，以及抽书、Scope教学、四路径检索/收藏、服装三视角/九生命周期/四材料。保留现有城市、建筑和行为沙盘。

真实验证：Chrome156、WebKit27.2所测路径通过；375/768/1440布局；角色眨眼/动作/暂停/身份/LOD通过；学术档案7组交互通过；本机城市播放${video.playbackWallSeconds}s，采样31FPS，图书馆61draw calls/57,604triangles。Firefox157可见窗口渲染和点击超时，headless减弱动效阅读另行通过，**不能称三浏览器全部通过**。字幕/不透明CSS表面的438项对比度检查无失败；图像/渐变/透明组合不在该算法覆盖内。

语音：当前试听页复用此前获授权的14字真实豆包音频，在Chromium/Firefox中完成原播放器播放，PCM哈希一致。本轮新合成0次，未新增费用；WebKit运行时缺WebAudio，人工听感未确认。

尚未完成：三人脸型神态、头发层次、衣料垂坠和手指/平板接触仍低于目标；学术档案空间和织物细节仍需美术精修；三项Skillry视觉对照及部分参考/平台权限未查证。100项逐项状态见qa.json，技术通过不抵消美术失败。

图片：final-explore.png、final-identities.png、final-academic.png是实际视口截图/拼接，原始视口与方法保留于video-sources及qa证据目录。before-after保留未修图的目标/旧图/当前图。walkthrough.webm由真实探索、人物和学术档案录像顺序拼接，原视频路径和SHA256见video-sources.json。

恢复：53个冻结文件未变化/未丢失；恢复演练只在外部临时目录进行。最新外部备份见recovery/checkpoint.json，历史CP-00/全部旧模型保留。Git保留原工作区及历史，未reset/clean/stash/提交；changed-files列出与V10.4基线比较的范围。

服务当前运行，勿重复启动。若需手工恢复预览，在原工程设置 CARBONTWIN_PREVIEW_DIR=.next-v104g-review 和 NEXT_PUBLIC_CT_CHARACTER_REVISION=v104g，使用现有 next start -H 127.0.0.1 -p 3044。不要覆盖原3020服务，不要在旧模型源上反复运行一次性雕刻脚本。
`;
fs.writeFileSync(path.join(out,'README.md'),md);console.log(JSON.stringify({out,checks:items.length,status:report.status,summary:report.summary,assets:assets.length,changedFiles:changes.length,videos}));
