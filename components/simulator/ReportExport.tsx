'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { useDataStore } from '@/lib/stores/DataStore';
import { useSimulator } from '@/lib/core/SimulatorEngine';
import { useUIStore } from '@/lib/stores/UIStore';
import { FACTORS } from '@/lib/emissions';
import { evidenceContext } from '@/lib/ai/evidence';
import { REFERENCES } from '@/lib/references';
import { THEMES, useCarbonStore } from '@/lib/store';
import { recordLearning } from '@/lib/storage/LearningDB';
import {useTwinStore} from '@/lib/experience/store';
import {calculateSpace,SPACES,OBJECTS,spaceForBuilding} from '@/lib/experience/spaces';
import { latestARSnapshot } from '@/lib/storage/ARSnapshot';

export default function ReportExport() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const result = useDataStore(s => s.emissions), { inputs } = useSimulator(), advice = useUIStore(s => s.advice);
  const pending = useUIStore(s => s.chartPending), networkBusy = useUIStore(s => s.networkBusy);
  const identity = useCarbonStore(s => s.activeIdentity);
  const exportPDF = async () => {
    if (!result || busy || pending || networkBusy) return;
    setBusy(true); setError('');
    // Freeze values and canvas images synchronously, so later slider edits cannot mix revisions.
    const twin=useTwinStore.getState(),energy={...twin.energy},devices={...twin.devices},kind=spaceForBuilding(twin.experience.building),spaceResult=calculateSpace(kind,energy,devices),selected=twin.experience.selected,guideContext=useUIStore.getState().adviceContext,roomContext=evidenceContext(kind,selected,energy,devices,inputs),currentAdvice=guideContext===roomContext?advice:'',snapshotState=twin.experience.state;
    let sceneImage='';window.dispatchEvent(new CustomEvent('twin-capture',{detail:{done:(data:string)=>{sceneImage=data;}}}));
    const activity = { ...inputs }, calculation = result, recommendation = currentAdvice, perspective = THEMES[identity].label;
    const chartImages = Array.from(document.querySelectorAll<HTMLCanvasElement>('#carbon-report .emission-charts canvas')).map(canvas => {try{return canvas.toDataURL('image/png');}catch{return '';}});
    const evidence=guideContext===roomContext?useUIStore.getState().adviceCitations:[],snapshotTime=new Date().toISOString();
    const pages: HTMLDivElement[] = [];
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const makePage = (number: number) => {
        const page = document.createElement('div');
        page.style.cssText = 'position:fixed;left:-12000px;top:0;width:794px;min-height:1123px;padding:48px 52px;box-sizing:border-box;background:#F3F2EB;color:#152B32;font:14px/1.7 Arial,"Microsoft YaHei",sans-serif;';
        document.body.append(page); pages.push(page);
        const brand = document.createElement('div'); brand.textContent = `CARBONTWIN / PERSONAL FIELD NOTES                                      ${String(number).padStart(2, '0')}`;
        brand.style.cssText = 'font-size:10px;letter-spacing:2px;border-bottom:1px solid #BAC7BB;padding-bottom:18px;color:#456151;'; page.append(brand); return page;
      };
      const text = (parent: HTMLElement, tag: string, value: string, style = '') => { const element = document.createElement(tag); element.textContent = value; element.style.cssText = style; parent.append(element); return element; };
      const cover=makePage(1);cover.style.background='#10251F';cover.style.color='#E8EDE1';
      text(cover,'p','A FIELD GUIDE TO EVERYDAY CHOICES','font-size:10px;letter-spacing:2px;color:#B9CFBB;margin-top:88px;');
      text(cover,'h1','看见选择的重量。','font:52px/1.35 Georgia,"Microsoft YaHei",serif;margin:26px 0;');
      text(cover,'p','空间与个人碳排白皮书','font-size:22px;color:#D4C3A2;');
      text(cover,'div',`${spaceResult.scope2Daily.toFixed(3)} kg CO₂ / 日`,'font:38px/1.6 Georgia,serif;margin-top:72px;color:#BBD4BF;');
      text(cover,'p',`${SPACES[kind].name} · ${spaceResult.daily.toFixed(3)} kWh / 日`,'font-size:14px;');
      text(cover,'p','这不是一份认证清单。它记录一次可追溯的情景实验：在同一时点冻结输入，用统一方法比较选择。','max-width:450px;font-size:16px;line-height:2;margin-top:40px;color:#CFDACB;');
      text(cover,'p',new Date().toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'})+' / 北京时间','font-size:11px;margin-top:80px;color:#B7C9B7;');
      text(cover,'p','LOCAL RECORD / 浏览器本地记录','font-size:10px;color:#B7C9B7;');
      const first = makePage(2);
      text(first, 'h1', '看见选择的重量。', 'font:38px/1.2 Georgia,"Microsoft YaHei",serif;margin:32px 0 12px;');
      text(first, 'p', `个人行为情景报告 / ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}（北京时间）`, 'font-size:11px;color:#5C7268;margin:0 0 26px;');
      text(first, 'p', `本地学习记录 / ${perspective}视角`, 'font-size:10px;color:#53665D;');
      text(first, 'div', `${(calculation.annual / 1000).toFixed(2)} t / year`, 'font:italic 66px/1.3 Georgia,serif;color:#1D5E4C;padding-bottom:10px;');
      text(first, 'p', `年度教学估算 · 固定习惯 ${calculation.startYear}—2050：${(calculation.cumulative / 1000).toFixed(2)} t`, 'font-size:12px;margin:10px 0 24px;');
      const table = document.createElement('table'); table.style.cssText = 'width:100%;border-collapse:collapse;margin:22px 0;'; first.append(table);
      for (const [label, value] of [['活动 / 年度排放', '输入值'], ...calculation.sectors.map((sector,index) => [`${sector.name} / ${(sector.value/1000).toFixed(3)} t`, [`${activity.electricity} kWh / 月`,`${activity.gasoline} L / 月`,`${activity.beef} kg / 周`][index]])]) {
        const row = table.insertRow(); for (const valueText of [label, value]) { const cell = row.insertCell(); cell.textContent = valueText; cell.style.cssText = 'padding:10px 12px;border-bottom:1px solid #CAD4CA;text-align:left;'; }
      }
      const visual = document.createElement('div'); visual.style.cssText = 'background:#0B1827;padding:8px 22px;border-radius:14px;'; first.append(visual);
      for (const imageData of chartImages.filter(Boolean).slice(0,1)) { const image = document.createElement('img'); image.src = imageData; image.style.cssText = 'display:block;width:100%;height:330px;object-fit:contain;'; visual.append(image); await image.decode(); }
      text(first, 'p', '方法边界 / 电力和汽油为 CO₂，牛肉为生命周期 CO₂e。混合边界相加用于教学比较，不是完整足迹、认证清单或未来预测。', 'font-size:11px;color:#53665D;margin-top:22px;');
      const room=makePage(3);
      text(room,'h1','一间房，一天的能量。','font:32px/1.4 Georgia,"Microsoft YaHei",serif;margin:28px 0 16px;');
      text(room,'p',`${SPACES[kind].name} / ${selected?OBJECTS[selected].name:'未选定物件'} / 视图 ${snapshotState}`,'font-size:11px;color:#53665D;');
      if(sceneImage){const shot=document.createElement('img');shot.src=sceneImage;shot.style.cssText='width:100%;height:310px;object-fit:cover;border-radius:8px;display:block;margin:18px 0;';room.append(shot);await shot.decode();}else text(room,'p','此设备处于轻量视图或 3D 未就绪，未捕获场景图；计算数据仍已冻结。');
      text(room,'p',`日用电 ${spaceResult.daily.toFixed(3)} kWh · Scope 2 ${spaceResult.scope2Daily.toFixed(3)} kg CO₂ / 日`,'font-size:15px;color:#1D5E4C;');
      for(const item of spaceResult.objects.filter(o=>o.id==='aircon'||OBJECTS[o.id].watts>0))text(room,'p',`${OBJECTS[item.id].name} / ${item.kWh.toFixed(3)} kWh / 日 × ${FACTORS.electricity.value} = ${(item.kWh*FACTORS.electricity.value).toFixed(3)} kg CO₂ / 日`,'font-size:12px;border-bottom:1px solid #CAD4CA;padding-bottom:8px;');
      text(room,'p',`按 30 日：${spaceResult.monthly.toFixed(3)} kWh / 月。住宅另含 10 W × ${energy.lighting} h / 日照明。商业情景独立于个人年度总账，不重复相加。`,'font-size:11px;color:#53665D;');
      text(room,'p','Scope 1：燃料与冷媒泄漏记录待核验。Scope 3：产品 EPD 与供应链数据待补充。未知不等于零。','font-size:12px;');
      text(room,'p',currentAdvice?`当前物件 AI 建议：${currentAdvice.slice(0,600)}`:'当前物件尚无对应 AI 回答。建议先比较关闭待机与缩短时长的影响，再查阅原始资料。','font-size:12px;line-height:1.8;');
      const second = makePage(4);
      text(second, 'h1', '从理解，到下一步。', 'font:34px/1.2 Georgia,"Microsoft YaHei",serif;margin:32px 0 20px;');
      text(second, 'h2', '01 / AI 教练建议', 'font-size:14px;color:#1D5E4C;margin-top:24px;');
      text(second, 'p', recommendation || '当前参数尚无通过引用校验的 AI 诊断。修改参数后的旧回答不会被复用；以下为本地教学情景计算。', 'white-space:pre-wrap;line-height:1.9;font-size:14px;');
      text(second, 'h2', '02 / 因子与核算边界', 'font-size:14px;color:#1D5E4C;margin-top:28px;');
      for (const factor of Object.values(FACTORS)) text(second, 'p', `${factor.value} ${factor.unit} / ${factor.source}。${factor.boundary}。\n${factor.url}`, 'font-size:11px;line-height:1.65;overflow-wrap:anywhere;');
      text(second, 'h2', '03 / 资料索引', 'font-size:14px;color:#1D5E4C;margin-top:28px;');
      text(second,'p',`冻结时间：${snapshotTime}。以下证据页只列出本轮回答真正引用的资料，不以通用文献列表替代本轮溯源。`,'font-size:12px;line-height:1.8;');
      text(second, 'p', `学习记录仅保存在当前浏览器，PDF 可下载保存。AI 建议需结合原文核验；本报告不替代专业盘查。`, 'border-top:1px solid #BAC7BB;padding-top:18px;margin-top:26px;font-size:11px;color:#53665D;');
      const arSnapshot = await latestARSnapshot().catch(() => null);
      if (arSnapshot) {
        const third=makePage(pages.length+1);
        text(third,'h1','选择的镜像。','font:34px/1.3 Georgia,"Microsoft YaHei",serif;margin:30px 0;');
        text(third,'p',`${arSnapshot.garment} / ${new Date(arSnapshot.createdAt).toLocaleString('zh-CN')} / 追踪状态：${arSnapshot.tracking}`);
        const photo=document.createElement('img');photo.src=arSnapshot.image;photo.style.cssText='width:100%;max-height:720px;object-fit:contain;margin:25px 0;';third.append(photo);await photo.decode();
        text(third,'p','摄像头互动与服装覆盖为教学示意，不构成体型测量或产品碳排认证。快照仅保存在当前浏览器；本报告未为服装编造 kg CO₂e 数值。');
      }
      const refs=evidence.map(c=>({citation:c,reference:REFERENCES.find(r=>r.id===c.referenceId)}));
      for(let offset=0;offset<Math.max(1,refs.length);offset+=2){
       const sources=makePage(pages.length+1);
       text(sources,'h1','证据，不止一个角标。','font:32px/1.4 Georgia,"Microsoft YaHei",serif;margin:32px 0 22px;');
       if(!refs.length)text(sources,'p','尚无与当前输入一致的 AI 引用。此页不编造文献，亦不以旧回答冒充本轮诊断。');
       for(const {citation,reference:r} of refs.slice(offset,offset+2))if(r){
        text(sources,'h2',`[${citation.id}] ${r.citation}`,'font-size:16px;color:#1D5E4C;margin-top:24px;');
        text(sources,'p',r.locator,'font-size:11px;');
        text(sources,'p',`原文：${r.quote}`,'font-size:12px;line-height:1.8;');
        text(sources,'p',`本站译文：${r.translation}`,'font-size:12px;line-height:1.8;');
        text(sources,'p',`适用边界：${r.limitation}`,'font-size:11px;line-height:1.8;');
        for(const url of [r.url,...(r.doi?[r.doi]:[])]){const link=text(sources,'a',url,'display:block;font-size:10px;overflow-wrap:anywhere;color:#1D5E4C;') as HTMLAnchorElement;link.href=url;}
       }
      }
      const methods=makePage(pages.length+1);
      text(methods,'h1','方法，来源，与边界。','font:34px/1.4 Georgia,"Microsoft YaHei",serif;margin:32px 0 26px;');
      for(const [title,body] of [
       ['01 / 可复算','运行用电 = 输入功率 W × 等效日使用时长 h ÷ 1000。电力排放 = kWh × 排放因子。月量采用 30 日。三维能耗柱统一比例 1 m = 13.333 kWh / 日。光流是购电关系示意，不是实测电网。'],
       ['02 / 情景假设',`住宅空调输入：${energy.power} W，${energy.hours} h / 日，${energy.temperature}°C，教学档 ${energy.grade}。温度系数 max(0.75, 1+(26-温度)×0.035)，3 档另乘 1.18。这是可编辑教学情景，不是认证能效等级、热工模型或设备实测。`],
       ['03 / 年份与地域',`${FACTORS.electricity.value} kg CO₂/kWh 为沿用的教学约定值，其原始发布年份与版本尚未核验，不是已核验的官方全国因子。使用者应替换为本项目核算边界、年份与地域匹配的因子。${FACTORS.electricity.url}`],
       ['04 / 科学与呈现','IPCC 结论用于解释累积排放与气候风险，不支持“关掉这台空调即刻改变窗外天气”的因果推断。室内色彩、花朵与粒子属于反馈艺术。刚体碰撞不等于软体或流体仿真。模型来源不等于碳排数据来源。'],
       ['05 / 使用范围','当前平台用于教育与方案比较，尚未接入校准电表、真实建筑 BIM、设备 EPD 与核验链，不能替代组织温室气体盘查、产品认证或商业审计。PDF 冻结导出时点输入；浏览器本地记录不跨设备同步。']
      ]){text(methods,'h2',title,'font-size:15px;color:#1D5E4C;margin-top:26px;');text(methods,'p',body,'font-size:12px;line-height:1.85;overflow-wrap:anywhere;');}
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
      for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, { backgroundColor: '#F3F2EB', scale: 1.5, logging: false });
        if (index > 0) pdf.addPage();
        const height = canvas.height * 210 / canvas.width;
        const scale = Math.min(1,297/height);
        pdf.addImage(canvas.toDataURL('image/jpeg', .94), 'JPEG', (210-210*scale)/2, 0, 210*scale, height*scale);
        const bounds=page.getBoundingClientRect(),mm=210*scale/bounds.width;
        page.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link=>{const rect=link.getBoundingClientRect();pdf.link((210-210*scale)/2+(rect.left-bounds.left)*mm,(rect.top-bounds.top)*mm,rect.width*mm,rect.height*mm,{url:link.href});});
      }
      const reportId = crypto.randomUUID();
      pdf.save('CarbonTwin-scenario-report.pdf');
      await recordLearning({ type: 'report', reportId, activity, annual: calculation.annual, advice: recommendation, uploaded: false });
    } catch { setError('导出失败，当前数据仍保留，请重试。'); }
    finally { pages.forEach(page => page.remove()); setBusy(false); }
  };
  return <div><button className="primary-button" onClick={() => void exportPDF()} disabled={busy || !result || pending || networkBusy}><Download size={16} />{busy ? '正在排版报告…' : '生成个人碳排白皮书'}</button>{error && <p role="alert">{error}</p>}</div>;
}
