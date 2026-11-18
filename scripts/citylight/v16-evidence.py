"""V16 evidence assembly. Never includes .env or service credentials."""
from pathlib import Path
import json,hashlib,shutil,subprocess,re,html,zipfile
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[2];D=R/'docs/citylight/v16'
O=Path('C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v16')
P=R/'public/citylight-review-v16'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):
 p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def copy(a,b):
 b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(a,b)
def protect():
 j=json.loads((R/'work/citylight-v16-checkpoint/snapshot.json').read_text());change=[]
 for f in j['files']:
  p=R/f['path']
  if not p.exists() or sha(p)!=f['sha256']:change.append(dict(path=f['path'],exists=p.exists(),before=f['sha256'],after=sha(p) if p.exists() else None))
 before=json.loads((R/'work/citylight-v16-checkpoint/snapshot.json').read_text())['status']
 current=subprocess.check_output(['git','status','--short'],cwd=R,text=True)
 (O/'git-status-current.txt').write_text(current,encoding='utf8')
 value=dict(protected=len(j['files']),unchanged=len(j['files'])-len(change),changes=change,credentialsRead=False,credentialsCopied=False,existingKeysChanged=False,paidCalls=0,productionDeploy=False)
 dump(O/'protection.json',value);return value
def scoring():
 assets=json.loads((R/'public/models/citylight/v16-study/r3/manifest.json').read_text())
 matrix=json.loads((O/'matrix-r4/study.json').read_text())
 scoring=dict(rubric_version='V16-frozen-2026-11-05',scorer='Codex visual inspection; author review only, NOT independent human acceptance',asset_version='r3',git_commit=matrix['head'],candidate_code_sha256=matrix['codeHash'],user_visual_baseline='原实物35–40/100，用户未重新验收；此处不更改',camera_time_quality='front/rear/left/right/roof/eye/detail/hero; neutral; opaque clay; DPR1; no Bloom',userApproved=False,independentReviewerAvailable=False,concept=[],geometry=[],global_status='FAILED_GATE')
 for a in assets:
  crystal=a['candidate']=='crystal'
  dims=[dict(name=n,max=w,score=s,deduction=why) for n,w,s,why in [
   ('轮廓',25,20 if crystal else 14,'A仍偏规则棱柱，斜肩与冠环关联尚不够鲜明；B台阶感更明显，拒绝作主方向'),
   ('可建模性',25,21 if crystal else 19,'已有实体和米制楼板，但屋顶维护入口、侧后勤与核心筒还没有完整验证'),
   ('五视角一致',20,18,'四向与屋顶来自同一GLB；左右侧缺少场地回应，不能以对称掩盖设计不足'),
   ('创新',15,10 if crystal else 8,'延续晶体/冠环，但轮廓仍需要更强的原创节奏；不直接复制参考现实塔楼'),
   ('后续光照与室内潜力',15,10 if crystal else 9,'大堂已留实体空腔；办公室、玻璃反射仍未从概念落实，不预支分数')]]
  total=sum(x['score'] for x in dims)
  scoring['concept'].append(dict(assetId=a['assetId'],sha256=a['sha256'],score=total,gate=90,status='FAILED_GATE',dimensions=dims,evidence=['matrix-r4/chromium-'+a['candidate']+'-'+v+'.png' for v in ['front','rear','left','right','roof','eye','detail','hero']],decision='A保留为继续整改方向，未过90正式概念闸门' if crystal else '拒绝作为主方向；仅保留对照'))
  geometry=[('轮廓',22,17),('结构逻辑',20,11),('正背侧顶完整',20,13),('细节',18,7),('人尺度',10,8),('真实模型证据',10,9)]
  scoring['geometry'].append(dict(assetId=a['assetId'],sha256=a['sha256'],score=sum(x[2] for x in geometry),gate=98,status='FAILED_GATE',dimensions=[dict(name=n,max=w,score=s) for n,w,s in geometry],open_defects=['裙房是开放结构，尚无合格门厅内装','塔冠检修路径与设备平面不完整','侧后面缺少后勤/入口独立设计','幕墙仍为体量代理，不是正式产品几何','细窗梃仍有远距锯齿，未做合格LOD'],next_dependency='FORMAL_FACADE_PRODUCTION_BLOCKED'))
 dump(D/'SCORING.json',scoring);return scoring
