import { REFERENCES } from './references';
export type SearchGroup = 'all' | 'research' | 'explore' | 'lab' | 'architecture';
export type SearchEntry = { id: string; title: string; subtitle: string; text: string; href: string; group: Exclude<SearchGroup, 'all'>; source: string };
const chapters = [
 ['sakura-meeting','樱花之约','樱花、少女与猫，天气与时间的共同故事。'],['daily-choices','日常选择','电力、汽油与牛肉活动量，比较年度教学情景。'],['ecology-lab','四季生态舱','春夏秋冬的植物与玻璃生态舱。'],['digital-room','城市之光','从城市鸟瞰进入住宅、办公室和咖啡馆。'],['coffee-time','咖啡时光','咖啡机、冷柜、磨豆机和照明设备的用电。'],['eco-companion','生态伙伴','猫咪反馈与活动量同步。'],['two-lives','两种生活','按面积、按人数比较住宅和办公购电。'],['pasture-letter','牧场来信','奶牛、小牛、羊和乳品加工、冷链、消费。'],['data-echo','数据回响','追踪因子、单位、核算边界与来源。'],['story-reflection','城市余韵','回看同一组年度情景与故事结尾。'],
];
export const SEARCH_INDEX: SearchEntry[] = [
 ...REFERENCES.map(r=>({id:'ref-'+r.id,title:r.title,subtitle:r.subtitle,text:[r.summary,r.explanation,r.category,r.citation,...r.keywords].join(' '),href:'/learn?reference='+encodeURIComponent(r.id)+'#archive',group:'research' as const,source:r.organization+' · '+r.year})),
 ...chapters.map(([id,title,text])=>({id,title,subtitle:'The Behaviour Lab',text,href:'/simulator#'+id,group:'lab' as const,source:'行为沙盘 · 互动章节'})),
 ...[['student','学生探索者','相机、滑板、背包与日常通勤'],['business','企业主','价值链、西装、办公室与企业选择'],['city','城市管理者','平板、城市能源系统与公共生活']].map(([id,title,text])=>({id:'role-'+id,title,subtitle:'A different lens. A shared world.',text,href:'/#identities',group:'explore' as const,source:'身份视角 · 三维角色'})),
 {id:'journey',title:'六段城市探索',subtitle:'Six ways to live in a city',text:'文化之城 滨水活力 创新湾区 生态山谷 未来枢纽 共生之城',href:'/#city-journey',group:'explore',source:'探索 · 六段城市章节'},
 {id:'formation',title:'城市生长之旅',subtitle:'From particles to a living city',text:'粒子 树木 道路 车辆 建筑 场景激活 自由探索',href:'/#home',group:'explore',source:'探索 · 实时三维'},
 {id:'garment',title:'一件衣服的九段旅程',subtitle:'Trace the thread',text:'服装 纺织 棉 聚酯 羊毛 牛仔 纤维 经纬 纱线 生命周期 三维成衣',href:'/learn#garment-study',group:'research',source:'学术档案 · 材料研究'},
 {id:'studies',title:'建筑与城市研究',subtitle:'Architecture field notes',text:'春笋 斜网格塔 潮汐之门 建筑 工作台',href:'/city-studies',group:'architecture',source:'原有建筑研究'},
 {id:'light-court',title:'光之塔·光庭',subtitle:'CL-T01-V12',text:'玻璃 灯光 材质 建筑 工作台 原建筑',href:'/citylight/studio',group:'architecture',source:'原有工作台'},
];
export function searchSite(query: string, group: SearchGroup) {
 const terms=query.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 return SEARCH_INDEX.filter(row=>group==='all'||row.group===group).map(row=>{
  const title=(row.title+' '+row.subtitle).normalize('NFKC').toLocaleLowerCase(),text=(row.title+' '+row.subtitle+' '+row.text+' '+row.source).normalize('NFKC').toLocaleLowerCase();
  return {row,score:terms.every(t=>text.includes(t))?terms.reduce((n,t)=>n+(title.includes(t)?5:1),0)+1:0};
 }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).map(item=>item.row);
}
