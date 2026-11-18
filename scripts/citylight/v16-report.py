"""Write factual V16 stage records from real output, not synthetic PASS labels."""
from pathlib import Path
import json,hashlib,csv,subprocess
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[2];D=R/'docs/citylight/v16'
O=Path('C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v16')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
study=json.loads((O/'matrix-r4/study.json').read_text())
resilience=json.loads((O/'resilience-r1/resilience.json').read_text())
assets=json.loads((R/'public/models/citylight/v16-study/r3/manifest.json').read_text())
rows=[]
for name,data in study['browsers'].items():
 sample=next(x for x in data['performance'] if x['id']=='crystal-neutral-clay')
 old=next(x for x in data['performance'] if x['id']=='baseline-neutral-clay')
 recovery=resilience['browsers'][name]
 rows.append(f"| {name} | {old['fps']:.2f} | {sample['fps']:.2f} | {sample['p50']:.2f}/{sample['p95']:.2f}/{sample['p99']:.2f} | {sum(x['pass'] for x in data['checks'])}/{len(data['checks'])} | {sum(x['pass'] for x in recovery['checks'])}/{len(recovery['checks'])} |")
report="""# V16 首塔整改阶段报告：FAILED_GATE / REWORKING

当前是可核验的阶段断点，不是最终成品交付，也不申请正式美术验收。
用户对旧实物约35–40分、概念约70分保持不变；未制作第二栋、未批量造城。

## 实际修改与成果

1. 全文读取用户V16，包括500项A、200项B、200项C、50项U。950项原文要求导入 REQUIREMENTS.json，未批量标PASS。
2. 保存415个既有文件的SHA及隔离备份；原GLB/TTS/入口/源码4文件执行隔离恢复演练。没有复制.env。
3. 在原仓库新增两个首塔体量研究候选。A连续收分切角，B两级退台；两者是第一栋的设计对照，不是两栋正式建筑。
4. 生成真实.blend和GLB。R3 A为39,000三角、2,381,916字节、21个渲染组；保留约1,201个源构件，按入口/楼板/外壳/冠部等集合维护。
5. 首轮实渲发现开放楼层缝、平钝屋顶、细梃碎线。R3闭合楼层边带、增加斜肩与真实内退设备层、补冠部盖板和设备入口体块。仍不足以正式放行。
6. 在原项目新增 /citylight/tower-study；复用现有R3F、Three、GLTF与WindowsWebKit绘图缓冲策略。提供七视角＋低机位、A/B/旧塔/R2对照、法线/剪影/拆壳、真实点击ID、手动暂停与恢复。
7. 修复本轮新增交互的重复当前候选卡加载问题。缺模型404时显示中文错误，移除旧画面，手动重试清理失败GLTF缓存。
8. 录制实际WebGL画布，约351.22°Orbit、屋顶、人眼1.6m、Esc返回。无剪切；固定机位跳转标注，不声称完整360°或WALK。MP4完整解码已成功。
9. 沿用 /citylight/review 作为中文证据入口，保留V13/V14所有历史。过程页有真实前后原图、三浏览器七视角、光照研究、录屏、扣分与失败，不把研究包装成成品。

## 真实浏览器与性能

固定1440×1100、DPR1、45°FOV、中性斜光、无Bloom、不透明白模，3秒页面rAF采样含长帧。
帧样本不是GPU计时。旧塔也以同一白模材质重载，不能与旧报告的玻璃FPS直接比较。

| 浏览器 | 旧塔同条件FPS | A/R3 FPS | p50/p95/p99 ms | 真实工作台检查 | 404/恢复/旧路由检查 |
|---|---:|---:|---|---|---|
"""+'\n'.join(rows)+"""

所有工作台技术检查114/114；故障与路由检查48/48。仅说明这些测试断言成立，不计入美术分。
五次重建后每次几何22、纹理3，计数稳定；没有长时间系统显存证明，不能声称不存在任何泄漏。
原 /citylight/studio、/citylight/material-lab、/tts-audition、首页在三浏览器实际加载；TTS/Decart真实服务均未调用。
测试拦截所有/api和外部请求，auth/session与auth/_log因此出现预期blocked日志；不把这些日志说成已修复接口。没有为消除日志改业务。

GPU核实：Windows本机列出AMD Radeon集显与RTX4070 Laptop独显。Chromium实际标AMD D3D11；
Firefox报告含“R9…or similar”，WebKit报告“Apple GPU”，均可能是隐私/兼容字符串，不能当物理GPU证据。
不证明WebKit使用苹果硬件，不承诺普通设备最终玻璃塔60FPS。

## 构建、导出、安全

TypeScript与新增TSX的ESLint实际通过。隔离Next生产构建通过；没有拷贝凭证，没有继承供应商环境变量，
使用已有网络保护脚本，只允许有界Google字体和本地非API。没有停止/重启3020或碰其构建目录。
R3两份GLB Validator均0 errors / 0 warnings（A17、B15条未使用UV等信息保留）。这不证明美术合格。

## 视觉评分与依赖锁

冻结V16权重。A概念79/100（门槛90）；B概念68/100，拒绝作主方向。
A研究几何65/100（门槛98）。作者审查不能代替独立审美审核。SCORING.json含逐项扣分与模型哈希。
H98/E98/A98均NOT_READY；完整城市C98、八幕X98均NOT_READY。
正式幕墙、家具装配、最终六时段以及第二栋都未解锁，不因测试通过而放行。

最严重缺陷：轮廓仍偏规则棱柱；塔肩/冠环关系尚弱；侧背缺后勤设计；大堂只是结构空腔；
屋顶维护通路不完整；正式玻璃/邻楼反射未做；办公家具未独立签收；六时段只是受光方向测试；
树车人无合格母版；远景细梃锯齿和手机真机仍未验证。

## 未解决与下一次实际动作

下一项应继续当前W02/W03：以剖面和平面改善斜肩、设备层、侧背服务与屋顶可达性，
修复几何后重新拍固定八机位，概念未过90、几何未过98不铺正式玻璃。
V14单点探针邻楼反射辨识度不足、WebKit物理透射近景约22FPS是历史未解，不因本轮白模约40FPS而宣称解决。
真正的六时段连续WorldClock、第一人称碰撞、完整故事和手机访问尚未通过。
独立审查者和实际手机未具备，明确UNVERIFIED；没有假称已调用DeepSeek、已观看视频或独立评委认可。

## 费用与保护

本阶段真实收费 API 调用：0 次；已知新增 AI 推理费用：0。
没有查询余额、调用TTS/Decart/OpenAI/DeepSeek API、购买资产、安装依赖、修改密钥或更新Netlify。
未获得完整账户账单，不以本次记录证明全部第三方服务费用为零。
原未提交代码全部保留；V12/V14资产和失败记录没有删除。新增文件与受控入口变更见protection.json与变更清单。

## 查看

本机 http://127.0.0.1:3020/citylight/review
真实研究模型 http://127.0.0.1:3020/citylight/tower-study
同局域网候选地址 http://10.135.82.231:3020/citylight-review-v16/index.html
手机真实设备：UNVERIFIED；HTTP200不能替代手机验收。
离线包是透明过程证据，不是正式首塔成品包。用户未确认前绝不标记整个项目完成。
"""
if (O/'review-tests-r3/review-tests.json').exists():
 ui=json.loads((O/'review-tests-r3/review-tests.json').read_text())
 media=json.loads((O/'review-tests-r3/media-tests.json').read_text())
 report+='\n## 本轮收尾实测（最终代码）\n\n'
 for n,v in ui['browsers'].items():
  report+=f"- {n}：中文证据页 {sum(x['pass'] for x in v['checks'])}/{len(v['checks'])}。\n"
 for n,v in media['browsers'].items():
  report+=f"- {n}：视频检查 {sum(x['pass'] for x in v['checks'])}/{len(v['checks'])}；实际元数据 {json.dumps(v.get('metadata'),ensure_ascii=False)}。\n"
 report+='\nWindows WebKit视频固有尺寸严格断言失败（实际报告1002×760，编码998×758）；保留失败并提供逐图回退，不标媒体全通过。Chromium与Firefox原尺寸与完整播放通过。\n'
 report+='最终代码另行完成TypeScript、ESLint与隔离Next生产构建，build-final-r3/build.json记录exitCode=0；不是此前快照的旧构建成绩。\n'
 report+='414/415既有检查点文件原哈希不变，唯一变更是中文证据入口从V14转到V16；旧页面、旧模型和原业务保留。\n'
 report+='新增报告数据本地脚本，离线打开时无需fetch JSON；真实手机未验证。离线包不包含完整网站运行环境。\n'
 report+='收尾R2暴露懒加载图片没有预留高度，离线Firefox/WebKit原图按钮不可点击；为相册补实际截图比例占位后复测。Chromium测试错误地把PNG宽度当视频宽度，现读取真实PNG IHDR严格核对，原失败保留。\n'