def tasks():
 source=(D/'SOURCE_V16.txt').read_text()
 lines=re.findall(r'^(W\d\d)｜(.*?)：(.*?)$',source,re.M)
 all_tasks=[]
 for wid,title,body in lines:
  chunks=re.findall(r'(\d\d)(.*?)(?=；\d\d|。|$)',body)
  for num,text in chunks[:10]:
   id=wid+'-'+num;related=[]
   if wid=='W01':related=['B021','B023','B024','C161','C162']
   elif wid=='W02':related=['A001','A004','A005','B041','B043','B059','C002','C182']
   elif wid=='W03':related=['A021','A022','A026','A029','A030','C021','C022','C037','C040','C183']
   else:related={'W04':['A041','A045','C031','C048'],'W05':['A201','A241','C061','C068','C185'],'W06':['A061','A069','B103','C041','C060','C184'],'W07':['A101','A141','A161','C096','C100'],'W08':['A301','A321','A341','C102','C107','C190'],'W09':['B140','C003','C173','C194'],'W10':['B161','C141','C160','C191','C192']}[wid]
   if wid=='W01':status='READY_FOR_RETEST';evidence=['work/citylight-v16-checkpoint/snapshot.json','docs/citylight/v16/SCOPE_AND_RUBRIC.md','docs/citylight/v16/REQUIREMENTS.json']
   elif wid in ['W02','W03']:status='REWORKING';evidence=['public/models/citylight/v16-study/r3/manifest.json','docs/citylight/v16/SCORING.json']
   else:status='NOT_STARTED';evidence=[]
   all_tasks.append(dict(id=id,title=text.strip().lstrip('；'),group=title,status=status,score=None,gate=90 if wid=='W02' else 98,source_item_ids=related,evidence=evidence,userApproved=False,dependency='W02 concept >=90 and W03 geometry >=98' if int(wid[1:])>=4 else None))
 assert len(all_tasks)==100,len(all_tasks)
 dump(D/'TASKS.json',dict(version='V16',count=100,tasks=all_tasks))
 for name in ['TASKS.json','GATE_REGISTER.json']:
  if (R/'docs/citylight'/name).exists():continue
  if name=='TASKS.json':dump(R/'docs/citylight'/name,dict(active_version='V16',registry='v16/TASKS.json',historical_versions_preserved=True))
  else:dump(R/'docs/citylight'/name,dict(active_version='V16',registry='v16/GATE_REGISTER.json',historical_versions_preserved=True))
 gate=dict(version='V16',status='FAILED_GATE',assets=[dict(asset='CL-T01-V16-CRYSTAL',stage='CONCEPT_GEOMETRY_RESEARCH',status='FAILED_GATE',concept_score=79,concept_gate=90,geometry_score=65,geometry_gate=98,approval=False)],axes={x:dict(score=None,status='NOT_READY') for x in ['H98','E98','A98','C98','X98']},next_formal_building=dict(status='NOT_STARTED',locked=True,reason='首塔未内部通过，用户未认可'),production_deploy=False,paid_calls=0)
 dump(D/'GATE_REGISTER.json',gate)
