"""V14 initial review and licensed resource experiment; no service credentials read."""
from pathlib import Path
import json, hashlib, urllib.request, csv
from datetime import datetime, timezone
R=Path(__file__).resolve().parents[2]; D=R/'docs/citylight/v14'; D.mkdir(parents=True,exist_ok=True)
def write(n,s):
 p=D/n
 if p.exists(): raise RuntimeError(f'Refusing overwrite: {p}')
 p.write_text(s,encoding='utf8')
groups=[
('接管证据','AGENTS、README、package、lock、Git状态、检查点、恢复演练、服务端口、原站路由、历史失败','work/citylight-v14-checkpoint/snapshot.json','哈希比对与隔离恢复，不触碰环境文件'),
('参考构图','水岸前景、天际线密度、街道轴线、地标层次、金色窗光、玻璃高光、微缩边界、远景雾、夜景暗部、原创边界','public/citylight-review-v13/assets/reference-hk.jpg','只拆解空间规律，不搬用图片作为模型'),
('单塔轮廓','高度、层数、核心筒、楼层模数、主楼、裙房、退台、塔冠、背面、比例锚点','scripts/build-citylight-v12.py','做切面与退台两套灰模四面比较'),
('幕墙几何','竖梃、横梁、板边、转角、拼缝、玻璃退进、设备层、顶部收口、开窗模数、金属压盖','scripts/build-citylight-v12.py','独立三跨两层实物试件，关材质查连接'),
('玻璃物理','IOR、透射、厚度、粗糙度、HDRI、邻楼捕获、房间可见性、菲涅尔、反射视差、透明overdraw','components/3d/CitylightV12Studio.tsx','同机位静态环境/局部探针/透射三方案消融'),
('入口','雨棚、承重柱、门扇、把手、台阶、坡道、栏杆、铺装、门禁、接待路线','scripts/build-citylight-v12.py','人眼机位查通行尺度与接地，不用高空图掩盖'),
('办公内装','楼板、天花、隔墙、核心筒通路、会议区、工位、休息区、茶水区、灯位、消防路线','scripts/build-citylight-v12.py','先在两层试件划分不同功能，再观察窗后纵深'),
('家具母版','椅背、腰托、扶手、气杆、脚轮、桌板、支架、线槽、显示器、柜体','scripts/build-citylight-v12.py','椅子转台与局部玻璃后图独立审查'),
('其它材质','石材尺度、板缝、木纹、金属粗糙度、织物、法线方向、色彩空间、UV、接触阴影、纹理预算','work/citylight-v12-ao/packing.json','下载CC0一套1k材质，与纯色关闭纹理对照'),
('晨夕光','太阳高度、太阳方向、冷暖过渡、长阴影、曝光、天空亮度、玻璃高光、地面受光、室内受光、可逆时钟','components/3d/CitylightV12Studio.tsx','锁相机五态，区分实际阳光与HDR环境近似'),
('蓝夜灯','功能分区、亮灯顺序、色温、灯壳、灯芯、距离衰减、天花反射、暗部、固定seed、无Bloom可读性','components/3d/CitylightV12Studio.tsx','小试件真实灯具受光，不拿emissive壳替代全部照明'),
('市政细件','路缘、盲道、井盖、沟槽、栏杆、长椅、垃圾桶、路灯、交通牌、消防栓','scripts/build-citylight-v12.py','UNVERIFIED项先做尺度核对，主塔未过不铺全城'),
('生态绿化','树干、分叉、冠形、叶簇、两面受光、根部、树池、花盆壁、土壤、风动','scripts/build-citylight-v12.py','原叶片原型近景不足，先单株实验不批量'),
('车辆','轴距、车体曲面、轮胎、轮毂、车窗、后视镜、灯壳、内饰、滚动、转向','docs/citylight/V13_GAP_AND_COUNTER_REVIEW.md','主塔之后独立母版，不把原型交通记为A级车'),
('人物','身高、脚底、关节、步态、骨骼、阴影、行走速度、避障、动画许可、可复现时间','docs/citylight/V13_GAP_AND_COUNTER_REVIEW.md','当前未验收，先无动画比例锚，不冒充真实行人'),
('水岸船只','岸线、驳岸、波纹、反射、航道、船舷、甲板、船灯、水线、泊位','docs/citylight/V13_GAP_AND_COUNTER_REVIEW.md','当前单塔不含完整水岸，正式生产LOCKED'),
('群楼规划','道路、人流、商业、塔位、密度、高差、次塔、远景、楼型独立、资产ID','docs/citylight/TASK_GATE_REGISTER.json','G2未过98，禁止复制低质量塔凑城市'),
('镜头交互','唯一写入、过渡取消、Esc、逆滚、跳章、人眼碰撞、触摸、减少动态、模式恢复、世界ID','components/3d/CitylightV12Studio.tsx','固定机位与Orbit先测；完整六模式仍未实现'),
('浏览器','加载、GPU标识、帧时间、透射开销、阴影开销、纹理内存、导航超时、视频尺寸、contextlost、dispose','public/citylight-review-v13/raw/navigation-history.json','三浏览器同分辨率单因素，保留首轮异常'),
('验收伦理','用户35分、历史评分、原始截图、相机参数、录屏PTS、许可证、费用、用户确认、失败保留、证据哈希','docs/citylight/V13_PROGRESS.md','技术PASS不能替代美术分；五轴全部未放行')]
diag=['# DIAG200｜V14初版，非200项通过记录\n原V13 Q300/T120完整保留；本表不覆盖旧状态。证据列为待检查的真实文件，不等于该项已通过。\n']
improve=['# IMPROVE200｜V14独立最小实验清单\n所有未实施项均UNVERIFIED；仅玻璃试件允许隔离研究，不解锁下游正式生产。\n']
for gi,(title,items,source,action) in enumerate(groups):
 diag.append(f'\n## {gi+1:02} {title}\n');improve.append(f'\n## {gi+1:02} {title}\n')
 for k,item in enumerate(items.split('、')):
  num=gi*10+k+1
  diag.append(f'- D{num:03} **{item}是否满足真实结构、可见质量与证据要求？** 应满足：按V14对{item}的适用标准。当前证据：`{source}`。问题：现有记录不能证明{item}达到98；UNVERIFIED。根因假设：{title}尚缺独立控制对照。行动：{action}，专门保存{item}的参数与失败图。\n')
  improve.append(f'- I{num:03} **{item}** 最小实验：{action}，只改变{item}相关变量。资产/代码：`{source}`及独立`CL-G2-FACADE-14`候选。证据：固定机位原图、候选图和配置哈希；未生成前不填通过。预期改善：让{item}的差异可观察可归因。成本/许可：本地计算0次收费API，外部资产逐项CC0核验；采样draw calls/p95。放行：UNVERIFIED，证据不足不进入依赖生产。\n')
