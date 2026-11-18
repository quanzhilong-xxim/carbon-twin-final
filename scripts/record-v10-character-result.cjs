/* Index observed results. A passing runtime test never supplies an art score. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/v10-explore');
const read=p=>JSON.parse(fs.readFileSync(path.join(out,p),'utf8'));
const latest=prefix=>fs.readdirSync(out).filter(n=>n.startsWith(prefix)&&fs.statSync(path.join(out,n)).isDirectory()).sort((a,b)=>Number(b.slice(prefix.length))-Number(a.slice(prefix.length)))[0];
const runtime=latest('character-v10-runtime-'),compat=latest('compat-production-'),page=latest('scroll-page-'),video=latest('experience-video-');
const detail=latest('character-detail-final-'),comparisons=latest('reference-fit-comparisons-');
const preview=process.env.CT_PREVIEW_URL||'http://127.0.0.1:3034/';
const checks={runtime:read(runtime+'/result.json'),compat:read(compat+'/result.json'),page:read(page+'/result.json'),video:read(video+'/result.json'),pose:read('pose-surface-regression.json'),protection:read('protection-and-restore.json')};
for(const [name,report]of Object.entries(checks))if(!report.passed)throw Error('Latest '+name+' evidence did not pass');
for(const name of ['runtime','page','video'])if(checks[name].base!==preview)throw Error('Evidence preview mismatch: '+name);
if(checks.compat.reports.some(r=>r.base!==preview))throw Error('Compatibility evidence preview mismatch');
if(!read(detail+'/result.json').passed||read(detail+'/result.json').base!==preview)throw Error('Detail evidence mismatch');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const assets=[];
for(const who of ['Student','Business','City'])for(const suffix of ['.blend','.glb','-portrait.glb','-lite.glb']){
 const file=`public/models/characters-v10/CT_${who}_Explore_v10${suffix}`,p=path.join(root,file);
 assets.push({file,bytes:fs.statSync(p).size,sha256:hash(p)});
}
const report={at:new Date().toISOString(),status:'RUNNABLE_VISUAL_ACCEPTANCE_PENDING',score:null,
 checkpoint:process.env.CT_CHECKPOINT_PATH||null,
 preview,onlineDeployment:'No new deployment; localhost preview only',
 git:{head:execFileSync('git',['rev-parse','--short','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
     status:'Existing tracked and untracked changes preserved; no commit/reset/stash/clean or history removal'},
 evidence:{runtime:runtime+'/result.json',compat:compat+'/result.json',page:page+'/result.json',
           video:checks.video.video,characterVideo:checks.runtime.video,
           multiView:detail+'/result.json',comparisons:comparisons+'/sources.json',
           previewScreenshot:page+'/current-home.png',fullPage:page+'/explore-visible-page.png',
           protection:'protection-and-restore.json',pose:'pose-surface-regression.json',
           build:'production-build-v10-setting-final.log',typecheck:'typecheck-setting-finish.log',lint:'lint-setting-finish.log',
           decodedVideoFrame:video+'/verified-frame-20s.png'},
 checks:{browsers:[checks.runtime.browser,...checks.compat.reports.map(r=>r.name+' '+r.version)],
         pageErrors:checks.runtime.errors,failedResources:checks.runtime.failed,apiCalls:checks.runtime.apiCalls,
         frozenFiles:checks.protection.frozenFiles,frozenChanged:checks.protection.changed,frozenMissing:checks.protection.missing,
         viewportWidths:[375,768,1440],realHardwarePhone:'not tested; browser contexts only',
         cityPlaybackWallSeconds:checks.video.playbackWallSeconds,
         firstCaptureFailure:'experience-video-1794180879897/result.json: 32-second wait timeout; retained. One bounded retry waited for full architecture and brought the recording tab forward; passed in 18.284 seconds. The initial cause was not independently established.',
         tts:'Protected bytes unchanged; no additional synthesis/playback claim in this continuation'},
 paidCalls:0,newAgents:0,assets,
 limitations:[
  'Reference fidelity is below the requested final quality: face style/likeness, hair fibre construction, garment drape, hand anatomy and environment integration still need art work.',
  'Nine useful views and real expressions are implemented, but this does not constitute V10.3 art acceptance or 98/100.',
  'Tripo UI displayed 200 credits and 55-credit highest-quality generation; export/multiview required a plan upgrade. No generation, upload or purchase was made.',
  'Tencent/Mixamo generation or external AI reviews were not performed; no fabricated independent scores.',
  'Standard character GLBs range from 3.8 to 8.0 MB; portrait tiers up to 12.8 MB. Performance was exercised on this computer, not certified on physical phones.',
  'Browser tests retain nonfatal Three.Clock deprecation notices.',
  'Current tool execution works; the historical DDShub upstream path has not been independently proven repaired.'
 ],
 changes:['Paused facial expression initializes immediately and survives standard/portrait swaps',
          'Nine GLBs export neutral morph defaults and valid material UVs',
          'Original twill maps, hand UV repair, self-shadow lighting and retained headwear fit',
          'Student cargo ease, fitted pockets, purple/cream shoes, tapered brows and swept fringe',
          'Professional groom silhouette smoothing; civic swept temple locks and bun detail',
          'Retained CC0 paving PBR, original meadow texture, curved path and instanced grass in character settings',
          'Build precheck now accepts the configured independent preview directory',
          'Editable masters retained; six entry posters rendered from the actual current GLBs'],
 next:['Refine faces/hair/cloth/hands against original 074, 078 and 080 before claiming art completion',
       'Preserve the protected systems and continue from the latest SHA256 checkpoint',
       'Repeat only affected visual/interaction checks after the next actual changes']};
fs.writeFileSync(path.join(out,'V10.3-current-result.json'),JSON.stringify(report,null,2));
const md=`# CarbonTwin V10.3 当前结果与验收边界

更新时间：${report.at}。当前状态：**可运行，美术验收尚未通过；未评分，未宣布98分或全站完成。**

预览：${preview} ，角色区：${preview}#identities 。这是本机生产构建预览，本轮没有新线上部署。3020/3030/3031/3032原服务均保留。

## 真实改动

${report.changes.map(x=>'- '+x).join('\n')}

核心运行文件：components/3d/ExploreCharacter.tsx、components/3d/CharacterSetting.tsx、lib/visuals/characterPerformance.ts、lib/visuals/characterArm.ts；scripts/check-config.mjs修正独立预览目录校验。局部模型脚本：refine-v10-fabric-surface.py、fit-v10-student-headwear.py、refine-v10-student-tailoring.py、fit-v10-student-tailoring.py、refine-v10-professional-groom.py。最终以实际GLB和网页证据为准，禁止重复运行一次性造型脚本。

## 原图设定与当前差距

| 角色 | 原图与保留设定 | 对应环境与当前未通过项 |
| --- | --- | --- |
| 学生 / 星遥 | 074：粉发、米白帽/护目镜、紫外套、浅色工装、相机与背包；活泼挥手、眨眼、看相机 | 绿色城市日光/步道；发束仍偏实体块、脸型与参考差距、衣服褶皱与手部细节不足 |
| 企业主 | 078：棕发、眼镜、深色细条纹西装、绿领带、腕表；克制致意、查看数据 | 暖色办公室/座椅/城市及建筑沙盘；头发、成熟面部气质、衬衫翻领及西装剪裁仍不够接近原图 |
| 城市管理者 / 智衡 | 080：栗色盘发、象牙白披肩长外套、深色内搭、金色边与平板；引导、查看平板 | 城市治理日光空间；肩部服装、手指握持、头发与面部精度仍需精修 |

三者共用相机/动作/生命周期代码，分别保留模型、道具、背景和动作。入口WebP由当前GLB渲染，进入后使用同一角色的真实GLB；标准、近景和移动端版本均保留。

## 运行证据

| 检查 | 结果与文件（相对 outputs/v10-explore） |
| --- | --- |
| 角色九视角、动作、眨眼、暂停、近景切换、身份持久化、移动lite模型 | 通过；${runtime}/result.json |
| Firefox 157 / WebKit 27.2 | 通过；${compat}/result.json；WebKit为测试引擎，未宣称真实iPhone Safari |
| Chrome 156，375/768/1440 | 通过；运行检查中无页面错误、丢失资源或API调用 |
| 全页1440×6418实际视口拼接 | ${page}/explore-visible-page.png；原始视口与拼接方法保留 |
| 连续粒子成城、六场景、三角色动作录屏 | ${video}/result.json；真实WebM，生长录得${checks.video.playbackWallSeconds}秒；初次32秒等待超时的原始记录保留，等待完整建筑与前置录屏标签后一次有界复验通过 |
| 暂停/LOD表情回归，九个GLB中性默认表情与UV | pose-surface-regression.json |
| 保护与恢复 | protection-and-restore.json；53文件零变化/零丢失，临时目录恢复演练通过 |
| 生产构建、类型检查、定向ESLint | 已通过；具体日志见V10.3-current-result.json。此后的修改仅涉及资产/证据脚本 |

截图与录屏对应真实本地版本；未把Blender渲染当网页截图。${comparisons}保留三角色改前/当前及原始目标/当前对照。动作和多视角通过，不能替代造型验收。

## 保护、费用与局限

Git HEAD ${report.git.head}，所有原有未提交和未跟踪成果保留；没有重置、清理、删除历史或提交。原网站服务/Blender会话保留；本续作的3033中间预览已由通过实测的3034替代并关闭。最新增量检查点：${report.checkpoint||'见LAST_SAFE_CHECKPOINT.md'}，外部manifest记录逐文件SHA256与实际备份来源；CP-00完整基线继续保留。

本续作新增收费调用为0，未启动子智能体，未新增豆包合成。Tripo可见余额200、最高质量55积分，但导出/多视图要求升级，未生成或消费。腾讯/Mixamo及外部AI独立审查未执行；不声称通过。

尚未通过：原图一致性、半写实面部、自然发丝、服装结构与褶皱、手部/道具接触、环境融合。Tripo限制仅影响该条替代路径，不能据此声称所有本地精修都被外部阻塞。模型与代码改进已经保存，但仍不满足用户最终美术标准。

本机工具通道可执行，历史DDShub 524链路未独立证实修复。没有无限重试、收费切换或凭证输出。用户学习/身份数据与豆包系统按冻结规则保留，不以本轮未调用的接口虚报测试。

继续运行已构建预览：在项目目录设置CARBONTWIN_PREVIEW_DIR=.next-v10-setting-final后，用现有Next start绑定127.0.0.1、3034端口；服务当前运行中，勿重复启动。下一步应针对上述美术未通过项继续局部精修并仅重测受影响部分。
`;
fs.writeFileSync(path.join(root,'docs/recovery/V10.3-CURRENT-RESULT.md'),md);console.log(JSON.stringify({status:report.status,evidence:report.evidence,assets:assets.length}));
