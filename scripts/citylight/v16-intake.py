"""V16 intake, appendices and safe checkpoint. Never copies credentials."""
from pathlib import Path
import re,json,hashlib,shutil,subprocess
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[2]
SRC=Path('C:/Users/23242/.codex/attachments/97bbbe5f-9085-419f-ae73-7917af9f8065/Pasted text.txt')
D=R/'docs/citylight/v16'
O=Path('C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v16')
W=R/'work/citylight-v16-checkpoint'
for p in (D,O,W):p.mkdir(parents=True,exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,x):
 if p.exists():raise RuntimeError('Preserve earlier output: '+str(p))
 p.parent.mkdir(parents=True,exist_ok=True)
 p.write_text(json.dumps(x,ensure_ascii=False,indent=2) if not isinstance(x,str) else x,encoding='utf8')
text=SRC.read_text(encoding='utf-8-sig')
items=[];category=''
lines=text.splitlines()
for i,line in enumerate(lines):
 if re.match(r'^[ABCU]\d\d｜',line):category=line
 m=re.match(r'^([ABCU]\d{3})｜问：(.*)',line)
 if m:
  answer=lines[i+1].removeprefix('答：').strip()
  items.append(dict(source_item_id=m[1],category=category,question=m[2],prescribed_action=answer,source_line=i+1,target_asset_id='CL-T01',actual_status='UNVERIFIED',action_commit=None,evidence=[],score=None,reviewer=None,next_dependency=None))
counts={p:sum(x['source_item_id'].startswith(p) for x in items) for p in 'ABCU'}
assert counts==dict(A=500,B=200,C=200,U=50),counts
write(D/'REQUIREMENTS.json',dict(source_sha256=sha(SRC),source_lines=len(lines),counts=counts,items=items,source_warning='After U050 the pasted source contains an incomplete JSON example. The 950 numbered Q/A records above are intact. Parsed answers are requirements, not actual achievements.'))
write(D/'SOURCE_V16.txt',text)
paths=set()
old=json.loads((R/'work/citylight-v14-checkpoint/snapshot.json').read_text(encoding='utf8'))
for f in old['files']:
 p=R/f['path']
 if p.is_file() and not p.name.startswith('.env'):paths.add(p)
for pattern in ['app/citylight/**/*','components/3d/Citylight*.tsx','lib/citylight/**/*','scripts/citylight/**/*','browser-tests/citylight-v14*','public/models/citylight/v14-lab/**/*']:
 for p in R.glob(pattern):
  if p.is_file() and p.suffix not in ('.pyc',):paths.add(p)
entries=[]
for p in sorted(paths):
 h=sha(p);target=W/'objects'/h
 target.parent.mkdir(parents=True,exist_ok=True)
 if not target.exists():shutil.copy2(p,target)
 assert sha(target)==h
 entries.append(dict(path=p.relative_to(R).as_posix(),sha256=h,bytes=p.stat().st_size,backup='objects/'+h))
# Restore rehearsal outside the running project tree.
rehearsal=W/'rehearsal'
for rel in ['app/citylight/review/page.tsx','components/3d/CitylightV12Studio.tsx','public/models/citylight/v12/light-court.glb','app/api/tts/route.ts']:
 f=next(x for x in entries if x['path']==rel)
 dest=rehearsal/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(W/f['backup'],dest);assert sha(dest)==f['sha256']
write(W/'snapshot.json',dict(at=datetime.now(timezone.utc).isoformat(),head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=R,text=True).strip(),status=subprocess.check_output(['git','status','--short'],cwd=R,text=True),files=entries,credentials_copied=False,restore_rehearsal='4 files including original GLB/TTS/review/source verified in isolated folder'))
failed=R/'scripts/citylight/build-v16-tower-study.py'
if failed.exists():
 cp=W/'failed-initial-study.py';shutil.copy2(failed,cp)
 write(O/'failures/initial-study.json',dict(status='FAILED_GATE',output_created=False,source_sha256=sha(failed),exception="KeyError: 'v12-lobby-glass'",cause='Initial generator used an undefined material and simple regular octagonal massing. Not accepted as concept.',decision='Retain source. Replace only this newly authored generator with a bounded massing A/B study; no formal material/street production.'))
write(D/'SCOPE_AND_RUBRIC.md',"""# V16 接管与冻结边界
当前对象仅 CL-T01／G2。用户原塔评价约35–40，概念图约70；不自动提高。
950条 A/B/C/U 已按原文保存为 REQUIREMENTS.json，每项初始 UNVERIFIED。
原始粘贴文本末尾有截断的 JSON 示例；U050 正式问答及末尾执行要求完整保留。
不把导入950条误写为执行950项。

## 本轮允许修改
新增V16体量研究脚本、独立工作台、研究GLB、浏览器测试、中文证据页与V16文档。
已有 /citylight/review 仅在内容经过测试后最小更新跳转，修改前检查点可恢复。
不替换V12/V14模型，不改TTS/Decart/认证/公式/依赖/配置，不停服、不部署、不收费。

## 预先冻结的评分
概念：轮廓25、可建模性25、五视角一致20、创新15、后续光照与室内潜力15；>=90才允许正式几何。
关键几何：轮廓22、结构逻辑20、正背侧顶完整20、细节18、人尺度10、真实模型证据10；>=98且硬缺陷0才允许正式材质生产。
评分包含模型哈希、源代码哈希、相机/时间/画质、扣分与评分者。没有独立审查和用户确认不得称最终验收。
小型A/B研究与缺陷修复不解锁正式下游。第二栋保持 NOT_STARTED。
H98/E98/A98分别独立评估，C98/X98在本阶段 NOT_READY。

## 已有成果保护
完整未提交工作树保留，新增检查点 work/citylight-v16-checkpoint/snapshot.json。
备份不复制.env，4个文件含原GLB/TTS/入口/源码在隔离目录恢复演练。
""")
print(json.dumps(dict(requirements=counts,checkpoint_files=len(entries),restore_verified=4,paid_calls=0),ensure_ascii=False))