def assemble():
 P.mkdir(parents=True,exist_ok=True)
 for p in (O/'matrix-r4').glob('*.png'):copy(p,P/'images'/p.name)
 for p in (O/'video-r3').glob('*'):
  if p.suffix in ['.mp4','.webm','.vtt','.json','.png']:copy(p,P/'video'/p.name)
 for p in (O/'resilience-r1').glob('*.png'):copy(p,P/'failures'/p.name)
 for a,n in [('front.png','original-tower-front.png'),('entry.png','original-tower-entry.png'),('window.png','original-tower-window.png')]:copy(O.parent/'citylight-v14/before'/a,P/'history'/n)
 for a,n in [
  (O/'matrix-r4/study.json','browser-study.json'),(O/'matrix-r3/study.json','prior-matrix.json'),(O/'visual-r2/study.json','failed-loading.json'),(O/'visual-r2b/study.json','failed-float-equality.json'),
  (O/'build-r3/crystal-validator.json','crystal-validator.json'),(O/'build-r3/terrace-validator.json','terrace-validator.json'),
  (O/'protection.json','protection.json'),(O/'resilience-r1/resilience.json','resilience.json'),(O/'failures/initial-study.json','initial-study.json'),
  (O/'review-tests-r3/media-tests.json','media-tests.json'),(O/'review-tests-r3/review-tests.json','review-tests.json'),
  (O/'review-tests-r2/review-tests.json','failed-offline-review.json'),(O/'review-tests-r1/media-tests.json','prior-media-failure.json'),
  (O/'build-final-r3/build.json','build-final.json'),(O/'final-code-checks.json','final-code-checks.json'),
  (D/'SCORING.json','SCORING.json'),(D/'GATE_REGISTER.json','GATE_REGISTER.json'),(D/'TASKS.json','TASKS.json'),(D/'REQUIREMENTS.json','REQUIREMENTS.json'),
  (R/'public/models/citylight/v16-study/r3/manifest.json','models.json')]:
  if a.exists():copy(a,P/'raw'/n)
 for f in ['STAGE_REPORT.md','SCORING.md','FAILURES.md','RUN_STATE.md','SOURCE_LICENSES.csv']:
  if (D/f).exists():copy(D/f,P/'raw'/f)
 for name,file in [
  ('reference-day.png','codex-clipboard-af95c007-8991-440a-952e-85f4aea3becf.png'),
  ('reference-sunset.png','codex-clipboard-b8cf2ed6-19e5-4218-bd51-921b69728419.png'),
  ('reference-night.png','codex-clipboard-e0089fb7-745d-4c5a-93b0-b03709f73c66.png'),
  ('reference-triptych.png','codex-clipboard-b5083412-90d6-48c5-8cde-000745f0f41e.png')]:
  copy(Path('C:/Users/23242/AppData/Local/Temp')/file,P/'references'/name)
 # JPEG thumbnails are previews only; original PNG evidence is retained untouched.
 from PIL import Image
 for p in (P/'images').glob('*.png'):
  dest=P/'thumbs'/(p.stem+'.jpg');dest.parent.mkdir(parents=True,exist_ok=True)
  with Image.open(p) as im:im.convert('RGB').resize((600,round(im.height*600/im.width))).save(dest,quality=82)
 copy(R/'scripts/citylight/v16-review.html',P/'index.html')
 # Local file:// previews cannot fetch JSON. Ship the same actual reports as inert local data.
 data={n:json.loads((P/'raw'/f).read_text(encoding='utf8')) for n,f in [('study','browser-study.json'),('protection','protection.json')]}
 (P/'report-data.js').write_text('window.CITYLIGHT_REPORTS='+json.dumps(data,ensure_ascii=False)+';',encoding='utf8')
def package():
 target=O/'review';shutil.copytree(P,target,dirs_exist_ok=True)
 records=[]
 for p in sorted(target.rglob('*')):
  if p.is_file() and p.name!='manifest.json':
   assert not p.name.startswith('.env');records.append(dict(path=p.relative_to(target).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
 dump(target/'manifest.json',records)
 dest=O/'城市有光_V16_过程证据_未通过.zip'
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
  for p in target.rglob('*'):
   if p.is_file():z.write(p,p.relative_to(target).as_posix())
 with zipfile.ZipFile(dest) as z:assert z.testzip() is None
 print(json.dumps(dict(evidenceFiles=len(records),zip=str(dest),zipBytes=dest.stat().st_size),ensure_ascii=False))
if __name__=='__main__':
 import sys
 command=sys.argv[1]
 if command=='protect':print(json.dumps(protect(),ensure_ascii=False))
 elif command=='score':scoring();tasks()
 elif command=='review':assemble()
 elif command=='package':package()