(D/'STAGE_REPORT.md').write_text(report,encoding='utf8');(O/'阶段报告_未通过.md').write_text(report,encoding='utf8')
(D/'SCORING.md').write_text("""# V16 扣分与差距
原实物的用户35–40分评价不更改。以下仅为新研究候选作者评分，不是用户重新评价。
A概念79：轮廓20/25、可建模21/25、五视角18/20、创新10/15、光照内装潜力10/15。
B概念68：轮廓14/25、可建模19/25、五视角18/20、创新8/15、潜力9/15；不采用作主方向。
A几何65：轮廓17/22、结构11/20、完整13/20、细节7/18、尺度8/10、实物证据9/10。
独立审美盲审未实施。没有98分。所有依赖正式生产保持锁定。

## 前后对照的具体结论
R2→R3楼层缝闭合、顶部斜切、设备层有实际深度属于可见改善。
但玻璃仍没有真实材质，门厅仍空，侧背回应仍弱。截图不支持提高原塔整体分数。
不能因GLB 0错误、162/162技术检查或约40–149 FPS而给美术加分。
""",encoding='utf8')
(D/'FAILURES.md').write_text("""# 真实失败保留
1. 初版 build-v16-tower-study.py 缺v12-lobby-glass材质，KeyError，未生成有效模型。原失败源在V16检查点，输出failures/initial-study.json。
2. R2第一次真实网页点击当前A时setReady(false)但候选未变化，Effect不重跑导致卡加载。visual-r2/study.json保留。仅在目标变化时设置等待，修复后重复点击回归通过。
3. R2b Esc断言使用浮点精确相等，把66.00000000000001视为失败。改用已有相机验证的1mm容差，未改相机状态或删断言。失败保留visual-r2b。
4. R2楼板上沿与外壳下沿存在开放缝：实际近景可见天空，R3按连续高度闭合。R2 GLB与截图保留。
5. R2平顶与冠部结构薄弱：R3斜肩/机电层/盖板有改善，但仍未>=98。
6. V14玻璃反射辨识度不足、物理透射慢、WebKit视频尺寸异常继续保留；本轮白模不抵消旧失败。
7. 证据页收尾R2离线Firefox/WebKit相册懒加载无预留高度，按钮不可点；新增相册图片比例占位。Chromium离线图像断言误将视频998宽当作PNG1000宽，改为实际PNG头核对；review-tests-r2保留完整失败。
8. 本轮MP4真实编码998×758，Chromium/Firefox完整播放与固有尺寸通过；WindowsWebKit播放至ended但报告1002×760，严格尺寸失败保留，不伪造媒体全通过。
""",encoding='utf8')
(D/'RUN_STATE.md').write_text("""# V16 可接管断点
仓库 C:/Users/23242/Desktop/CarbonTwin_App，分支 citylight/v13-evidence。
当前原HEAD 7aff20a198991db9694e32d86d2f972943ca128f，大量用户未提交变更仍在，不能用HEAD替代实际快照。
入口 /citylight/tower-study 与 /citylight/review，沿用3020既有服务，不停止或重启。
当前R3候选模型哈希见 public/models/citylight/v16-study/r3/manifest.json；代码哈希见 matrix-r4/study.json。
当前阶段 W02/W03 REWORKING，概念79<90、几何65<98。首塔FAILED_GATE，第二栋NOT_STARTED且锁定。
950条原文要求见REQUIREMENTS.json，100执行子任务见TASKS.json，均无批量自动通过。
下一动作：只修A的斜肩/冠环、侧背与维护逻辑，在新revision导出；不得覆盖r2/r3，不正式生产材料。
浏览器路径 D:/PlaywrightBrowsers，复用已有依赖。测试脚本必须全阻止/api与外部请求。
复现：node browser-tests/citylight-v16-study.cjs（设置新的CITYLIGHT_OUTPUT和PLAYWRIGHT_BROWSERS_PATH）。
故障/路由：node browser-tests/citylight-v16-resilience.cjs。构建：node scripts/citylight/v16-build.cjs（新输出路径）。
生成模型：Blender4.5.9 -b --python-exit-code 1 --python scripts/citylight/build-v16-massing.py -- --revision NEW（不要覆旧版）。
脚本旧build-v16-tower-study.py是失败草稿，不再执行；新入口是build-v16-massing.py。
不调用收费API、不读取/修改密钥、不生产部署；手机与独立审查仍未验证。
""",encoding='utf8')
with (D/'SOURCE_LICENSES.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=['id','type','source','licence','use','sha256']);w.writeheader()
 for a in assets:w.writerow(dict(id=a['assetId'],type='original-geometry',source=a['source'],licence='Original project-authored geometry; not externally acquired',use='Private local study only; NOT_APPROVED',sha256=a['sha256']))
 for filename in ['codex-clipboard-af95c007-8991-440a-952e-85f4aea3becf.png','codex-clipboard-b8cf2ed6-19e5-4218-bd51-921b69728419.png','codex-clipboard-e0089fb7-745d-4c5a-93b0-b03709f73c66.png','codex-clipboard-b5083412-90d6-48c5-8cde-000745f0f41e.png']:
  p=Path('C:/Users/23242/AppData/Local/Temp')/filename
  w.writerow(dict(id=filename,type='user-provided-reference',source='User attachment, local path retained privately',licence='User supplied for private project reference; no inferred CC0/public redistribution licence',use='Reference analysis only, never used as 3D surface',sha256=sha(p)))
 for id,lic,source in [('Three.js','MIT','node_modules/three/LICENSE'),('R3F','MIT','node_modules/@react-three/fiber'),('Blender4.5.9','GPL application; generated geometry not a third-party mesh','D:/CarbonTwinTools/blender-4.5.9'),('Playwright1.64.1','Apache-2.0','node_modules/@playwright/test')]:
  w.writerow(dict(id=id,type='existing-tool',source=source,licence=lic,use='Existing installation reused; no dependency changes',sha256=''))
print('wrote factual stage docs')