assert sum(len(g[1].split('、')) for g in groups)==200
write('DIAG200.md',''.join(diag));write('IMPROVE200.md',''.join(improve))
learn=[('真实2D与3D','https://threejs.org/docs/pages/GLTFLoader.html','网页真实网格相机可环绕；静态图不可代替','GLB不同机位截图'),('写字楼结构','scripts/build-citylight-v12.py','现有27层/3.65m模数/3退台体量；不能当结构工程认证','两个体量候选四面'),('Blender批处理','https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html','用本地Python可回放，不需要MCP任意执行','导出两层实物试件'),('glTF编辑源','https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html','同时保留blend/GLB；GLB不能替代设计源','Validator与文件哈希'),('PBR','https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html','线性roughness/normal，diffuse用sRGB','纯色/PBR地面A/B'),('HDRI','https://polyhaven.com/a/venice_sunset','1k CC0夕阳HDR用于环境，不代表所有时刻真实采集','静态环境反射对照'),('邻楼反射','https://threejs.org/docs/pages/CubeCamera.html','CubeCamera仅该捕获点有效；非SSR非视差校正','邻楼开/关捕获'),('四时刻','components/3d/CitylightV12Studio.tsx','既有晨夕蓝夜；白天缺单独按钮','试件五态固定参数'),('内部纵深','scripts/build-citylight-v12.py','背墙发光不是GI；需灯具/天花/分区','两种不同房间窗后截图'),('实例化','https://threejs.org/docs/pages/InstancedMesh.html','减少调用不替代造型；细件可合材质批次','记录GLB构件与drawcalls'),('车人船','docs/citylight/V13_GAP_AND_COUNTER_REVIEW.md','原型未验证A级，不能批量正式引用','只做尺度锚，不计成品'),('水岸','docs/citylight/V13_GAP_AND_COUNTER_REVIEW.md','当前孤塔没有完整水岸','G2后独立试验，不先造城'),('性能','public/citylight-review-v13/raw','受控实验与首次运行差异大，不能归因已修','采样原始rAF与GPU信息'),('WebKit','lib/citylight/stable-renderer.ts','Windows端口不是苹果真机；已有immutable buffer策略','复用策略测材质成本'),('授权','https://polyhaven.com/license','CC0核查具体下载；不推定所有开源资产自由分发','保存许可与MD5/SHA'),('AI工具','https://www.deepseek.com/','无网页工具会话，不伪造外部AI研究；不使用收费API','本地可审计Python替代'),('中文证据','app/citylight/review/page.tsx','沿用现有入口，实验和成品醒目标注','手机375宽回归'),('质量评分','V14.0 §10','五轴98不能平均；用户35历史不改','自动检查缺证据拒绝通过'),('局部反射成本','https://threejs.org/docs/pages/PMREMGenerator.html','6面捕获+PMREM可能卡顿，按状态变更更新','记录重捕获耗时'),('纹理预算','https://gltf-transform.dev/','1k先试不全量8k；压缩必须另做视觉验证','记录尺寸与相同配置A/B')]
write('LEARN20.md','# LEARN20｜证据与待做实验\n\n以下是实际源码/官方入口及可执行推导，不表示全部外部页面已访问。已下载页面在work/citylight-v14-research。\n\n'+''.join(f'## L{i+1:02} {a}\n证据/原始入口：{b}\n直接方法与限制：{c}\n一次实验：{d}（结果在实验报告更新，当前UNVERIFIED）。\n\n' for i,(a,b,c,d) in enumerate(learn)))
write('PROJECT_BASELINE.md','# V14 基线\n\n原仓库CarbonTwin_App，分支citylight/v13-evidence；HEAD 7aff20a198991db9694e32d86d2f972943ca128f。大量既有未提交修改全部保留；不以Git HEAD代表当前模型。392项备份见work/citylight-v14-checkpoint/snapshot.json。Next14.2.35实际没有node_modules/next/dist/docs，未为此更换版本。3020既有服务继续运行。原塔GLB不替换。用户新视觉评价约35或更低；H/C/X/E/A均NOT_READY。\n')
write('ROLLBACK.md','# 回滚\n\n原有文件备份与SHA在work/citylight-v14-checkpoint。恢复演练在rehearsal目录，不写回运行树。本轮候选独立route/components/GLB，不覆盖原塔；回滚只撤销本轮确切新增文件/入口链接，不使用git reset或清理用户文件。执行真实恢复前先再次对当前改动来源逐项比对。\n')
write('INSIGHTS.md', '''# V14 初轮工程复盘（不是美术验收）

当前问题不是缺少测试脚本，而是测试证实的东西与用户要求的美术质量不同。V13证据页确实让原图、机位和失败更可见，但模型没有发生实质变化。三浏览器能加载同一GLB，只说明资源链路工作，不能证明窗框、家具或建筑轮廓可信。本轮把用户约35分或更低作为最新评价记录，绝不把新的功能通过数换算成用户分数。

旧版默认的高透射幕墙在远景存在双重风险。第一，整栋楼相似的粗糙度与透射让材料缺乏用途差异，缺少压盖、凹槽与楼板边缘的可读高光时，观者首先读到的是半透明塑料罩。第二，屏幕空间透射会重复绘制背景；浏览器与GPU路径不同会影响帧时间。简单把transmission改为零虽然可能变快，却同时遮住室内，不是合格修复。正确实验需要把真实反射、玻璃后几何和透射开销分开。静态HDR可给出有层次的远环境，但它不含现场新增邻楼；局部CubeCamera应在邻楼开关时显示相应变化，否则只能证明一张环境图存在。

现有办公层壳体的emissive能提高可见性，却不能证明天花灯照亮了桌面。整片背墙均匀发光会抹平隔墙、桌椅和走廊的深度。窗灯还必须依房间功能有明暗关系，而不是把八种随机亮度平均铺到所有楼层。两层三跨试件应首先具有真实地板、天花、隔墙和至少两类布局，真实灯光有限地作用于其中，保留灯具、桌腿、椅子支架及人体尺度。暂时未通过的椅子只能叫实验几何，不能在资产库里写A级母版并铺满城市。

旧塔的庭院、原型树和家具从高空看似足够，但入口机位会暴露板缝、接地和材质尺度的问题。无授权素材不能为了好看直接搬进来；合法资源也不能只在报告列网址。本轮选具体CC0夕阳HDR和1k混凝土地面材质，保存源清单、许可、校验与下载时间，真正加载到试件中，并保留关闭材质的对照。粗糙度与法线是线性数据，颜色图才用sRGB，错误色彩空间可能比没有贴图更糟。法线强度应保持实际尺寸，不能把铺装做成山脉。

之前AO试验增加包体约21%，改善有限，没有解决玻璃、立面和布局，因而没有替换默认GLB，这是应保留的失败证据。新实验不能以另一组粗糙度数值重复同样的尝试。需要结构上可观察的窗框、不同房间和反射对照，再决定是否把方案迁回塔楼。现阶段不能预先说CC0资源一定提高了分数；只有同机位图、开关差异和成本测量才能证明收益。

孤立塔楼不会因为加一张远景城市图就变成完整城市。最终水岸、街区密度、次塔高差与生活细节需要独立空间关系；但现在G2未过，正式造第二栋会扩散缺陷。为了反射验证摆两个测试块是允许的实验，必须明确标成邻楼反射体，不能称为高质量城市。先在有限范围解决玻璃与房间的关系，再回到两套真正不同的剪影与合理入口，才是可控顺序。

工程线同样不能用等待时间掩盖问题。WebKit的历史视频尺寸292×210与1440×1100源不一致、导航超时和低帧率仍是未归因缺陷。新试件更小，可用于区分模型重量、透射绘制、阴影和局部探针捕获成本；rAF样本仅是帧节奏，不等同GPU耗时，应如实命名。首次编译和首次捕获的停顿不能删除。手机是否可达仍需实际设备确认，但这不妨碍本地做不收费、可撤销的材料研究。证据页应公开这些限制而不要求用户反复替开发者验收半成品。

最高优先级是一次能被看见且能被证伪的小改变：原塔近景冻结、试件网格和编辑源真实存在、三种反射/透射路径固定机位比较、晨夕夜真实浏览器截图、三浏览器原始帧时间与邻楼开关差异。如果试件仍像塑料，就记录失败并回到结构、环境和照明，不向评分表填98。原站TTS、Decart、密钥、Scope公式和部署边界均不需要为这项研究发生变化；本轮不触发任何付费服务，也不把本地运行误报为线上部署。
''')
res=R/'public/models/citylight/v14-lab/resources';res.mkdir(parents=True,exist_ok=True)
saved=[]
for kind,keys in [('hdri',[('hdri','hdr')]),('pbr',[('Diffuse','jpg'),('Rough','jpg'),('nor_gl','jpg')])]:
 doc=json.loads((R/f'work/citylight-v14-research/{kind}.json').read_text())
 for key,fmt in keys:
  spec=doc[key]['1k'][fmt];url=spec['url'];p=res/url.split('/')[-1]
  if not p.exists():p.write_bytes(urllib.request.urlopen(url,timeout=45).read())
  md5=hashlib.md5(p.read_bytes()).hexdigest();assert md5==spec['md5']
  saved.append(dict(file=p.relative_to(R).as_posix(),url=url,bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),md5=md5,license='CC0',licenseURL='https://polyhaven.com/license',downloadedAt=datetime.now(timezone.utc).isoformat()))
(res/'sources.json').write_text(json.dumps(saved,indent=2),encoding='utf8')
write('LICENSE_REGISTER.csv','file,license,source\n'+''.join(f"{x['file']},CC0,{x['url']}\n" for x in saved))
print(json.dumps(dict(questions=420,downloaded=saved),ensure_ascii=False))
