"""Verify and export the current failed-gate study; never export environment files."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
import hashlib,json,zipfile

R=Path(__file__).resolve().parents[2]
O=Path('C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v16')
P=R/'public/citylight-review-v16'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ['src','href'] and v:self.links.append(v)

parser=Links();parser.feed((P/'index.html').read_text(encoding='utf8'))
relative=[x for x in parser.links if not urlsplit(x).scheme and not x.startswith(('/','#'))]
missing=[x for x in relative if not (P/unquote(urlsplit(x).path)).is_file()]
for engine in ['chromium','firefox','webkit']:
 for candidate in ['crystal','terrace','baseline']:
  for view in ['front','rear','left','right','roof','eye','detail','hero']:
   for folder,ext in [('images','png'),('thumbs','jpg')]:
    name=f'{folder}/{engine}-{candidate}-{view}.{ext}'
    if not (P/name).is_file():missing.append(name)
assert not missing,missing

assets=json.loads((R/'public/models/citylight/v16-study/r3/manifest.json').read_text())
asset_records=[]
for a in assets:
 glb=R/'public'/a['uri'].lstrip('/');source=R/a['source']
 assert sha(glb)==a['sha256']
 # Frozen R3 exporter uses sourceHash for the generator, not the .blend file.
 assert sha(R/a['script'])==a['sourceHash']
 asset_records.append(dict(assetId=a['assetId'],glbSHA256=sha(glb),blendSHA256=sha(source),generatorSHA256=sha(R/a['script']),manifestSourceHashMeaning='generator script SHA256'))

allowed=['scripts/citylight/build-v16-massing.py','components/3d/CitylightTowerStudy.tsx','app/citylight/tower-study/page.tsx','app/citylight/tower-study/tower-study.css','public/models/citylight/v16-study/r3/manifest.json','docs/citylight/v16/SOURCE_LICENSES.csv','docs/citylight/v16/SCORING.json']
for a in assets:allowed.extend(['public'+a['uri'],a['source'],str(Path(a['source']).with_name('design-card.json'))])
records=[dict(path=p,sha256=sha(R/p),bytes=(R/p).stat().st_size) for p in allowed]
dest=O/'首塔_R3_研究源资产_未通过.zip'
assert all('.env' not in Path(x).name for x in allowed)
with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED) as z:
 for p in allowed:z.write(R/p,p)
 z.writestr('资产清单.json',json.dumps(records,ensure_ascii=False,indent=2))
 z.writestr('请先阅读.txt','FAILED_GATE / REWORKING。真实Blender与GLB白模研究，不是正式玻璃首塔。不得解锁第二栋。仅含显式白名单资产与相关源码，无.env、无密钥。GLB和blend哈希见资产清单。')
with zipfile.ZipFile(dest) as z:assert z.testzip() is None

snapshot=json.loads((R/'work/citylight-v16-checkpoint/snapshot.json').read_text())
original={x['path'] for x in snapshot['files']}
paths=['app/citylight/review/page.tsx','components/3d/CitylightTowerStudy.tsx','app/citylight/tower-study/page.tsx','app/citylight/tower-study/tower-study.css','docs/citylight/GATE_REGISTER.json','docs/citylight/TASKS.json']
for folder in ['scripts/citylight','browser-tests','docs/citylight/v16','public/citylight-review-v16','public/models/citylight/v16-study']:
 for p in (R/folder).rglob('*'):
  if p.is_file() and '__pycache__' not in str(p) and (folder not in ['scripts/citylight','browser-tests'] or 'v16' in p.name):paths.append(p.relative_to(R).as_posix())
changes=[dict(path=p,type='controlled-existing-edit' if p in original else 'added',sha256=sha(R/p),bytes=(R/p).stat().st_size) for p in sorted(set(paths))]
(O/'变更清单.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2),encoding='utf8')
restore=snapshot['files'][next(i for i,x in enumerate(snapshot['files']) if x['path']=='app/citylight/review/page.tsx')]['backup']
rollback=f'''# 本轮范围与回滚说明

当前首塔仍 FAILED_GATE / REWORKING，禁止第二栋。
已有415项检查点文件仅证据入口受控更新；其余414项应保持原哈希。
入口原文备份：work/citylight-v16-checkpoint/{restore}
仅需回退入口时，先确认当前入口仍是本轮哈希，再把该备份复制回 app/citylight/review/page.tsx。
这只是恢复说明，本轮没有回退用户工作树，也不要使用git reset或clean。
新增研究文件不覆盖旧GLB，旧塔与V14仍可使用；详细新增文件及SHA见变更清单.json。
没有改.env、TTS/Decart核心、认证、依赖、锁文件或Netlify生产设置。
不保证整仓库既有未提交文件均由本轮创建；完整旧工作树原状记录仍在检查点snapshot.json。
研究源包显式白名单包含两套源blend、GLB、设计数据与相关源码，不包含整个仓库。
'''
(O/'保护与回滚.md').write_text(rollback,encoding='utf8')
result=dict(localRelativeLinks=len(set(relative)),missingLinks=missing,assetHashesVerified=asset_records,sourceZip=dict(path=dest.name,bytes=dest.stat().st_size,sha256=sha(dest),crcVerified=True),paidAPICalls=0,gate='FAILED_GATE')
(O/'交付完整性.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(result,ensure_ascii=False))
