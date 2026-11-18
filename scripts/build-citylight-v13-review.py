"""Build the same-project Chinese evidence viewer and identical offline bundle.
Only explicit visual evidence and redacted measurements are published. No .env / source upload.
"""
import hashlib, html, json, re, shutil, struct, subprocess, zipfile
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(r'C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v13')
OLD=OUT.parent/'citylight-v12';REVIEW=OUT/'review';DOC=ROOT/'docs/citylight'
def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,x):
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2),encoding='utf-8')
def copy(src,rel):
    p=REVIEW/rel;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,p);return rel
def main():
    current=load(OUT/'current/capture.json')
    if any(b['status']!='AUDIT_CAPTURED' for b in current['browsers'].values()):raise RuntimeError('Do not publish missing browser evidence as captured')
    protection=load(OUT/'protection-current.json') if (OUT/'protection-current.json').exists() else load(OUT/'protection-baseline.json');old=load(OLD/'regression-r7/results.json')
    for p in (OUT/'current').glob('*.png'):copy(p,'assets/current-'+p.name)
    copy(OUT/'current/operation-entry.png','assets/operation-entry.png')
    copy(OLD/'regression-r7/chromium-a-front.png','assets/baseline-front.png')
    references=[]
    for key,label,analysis,file in [
        ('ny','纽约：层次与天际线','高低体量沿纵深递进；不同塔冠组织密度。当前孤塔没有前中后景，不能靠增加窗格代替城市构图。','codex-clipboard-71731130-a105-4f8a-b238-6c1572e65d0f.jpg'),
        ('paris','巴黎：轴线与树阵','街道、建筑边界与绿化共同组织空间。当前只有庭院底板，没有连续城市道路或街道人眼质量。','codex-clipboard-67c31c29-9ff7-42c6-897b-5467020bdcc2.jpg'),
        ('hk','香港：滨水与灯火','水岸前景、密集建筑中景和灯光倒影相互对应。当前单塔无真实水岸、船只和邻楼反射。','codex-clipboard-c5432ba9-ba00-4582-a535-7fd890dd6de9.jpg')]:
        src=Path('C:/Users/23242/AppData/Local/Temp')/file
        if not src.exists():raise RuntimeError('Reference missing: '+file)
        rel=copy(src,'assets/reference-'+key+'.jpg');references.append({'name':label,'analysis':analysis+'（用户视觉参考，可能包含预渲染/AI图，非本项目成果）','file':rel,'sha256':sha(src),'license':'用户提供，限本次私有研究验收；非可分发的生产模型资产'})
    # PNG source dimensions are checked from IHDR, not assumed from CSS.
    def dimensions(p):return list(struct.unpack('>II',p.read_bytes()[16:24]))
    historic=old['browsers']['chromium']['candidates']['a']
    now=current['browsers']['chromium']['views']['front']
    base_data=historic['performance']['dataset']
    vec=lambda s:[round(float(x),4) for x in s.split(',')]
    comparison={'kind':'unchanged-model-current-recapture','oldVersion':'R7历史基线','newVersion':'V13本轮复核；模型仍为R7','assetID':'CL-T01-V12','cameraEqual':vec(historic['views']['front']['camera'])==vec(now['dataset']['camera']),'worldTimeEqual':base_data['worldTime']==now['dataset']['worldTime'],'imageDimensionsEqual':dimensions(REVIEW/'assets/baseline-front.png')==dimensions(REVIEW/'assets/current-chromium-front.png'),'imageDimensions':dimensions(REVIEW/'assets/current-chromium-front.png'),'modelSHA256Equal':old['snapshot']['public/models/citylight/v12/light-court.glb']==current['snapshot']['public/models/citylight/v12/light-court.glb'],'quality':'standard, transmission .96, sky PMREM','oldBrowserVersion':old['browsers']['chromium']['version'],'newBrowserVersion':current['browsers']['chromium']['version'],'explanation':'相机、时刻、截图尺寸与模型指纹逐项对照。这里是同一模型的本轮复拍：外观没有进行新修复；不能作为美术提升证据。'}
    assert all(comparison[k] for k in ['cameraEqual','worldTimeEqual','imageDimensionsEqual','modelSHA256Equal'])
    glass=[]
    for name,title,caption in [('sky-不透射','A / 不透射玻璃','历史受控对照：关闭透射后无法据此验收窗内空间。'),('sky-清透玻璃','B / 清透玻璃 .96','历史天光 PMREM 对照：有透射，不等于具备可信邻楼镜像。')]:
        rel=copy(OLD/f'regression-r7/chromium-a-{name}.png',f'assets/glass-{name}.png');glass.append({'file':rel,'title':title,'caption':caption})
    ao=[]
    for k,title in [('off','AO关闭 / 历史隔离实验'),('ao','真实AO / 未采用为默认')]:
        source=OLD/f'ao-r8/{k}-entry-day.png'
        if source.exists():ao.append({'file':copy(source,f'assets/ao-{k}.png'),'title':title,'caption':'同一入口机位的真实GLB；仅Chromium历史实验，不标为三浏览器已通过。'})
    vdir=OUT/'video-calibrated-r2';record=load(vdir/'recording.json') if (vdir/'recording.json').exists() else None
    if record and (vdir/'operation.mp4').exists() and record.get('timelinePTS'):
        copy(vdir/'operation.mp4','videos/current-orbit.mp4');copy(vdir/'operation.webm','videos/current-orbit.webm');copy(vdir/'operation.vtt','videos/current-orbit.vtt');current['browsers']['chromium']['timeline']=record['timelinePTS'];copy(vdir/'entry.png','assets/operation-entry.png')
        video={'status':record['status'],'explanation':'本轮未剪辑实录，源页面实时显示中文动作标签；时间轴按视频内标记逐帧定位。仅确认采到环绕与入口；Esc末段没有被录像采到，不能声称本片展示复位。H.264/yuv420p，保留原WebM。','details':record}
    else:
        copy(OUT/'current/current-orbit.mp4','videos/current-orbit.mp4');copy(OUT/'current/current-orbit.webm','videos/current-orbit.webm')
        (REVIEW/'videos/current-orbit.vtt').write_text('WEBVTT\n\n',encoding='utf-8');current['browsers']['chromium']['timeline']=[]
        video={'status':'TIMELINE_NOT_CALIBRATED','explanation':'录屏真实，但首次墙钟与视频时长不一致；未发布不可靠时间轴，待逐帧校准。'}
    b=(ROOT/'public/models/citylight/v12/light-court.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];gltf=json.loads(b[20:20+n]);manifest=load(ROOT/'public/models/citylight/v12/manifest.json')
    asset={'id':'CL-T01-V12','coordinates':[0,0,0],'model':'public/models/citylight/v12/light-court.glb','source':'scripts/build-citylight-v12.py','editable':'work/light-court-v12.blend','generator':gltf['asset'],'materials':[m['name'] for m in gltf['materials']],'nodes':[n.get('name') for n in gltf['nodes']],'bytes':len(b),'sha256':sha(ROOT/'public/models/citylight/v12/light-court.glb'),'manifest':manifest,'qualityState':'G2_FAILED_USER_VISUAL_REVIEW','summary':['实际标准GLB：'+str(len(b))+'字节；'+str(manifest[0]['triangles'])+'个三角形。','单塔在原点 [0,0,0]，庭院与家具被按材质合并进模型。','原生可编辑源存在；不是AI效果图、贴图转盘或预录城市。','对象按材质合并，尚不能把每个桌椅、垃圾桶作为独立精品资产验收。']}
    save(REVIEW/'raw/asset-audit.json',asset)
    histories=[]
    for rel in ['lifecycle-r7/lifecycle.json','preservation-r7/preservation.json']:
        d=load(OLD/rel)
        for browser,row in d['browsers'].items():
            for c in row.get('checks',[]):
                if c.get('status','').lower() in ['fail','failed']:histories.append({'historicalRecord':rel,'at':d.get('at','历史文件未记录at字段'),'browser':browser,**c,'currentResolution':'根因未确认，不以延长等待作为修复'})
    save(REVIEW/'raw/navigation-history.json',histories)
    # Independent first-stage audit artifacts; do not unlock art dependencies via evidence UI work.
    register=load(DOC/'TASK_GATE_REGISTER.json')
    initEvidence=['raw/protection.json','raw/contract-source.json','raw/capture.json']
    for t in register['tasks']:
        n=int(t['id'][-3:])
        if n<=5:
            t.update(status='INTERNALLY_PASSED',score=100,evidence=initEvidence.copy(),failureReasons=[],p0Open=False)
            t['scoreBreakdown']={'实际成果':40,'真实证据':25,'边界与安全':15,'复现与回归':15,'维护':5}
            t['verificationResult']={1:'原仓库根、HEAD、dirty状态已记录；继续使用原站。',2:'AGENTS已读；安装的Next14.2.35无node_modules/next/dist/docs，按现有路由范例最小添加，未升级。',3:'新分支citylight/v13-evidence；300文件备份哈希相符；源码、TTS、GLB在隔离目录恢复演练一致。',4:'当前G2三浏览器8机位截图与原GLB请求、实体ID已记录，纯记录任务不表示美术合格。',5:'原/citylight返回200；3020现有服务继续运行；三浏览器实际启动版本有记录。'}[n]
            t['files']=['scripts/citylight-v13-evidence-init.py'] if n<=3 else ['browser-tests/citylight-v13-capture.cjs']
        elif n==6:
            t.update(status='BLOCKED',score=80,evidence=['index.html','raw/review-tests.json','videos/current-orbit.mp4'],failureReasons=['完整离线页与原站入口已制作；手机真机实际打开、视频播放及跨设备可达性尚未验证。WindowsWebKit媒体校验存在尺寸不一致，录屏Esc末段缺失，不能放行S00。'],p0Open=True)
            t['rubric']={'能看到真实成果':30,'前后对比':20,'中文说明':20,'媒体可打开':20,'路径隐私访问权限':10}
            t['rubricSource']='V13.1 E类；合同预先固定；手机路径访问未验证扣10，视频缺尾及WebKit媒体未完全通过扣10'
            t['scoreBreakdown']={'能看到真实成果':30,'前后对比':20,'中文说明':20,'媒体可打开':10,'路径隐私访问权限':0}
            t['files']=['app/citylight/review/page.tsx','scripts/citylight-review-template.html','scripts/build-citylight-v13-review.py']
        else:
            # Preparation may appear in support page, but formal downstream work stays locked.
            t['failureReasons']=['尚未进入正式执行；依赖任务/阶段未放行。']
    save(DOC/'TASK_GATE_REGISTER.json',register)
    ledger=load(DOC/'Q300_LEDGER.json')
    verified={1:'原仓库CarbonTwin_App、Git HEAD和dirty清单已记录。',2:'已读取AGENTS；实际安装版本与文档目录不存在的事实已核实。',3:'使用新分支保留全部原有dirty文件；未reset、clean或提交用户修改。',4:'现有/citylight与/citylight/studio已实际访问；新入口/citylight/review属于同一原站。',6:'app/api/tts、Decart路由及既有语音/试衣代码实际存在；本轮未调用。',8:'仅本地原站和离线页，生产Netlify没有更新。',9:'本轮没有发送收费API请求；浏览器API/外网/WS均拦截。非全账户账单审计。',11:'读取package.json并哈希保护package-lock；Next14.2.35/Three r187/现有Playwright复用，无依赖变更。',12:'源码、TTS路由、GLB三个代表文件在隔离目录恢复演练，哈希一致。',13:'300个真实文件备份与哈希结果已保存；未备份.env。',14:'新证据资源位于public/citylight-review-v13，不覆盖原模型。',17:'原Git状态与本轮新增清单可复查；无清理操作。',18:'复用D:/PlaywrightBrowsers；三浏览器实际启动，无重复下载。',19:'本机地址和同网LAN地址明确区分；不声称手机实机已通过。',22:'证据首页明确显示G2未通过/NOT_READY；没有98分结论。',24:'三参考图逐一标记用户视觉参考、可能预渲染/AI，非项目成果。',26:'本轮录像由Playwright对实际GLB工作台录制，有相机坐标环绕回读。',29:'对比双方均标CL-T01-V12；同模型复核，未伪称新改模。',30:'相册支持三浏览器切换，每个提供七视角及透窗补充图。',31:'本轮实际鼠标环绕测得接近360度；仅单塔，不冒充全城。',32:'验收页公开十项缺陷、下一次修复与任务锁。',33:'图注解释本轮没有模型外观变化；真实不足直接写出。',36:'原始帧采样、标准/低档与GPU标识均可点开。',37:'两个历史WebKit导航失败原文继续保留；不以补测覆写。',40:'首页和页尾明确阶段证据，不表示最终验收或美术通过。',45:'参考图仅图像对照，模型相册均来源本轮实际WebGL。',47:'六条参考视频本轮未实际完整观看；不冒充看完。',55:'当前GLB实际含网格并被浏览器请求；参考图未作为模型使用。',76:'AO未采用实验和旧版本资料保留。',80:'本轮三浏览器七视角均已留存，质量仍未通过。',104:'源码与页面均说明全局PMREM不会自动包含现场邻楼；庭院探针不是完整城市反射。',118:'当前工作台没有Bloom链，真实画面来自直接渲染，不伪造开关对照。',139:'入口与透窗关键机位本轮实际截图，空间审美仍不合格。',201:'本轮固定机位晨光截图及世界时间0有记录。',214:'三浏览器同正面机位四时刻实际截图与数据均留存。',268:'证据中心每个图均有中文替代文字和说明。',269:'证据中心通过文字、字幕及时间轴解释，不依赖声音。',278:'当前已完成的单塔证据已集中展示；不声称所有城市功能已交付。',280:'页面明确NOT_READY、未制作和失败；无假加载进度。',281:'本轮Chromium实际GLB与渲染截图留存。',282:'本轮Firefox实际GLB与渲染截图留存。',283:'本轮WindowsWebKit实际GLB与渲染截图留存，非Safari真机。',285:'标准WebKit帧样本已记录；首轮性能很低，仍未达标。',286:'标准与低档分开列，低档不用于代替标准达标。',287:'本机设备、帧样本和p95均记录；未将其外推到所有设备。',292:'DrawCalls与dataset相机/目标/绘制缓冲同时留存。',295:'本轮新增证据页测试与旧业务真实AI测试区分；旧收费功能未重测。',297:'固定相机/时间/画质记录可复查；随机种子未全链路复核。',300:'整体保持NOT_READY；未经用户确认不得正式验收。'}
    failed={21:'手机实际访问与本地文件包播放尚未实机验证。',38:'尚无用户手机端可达性证据；LAN仅本机HTTP200。',51:'当前只有原R7一个候选，没有两种结构显著不同的新主塔。',52:'尚未实际生成V13 A/B两候选，不满足。',61:'已有三段退台，但主立面仍过度等质，不能据此标造型优秀。',75:'新两候选未生成，无法作真实淘汰比较。',83:'正/侧/背仍大量重复幕墙网格，变化不足。',100:'尚无V13逐栋独立立面设计档案。',103:'当前只有庭院探针；缺少真实邻楼，不能验证城市反射。',106:'现有玻璃缺乏可信邻楼映射，近景朦胧；未达标。',110:'入口玻璃及室内亮度层次仍不足，前后对比可见。',128:'会议室与开放区的可信近景分隔不足，需重建。',136:'办公层用途与家具变化缺少完整近景证明。',137:'本轮单楼，尚无不同建筑用途档案与差异化房间。',140:'现GLB按材质合并，未提供逐房间ID与独立定位。',141:'办公椅仍合并在整楼，无合格独立精品母版近景。',147:'未提交有结构与材质验证的独立垃圾桶精品母版。',160:'未建立逐房间可信布局与母版复用校验闭环。',161:'当前审查工作台仍仅单塔，不是完整城市。',162:'没有10栋独立合格重点楼。',163:'没有4栋近景精品楼通过当前用户认可。',177:'证据页仅能定位当前单塔，不是完整城市资产地图。',180:'工作台周边仍大片空旷底板，不满足完整城市。',184:'未交付真实滨水城市倒影。',200:'当前工作台缺水岸和完整道路，无法通过。',220:'当前孤塔构图缺完整城市的前中后景。',248:'只有单楼预设入口下降，不满足完整城市高空到街景。',253:'八幕完整城市故事尚未交付。',279:'离线包手机真机打开仍未验证。',284:'两次历史导航超时尚无根因验证。',288:'本轮未完成完整故事滚动/近景性能矩阵。',298:'用户否定尚未解除；本轮不能提高美术分。',299:'仍有访问/视觉/导航问题未关闭，不满足所有关键缺陷关闭。'}
    for q in ledger['questions']:
        n=int(q['id'][1:])
        if n in verified:q.update(actualAnswer=verified[n],evidence=['raw/capture.json','report.json'],gap='仅限说明范围；不代表关联阶段全部通过。',risk='P1',retestStatus='VERIFIED',earnedPoints=1)
        elif n in failed:q.update(actualAnswer=failed[n],evidence=['report.json'],gap=failed[n],risk='P1',retestStatus='FAIL',earnedPoints=0)
        else:
            topic=q['question'].replace('是否已经做到','').strip('？“”')
            q['actualAnswer']='本轮未完成“'+topic+'”的独立证据复核；原站/历史资料的存在不能证明此条通过。'
    save(DOC/'Q300_LEDGER.json',ledger)
    defects=[]
    rows=[
    ('主立面仍像均匀网格','正面中段、左右侧与背面','模型按统一窗格和楼层节距生成，退台没有带来充分的功能分区变化。','先做两种结构差异的原创白模；按办公/设备/公共楼层重新设计分格，不继续堆装饰条。','TASK-021','scripts/build-citylight-v12.py / v12-frame','front'),
    ('缺真实邻楼反射','塔身玻璃斜角高光','现有物理天光PMREM仅包含天空；庭院探针排除了主塔且没有邻楼可捕获。','在隔离反射夹具放真实几何邻体，固定机位比较天空/受控局部探针，并测p95。','TASK-043','components/3d/CitylightV12Studio.tsx / LightRig','front'),
    ('门厅玻璃与室内层次朦胧','人眼入口雨棚后方','透射、室内壳体发光近似和简化材质共同影响可读性；具体贡献尚需单变量实验。','保留清透/不透射对照；分离玻璃、室内照明与室内几何，逐项比较，不直接调亮全楼。','TASK-040','CitylightV12Studio.tsx / Asset、LightRig；v12-lobby-glass','entry'),
    ('室内不够像可信办公空间','透窗补充机位','家具细节已存在，但真实功能分区、隔断、会议室与走廊差异缺乏充分近景证据。','先验收一套桌椅母版及一间办公室，再设计至少三种floorUsePlan和可定位房间ID。','TASK-033','scripts/build-citylight-v12.py / 周边房间生成','window'),
    ('塔冠设备与立面转接弱','屋顶斜俯视','现有顶层结构更像重复楼层的收尾，设备层与结构逻辑缺乏独立表现。','候选白模阶段先定塔冠剖面、退台关系与设备遮蔽，再做屋顶七视角复核。','TASK-026','scripts/build-citylight-v12.py / 塔冠、设备层','roof'),
    ('入口铺地细节和远处条纹','入口前景、庭院边缘','近景铺装规则重复；条纹根因未证实，不能直接认定为阴影采样错误。','在固定相机分别关闭阴影/材质细纹/接缝，检查深度冲突及尺度；根据根因修复。','TASK-027','v12-paving / v12-joint / DirectionalLight','entry'),
    ('景观与街道生活不足','基座前庭与单塔周边','庭院树与座椅有原型，缺道路语义、市政母版及可独立审核的近景车/人。','逐件做树、路缘、路灯、车辆母版近景，不用随机散点或旧方块车充数。','TASK-064','scripts/build-citylight-v12.py / 庭院；未来asset-registry','front'),
    ('夜景层次未成熟','夜景中距离与透窗','房间组有发光差异，但主要采用室内壳体发光近似，不等于可信室内灯具照明。','按房间用途、楼层和WorldClock确定灯具/窗光；同机位晨夕蓝夜、关闭后期实拍。','TASK-047','CitylightV12Studio.tsx / v12-room-* emissiveIntensity','night'),
    ('单塔不是滨水城市','全景大片空地、无水岸','当前工作台只有一个独立塔楼与庭院，没有完整城市拓扑或密度。','先逐栋达到独立门槛，再组合街区、水岸、真实反射，禁止先用重复方块制造城市感。','TASK-061','CL-T01-V12 工作台 / 城市集群尚未交付','front'),
    ('性能与导航缺少闭环','WebKit标准档及历史两次导航','本轮低帧率与历史超时均有证据；根因未知，不能把更长超时或低档FPS当修复。','保存首次失败，在无录像固定条件下重测；再用单变量隔离和导航长任务日志定位。','TASK-104','browser-tests/citylight-v12-navigation.cjs / 新复测记录','front')]
    for title,location,cause,repair,task,file,view in rows:defects.append({'title':title,'location':location,'cause':cause,'repair':repair,'task':task,'file':file,'evidence':f'assets/current-chromium-{view}.png','status':'未解决','result':'未放行；本轮证据整理不表示已完成该项美术修复。'})
    report={'version':'V13.1','status':'NOT_READY','phase':'S00 / TASK-006 supporting evidence','currentUserVisualFeedback':'可能不足5—10分；本轮不调整建筑美术评价','current':current,'protection':protection,'comparison':comparison,'references':references,'glass':glass,'ao':ao,'video':video,'asset':asset,'defects':defects,'tasks':register['tasks'],'questions':ledger['questions'],'viewNotes':{'front':'孤塔、重复幕墙与空旷周边仍明显。','rear':'背面已经有几何，但不能把不缺面当成美术合格。','left':'侧面需改善功能分区与立面节奏。','right':'玻璃反射不能读出可信城市环境。','roof':'塔冠与屋顶设备仍需独立深化。','entry':'门厅透射朦胧，接待台与空间层次不够清晰。','night':'窗口有分组发光，但灯光真实感仍不足。','window':'可见真实室内几何；母版质量与布局仍未通过。'},'nextAction':'当前停在S00/TASK-006：完整证据包已制作，手机实机访问与播放尚未验证，故未达到98分，不解锁依赖阶段。可继续独立根因诊断与证据修复；不会擅自推进整城、写字楼或收费测试。','cost':{'paidAIRequests':0,'knownNewInferenceCost':0,'accountBillingAudited':False},'publicDeployment':False,'phoneDeviceVerified':False}
    quality=OUT/'controlled-quality/quality.json'
    if quality.exists():report['controlledRemeasurement']=load(quality);copy(quality,'raw/controlled-quality.json')
    review_results=[OUT/f'review-test-r{i}/review-tests.json' for i in [2,3,4] if (OUT/f'review-test-r{i}/review-tests.json').exists()]
    if review_results:
        report['reviewValidationHistory']=[load(p) for p in review_results]
        report['reviewValidation']=load(review_results[-1]);copy(review_results[-1],'raw/review-tests.json')
        for p in review_results:copy(p,'raw/'+p.parent.name+'.json')
    for src,rel in [(OUT/'current/capture.json','raw/capture.json'),(OUT/('protection-current.json' if (OUT/'protection-current.json').exists() else 'protection-baseline.json'),'raw/protection.json'),(OUT/'contract-source.json','raw/contract-source.json'),(DOC/'TASK_GATE_REGISTER.json','raw/TASK_GATE_REGISTER.json'),(DOC/'Q300_LEDGER.json','raw/Q300_LEDGER.json')]:copy(src,rel)
    save(REVIEW/'report.json',report)
    data=json.dumps(report,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    template=(ROOT/'scripts/citylight-review-template.html').read_text(encoding='utf-8');(REVIEW/'index.html').write_text(template.replace('__REVIEW_DATA__',data),encoding='utf-8')
    (REVIEW/'README_先看这里.txt').write_text('城市有光 V13.1 阶段证据包（不是最终成品）\n\n1. 解压整个ZIP，保留assets、videos、raw与index.html的相对位置。\n2. 双击index.html，可离线查看；视频直接打开videos/current-orbit.mp4。不要在ZIP内只打开一个HTML。\n3. 手机：将完整ZIP传到手机并解压，用支持本地HTML的浏览器打开；若文件管理器不执行脚本，先打开assets内PNG和videos内MP4。手机真机行为尚未验证。\n4. 原电脑访问：http://127.0.0.1:3020/citylight/review\n5. 同一可信Wi-Fi可尝试：http://10.135.82.231:3020/citylight/review。本机对此LAN地址返回200；手机、防火墙和无线隔离仍未实际验证。IP可能变化，没有修改防火墙、绑定或开放公网。\n6. G2未通过。用户最新视觉反馈仍为可能不足5—10分，没有上调。\n7. 本阶段真实收费API调用0次；已知新增AI推理费用0。未进行全账户账单审计。\n8. 录屏来自原站真实GLB操作；当前模型未重做。任务锁和失败明细见网页、report.json。\n',encoding='utf-8')
    hashes=[{'file':p.relative_to(REVIEW).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p)} for p in sorted(REVIEW.rglob('*')) if p.is_file() and p.name!='manifest.json']
    save(REVIEW/'manifest.json',{'generatedAt':datetime.now(timezone.utc).isoformat(),'status':'STAGE_EVIDENCE_NOT_FINAL','files':hashes,'selfHashExcluded':True})
    # Explicit output directory only; merge copy preserves prior files rather than deleting anything.
    shutil.copytree(REVIEW,ROOT/'public/citylight-review-v13',dirs_exist_ok=True)
    with zipfile.ZipFile(OUT/'城市有光_V13_阶段视觉证据.zip','w',zipfile.ZIP_DEFLATED) as z:
        for p in sorted(REVIEW.rglob('*')):
            if p.is_file():z.write(p,'review/'+p.relative_to(REVIEW).as_posix())
    (DOC/'TASK_LEDGER.md').write_text('# V13.1 原文120项任务台账\n\n当前S00；美术未通过，不解锁城市组合。\n\n'+'\n'.join(f"- {t['id']}（{t['originalID']}） {t['name']}：{t['status']}；{t['score']}/100；依赖 {', '.join(t['dependencies']) or '无'}；证据 {', '.join(t['evidence']) or '未验证'}" for t in register['tasks']),encoding='utf-8')
    (DOC/'Q300_LEDGER.md').write_text('# V13 原文300项审查初始台账\n\n只记录本轮已核实的有限事实，其余未验证；不是300项完成。\n\n'+'\n\n'.join(f"## {q['id']} {q['question']}\n\n标准：{q['acceptanceStandard']}\n\n实况：{q['actualAnswer']}\n\n结论：{q['retestStatus']}；证据：{', '.join(q['evidence']) or '未验证'}\n\n整改：{q['decision']}；关联：{', '.join(q['tasks'])}" for q in ledger['questions']),encoding='utf-8')
    print(json.dumps({'files':len(hashes),'comparison':comparison,'historicalFailures':len(histories),'video':video['status'],'zipBytes':(OUT/'城市有光_V13_阶段视觉证据.zip').stat().st_size},ensure_ascii=False))
if __name__=='__main__':main()
