"""Decode source-side marker pixels to true MP4 PTS (25 fps), never infer from wall time."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=Path(r'C:/Users/23242/Documents/Codex/2026-11-03/chromium-firefox-webkit-1-2-3/outputs/citylight-v13/video-calibrated-r2')
ff=ROOT/'node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe'
def run(args):
    result=subprocess.run([str(ff),'-hide_banner','-nostdin',*args],capture_output=True)
    (OUT/'transcode-and-decode.log').open('ab').write(result.stderr)
    if result.returncode:raise RuntimeError('ffmpeg failed; see saved log')
    return result
def timestamp(seconds):
    ms=round(seconds*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
def main():
    record=json.loads((OUT/'recording.json').read_text(encoding='utf-8'))
    if not (OUT/'operation.mp4').exists():run(['-n','-i',str(OUT/'operation.webm'),'-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart','-an',str(OUT/'operation.mp4')])
    # Existing source badge occupies x=0..63,y=0..63. Averages one central 16px patch.
    result=run(['-i',str(OUT/'operation.mp4'),'-vf','crop=16:16:8:8,scale=1:1,format=rgb24','-vsync','0','-f','rawvideo','pipe:1'])
    rgb=result.stdout;first={}
    for i in range(len(rgb)//3):
        pixel=list(rgb[i*3:i*3+3]);dist=[sum((a-b)**2 for a,b in zip(pixel,e['color'])) for e in record['timelineWallClock']];event=min(range(len(dist)),key=dist.__getitem__)
        if dist[event]<1500:first.setdefault(event,i/25)
    if not all(i in first for i in [0,1,2]):raise RuntimeError('The required orbit and entry markers are missing')
    missing=[e for e in record['timelineWallClock'] if e['event'] not in first]
    timeline=[{'seconds':first[e['event']],'text':e['text'],'event':e['event'],'source':'first source-side colour marker frame decoded at 25fps'} for e in record['timelineWallClock'] if e['event'] in first]
    duration=len(rgb)//3/25
    vtt='WEBVTT\n\n'
    for i,e in enumerate(timeline):
        end=timeline[i+1]['seconds'] if i+1<len(timeline) else duration
        vtt+=f"{i+1}\n{timestamp(e['seconds'])} --> {timestamp(end)}\n{e['text']}\n\n"
    (OUT/'operation.vtt').write_text(vtt,encoding='utf-8')
    record.update(status='PARTIAL_PTS_CALIBRATED' if missing else 'PTS_CALIBRATED',timelinePTS=timeline,unrecordedTailEvents=missing,decodedFrames=len(rgb)//3,decodedDurationSeconds=duration,codec='H.264 High / yuv420p / 1440x1100 / 25fps',wallClockIsNotVideoPTS=True,limitation='源页相机回读验证了Esc，但录屏未记录末段；视频只证明环绕与入口。不可声称本片完整展示了Esc。' if missing else '')
    (OUT/'recording.json').write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding='utf-8')
    if not (OUT/'entry.png').exists():run(['-n','-ss',str(max(0,duration-.4)),'-i',str(OUT/'operation.mp4'),'-frames:v','1',str(OUT/'entry.png')])
    run(['-v','error','-i',str(OUT/'operation.mp4'),'-f','null','-'])
    print(json.dumps({'frames':record['decodedFrames'],'duration':duration,'timelinePTS':timeline},ensure_ascii=False))
if __name__=='__main__':main()
