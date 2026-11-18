"""Explicit V14 research commands. No production commands, no paid requests."""
from pathlib import Path
import argparse, json, shutil, csv, hashlib, html, zipfile, subprocess, os
from datetime import datetime, timezone
R=Path(__file__).resolve().parents[2];D=R/'docs/citylight/v14'
O=Path('C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v14')
P=R/'public/citylight-review-v14';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
def cp(a,b):b.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(a,b)
def ledger():
 assets=[dict(id='CL-T01-V12',type='original-tower',file='public/models/citylight/v12/light-court.glb',source='work/light-court-v12.blend',status='FAILED_GATE',userVisualScore='约35或更低，V14评价',internallyPassed=False),dict(id='CL-G2-FACADE-14',type='research-specimen',file='public/models/citylight/v14-lab/facade-specimen.glb',source='work/citylight-v14-assets/CL-G2-FACADE-14/source.blend',script='scripts/citylight/build-v14-facade.py',status='IN_PROGRESS',score=None,internallyPassed=False)]
 for a in assets:a['sha256']=sha(R/a['file'])
 dump(D/'ASSET_REGISTRY.json',dict(version='V14',assets=assets))
 tasks=[dict(taskId='G0-SAFETY',scope='392 selected existing files backup + restore rehearsal',score=None,status='IN_PROGRESS',evidence=['work/citylight-v14-checkpoint/snapshot.json'],blockingDefects=['final preservation recheck pending']),dict(taskId='G1-420',scope='initial audit not quality score',score=None,status='IN_PROGRESS',evidence=['docs/citylight/v14/LEARN20.md','docs/citylight/v14/DIAG200.md','docs/citylight/v14/IMPROVE200.md','docs/citylight/v14/INSIGHTS.md'],blockingDefects=['majority of individual asset questions UNVERIFIED; not 420 tests passed']),dict(taskId='G2-P06-LAB',scope='licensed HDR/PBR/local reflection experiment',score=None,status='FAILED_GATE',evidence=['public/models/citylight/v14-lab/manifest.json'],blockingDefects=['near reflection/parallax unresolved','furniture not independently passed','five physical lighting states incomplete']),dict(taskId='G2-TOWER',scope='tower redesign and seven views',score=None,status='FAILED_GATE',evidence=['public/models/citylight/v12/manifest.json'],blockingDefects=['user art acceptance missing','original tower not rebuilt']),dict(taskId='G4-SECOND-BUILDING',scope='formal second building production',score=None,status='LOCKED',evidence=[],blockingDefects=['G2 tower not passed'])]
 for t in tasks:t.update(gate=98,rubricVersion='v14-frozen',baselineCommit='7aff20a198991db9694e32d86d2f972943ca128f',candidateCommit=None,workingTreeManifest='protection-current.json',reviewer='Codex source and actual screenshot inspection; not user approval',userApproved=False)
 dump(D/'TASK_GATE_LEDGER.json',dict(version='V14',state='IN_PROGRESS',axes={k:dict(score=None,status='NOT_READY') for k in ['H','C','X','E','A']},userVisualBaseline='约35/100或更低；不自动提高',tasks=tasks))
 (D/'BUILDING_QA.md').write_text('# G2质量扣分与未验证项\n\n原塔仍为用户约35或更低；本轮没有重新给原塔打分。CL-G2-FACADE-14只是研究试件。\n\n冻结量表：轮廓结构20；幕墙近景20；材质反射20；室内家具15；五态照明15；实渲性能10。各项候选分数均null/UNVERIFIED，不用虚拟总分放行。\n\n硬缺陷：未重做原塔剪影与入口；单点反射无视差；家具材质未通过母版审查；仅夕阳HDR近似全天；完整手机真实设备未测。均阻断H98。首轮玻璃发雾和摄影机遮挡的失败保留。\n',encoding='utf8')
 for file,title,reason in [('CITY_QA.md','城市C98','没有完整原创城市，禁止用反射测试体算城市'),('CAMERA_AND_STORY_TESTS.md','交互X98','试件有Orbit/Esc/固定机位，不等于六模式/八幕/WALK碰撞')]:
  (D/file).write_text(f'# {title}\n\nNOT_READY / UNVERIFIED。{reason}。原塔和旧站不因试件技术检查通过而获得放行。\n',encoding='utf8')
def gate():
 j=json.loads((D/'TASK_GATE_LEDGER.json').read_text());checks=[]
 for t in j['tasks']:
  missing=[p for p in t['evidence'] if not (R/p).is_file()]
  checks.append(dict(id=t['taskId'],evidencePresent=not missing,missing=missing,passGate=t['score'] is not None and t['score']>=98 and not t['blockingDefects'] and not missing,status=t['status']))
 result=dict(status='FAILED_GATE',reason='No self-awarded98. Tower/material evidence incomplete; next formal building LOCKED',checks=checks,userApproved=False)
 dump(O/'gate-check.json',result);print(json.dumps(result,ensure_ascii=False));return 1
def review():
 matrix=json.loads((O/'lab-r3/browser-matrix.json').read_text());P.mkdir(parents=True,exist_ok=True)
 available=[]
 for p in (O/'lab-r3').glob('*.png'):cp(p,P/'images'/p.name);available.append(p.name)
 for p in (O/'camera-r4').glob('*.png'):cp(p,P/'images'/p.name)
 for p in (O/'reflection-factor').glob('*.png'):cp(p,P/'factor'/p.name)
 for p in (O/'before').glob('*'):cp(p,P/'before'/p.name)
 cp(O/'lab-r1/chromium-morning-local.png',P/'failures/occluded.png')
 for p in (O/'video-r2').glob('*'):
  if p.suffix in ['.mp4','.webm','.vtt','.json','.png']:cp(p,P/'video'/p.name)
 for source,name in [(O/'lab-r3/browser-matrix.json','browser-matrix.json'),(O/'camera-r4/camera-retest.json','camera-retest.json'),(R/'work/citylight-v14-validator.json','validator.json'),(R/'public/models/citylight/v14-lab/resources/sources.json','sources.json'),(O/'video-r2/recording.json','recording.json'),(D/'TASK_GATE_LEDGER.json','TASK_GATE_LEDGER.json'),(D/'STAGE_REPORT.md','STAGE_REPORT.md')]:
  if source.exists():cp(source,P/'raw'/name)
 for source,name in [(O/'media-mre/media-mre.json','media-mre.json'),(O/'review-test/review-tests.json','review-tests.json')]:
  if source.exists():cp(source,P/'raw'/name)
 rows=[]
 for browser,r in matrix['browsers'].items():
  vals=[]
  for method in ['hdr','local','opaque']:
   sample=next((s for s in r['experiments'] if s['id']=='sunset-'+method),None)
   vals.append(f"{sample['fps']:.2f} / {sample['p95']:.2f}ms" if sample else 'UNVERIFIED')
  checks=f"{sum(c.get('pass',False) for c in r['checks'])}/{len(r['checks'])}；{r.get('status','运行未结束')}"
  rows.append('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in [browser,*vals,checks])+'</tr>')
 defects=[('玻璃发雾','透射0.82/粗糙0.085组合使窗后细节丢失。候选改为1.0/0.02并使用白色基色；近景对照可见清晰度差异。尚未单因素归因；不计原塔升级。下一步单独拆粗糙度与透射贡献。'),('反射仍未可信','新接入真实128局部捕获和HDR环境，两者同机位对照；单点探针无视差，邻楼图样仍需放大判断。下一步关阴影做四状态差分，避免把地面阴影算成反射收益。'),('室内不够真实','已做两种用途、弯曲椅背、脚轮、线槽和吊灯；没有A级独立转台签收，墙地材质与接触阴影仍原型。下一步先审一个家具母版。'),('原塔整改未完成','原塔仍旧模型，未改剪影和入口；保留冻结基线与全部历史。下一步两套原创白模四面试验，不正式生产第二栋。'),('五态光照未齐','本轮测晨/夕/夜并提供白天蓝调交互；HDR仍共用夕阳一套，不能称物理五态照明完成。'),('工程缺口继续保留','本轮小试件检查不等于原塔性能与历史WebKit媒体问题已解决。手机真机和完整故事尚未验证，E/X/A均不放行。')]
 cards=''.join('<article class="card"><h3>'+html.escape(a)+'</h3><p>'+html.escape(b)+'</p><p class="caption">状态：未达到98；扣分项保留，未自行上调用户分数。</p></article>'for a,b in defects)
 template=(R/'scripts/citylight/v14-review.html').read_text(encoding='utf8');template=template.replace('__PERF_ROWS__',''.join(rows)).replace('__DEFECTS__',cards).replace('__AVAILABLE__',json.dumps(available)).replace('__TIMESTAMP__',datetime.now(timezone.utc).isoformat())
 (P/'index.html').write_text(template,encoding='utf8');print('Current review generated; no legacy V13 page overwritten')
def protection():
 j=json.loads((R/'work/citylight-v14-checkpoint/snapshot.json').read_text());changes=[]
 for f in j['files']:
  p=R/f['path']
  if not p.exists() or sha(p)!=f['sha256']:changes.append(dict(path=f['path'],exists=p.exists(),before=f['sha256'],after=sha(p) if p.exists() else None))
 result=dict(protected=len(j['files']),unchanged=len(j['files'])-len(changes),changes=changes,envRead=False,paidCalls=0,productionDeploy=False)
 dump(O/'protection-current.json',result);print(json.dumps(result,ensure_ascii=False))
def package():
 assert (P/'index.html').exists();target=O/'review';shutil.copytree(P,target,dirs_exist_ok=True)
 manifest=[]
 for p in sorted(target.rglob('*')):
  if p.is_file() and p!=target/'manifest.json':
   assert not p.name.startswith('.env');manifest.append(dict(path=p.relative_to(target).as_posix(),bytes=p.stat().st_size,sha256=sha(p)))
 dump(target/'manifest.json',manifest)
 dest=O/'城市有光_V14_透明研究证据.zip'
 with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED)as z:
  for p in target.rglob('*'):
   if p.is_file():z.write(p,p.relative_to(target))
 with zipfile.ZipFile(dest)as z:assert z.testzip() is None
 print(json.dumps(dict(files=len(manifest),zipBytes=dest.stat().st_size,zip=str(dest)),ensure_ascii=False))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('command',choices=['init-ledger','gate-check','make-review','protection','package-evidence','render-proof','browser-matrix','validate-asset']);a=parser.parse_args()
 if a.command=='init-ledger':ledger()
 elif a.command=='gate-check':raise SystemExit(gate())
 elif a.command=='make-review':review()
 elif a.command=='protection':protection()
 elif a.command=='package-evidence':package()
 elif a.command in ['render-proof','browser-matrix']:
  env=os.environ.copy();env['PLAYWRIGHT_BROWSERS_PATH']='D:/PlaywrightBrowsers';env['CITYLIGHT_OUTPUT']=str(O/'manual-browser-run');raise SystemExit(subprocess.call(['node','browser-tests/citylight-v14-lab.cjs'],cwd=R,env=env))
 elif a.command=='validate-asset':
  assert (R/'work/citylight-v14-assets/CL-G2-FACADE-14/source.blend').exists();assert (D/'LICENSE_REGISTER.csv').exists()
  code="const fs=require('fs'),v=require('./work/citylight-v11-tools/node_modules/gltf-validator');v.validateBytes(new Uint8Array(fs.readFileSync('public/models/citylight/v14-lab/facade-specimen.glb')),{uri:'facade-specimen.glb'}).then(r=>{fs.writeFileSync('work/citylight-v14-validator.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r.issues));process.exitCode=r.issues.numErrors?1:0});"
  raise SystemExit(subprocess.call(['node','-e',code],cwd=R))
