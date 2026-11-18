'use client';

import { ArrowDownRight, ArrowUpRight, Building2, HeartPulse, Landmark, Leaf, Orbit, TrainFront, Waves, X, ArrowLeft, ArrowRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const cities = [
  { number: '01', title: '文化之城', english: 'CULTURE IN COMMON', detail: '让记忆留下，也让新的公共生活发生。', note: '历史街区 · 共同记忆', image: '/media/explore-v10/culture-v5.webp', icon: Landmark,
    question:'保留一栋建筑，究竟保留了什么？', story:'水岸展馆把传统屋檐、玻璃展厅与日常步行连接起来。这里的更新从公共生活出发：保留可以继续使用的结构，再为新的用途留出空间。',
    lenses:[['建筑的第二段生命','改造可以延长既有材料的使用时间，但还要比较新增材料、施工和未来运行排放。不能只凭“保留”二字断定净减排。'],['可以抵达的文化','公共空间的价值取决于能否抵达、能否停留。沿岸的座椅、步道与无障碍联系，都是设计的一部分。'],['共同记忆与新用途','文化更新需要听见原有使用者。展馆与新建筑相邻，并不意味着每个人都自动分享了更新带来的收益。']],
    boundary:'这是原创概念空间，不是对真实遗产建筑的复原或改造建议。'},
  { number: '02', title: '滨水活力', english: 'LIFE BY THE WATER', detail: '把水岸从风景，变成可以停留的日常。', note: '咖啡露台 · 连续步道', image: '/media/explore-v10/waterfront-v5.webp', icon: Waves,
    question:'一条水岸，如何成为每个人的生活空间？', story:'木质步道沿河展开。咖啡露台、树荫和小船共享水边的尺度；街区的入口朝向步行的人，而不是只朝向停车场。',
    lenses:[['连续的步行系统','一段漂亮步道还不够。它是否连接公交、住区与工作地，决定了步行能否成为真实的出行选择。'],['树荫与夏季热舒适','树冠、遮阳和通风共同影响体验。效果还与季节、气候和维护有关，不能用绿化面积代替实测热环境。'],['水岸的开放性','商业活动为水岸带来活力，也需要保留无需消费就能坐下的公共座位与连续通行空间。']],
    boundary:'水体、建筑与交通均为设计情境；没有声称测得温度变化或减排比例。'},
  { number: '03', title: '创新湾区', english: 'IDEAS FIND A PLACE', detail: '让科研、公共空间与一株树共享一片屋檐。', note: '玻璃科研塔 · 生态广场', image: '/media/explore-v10/innovation-v5.webp', icon: Orbit,
    question:'一座玻璃建筑，怎样走向低碳？', story:'保留的光庭与斜网格塔被放进开放的研究园区。广场上的人、遮阳构件与庭院共同提醒我们：技术最终应当服务于空间中的生活。',
    lenses:[['先理解运行需求','玻璃面积、朝向、遮阳与气候影响采暖和制冷。通透的外观不能直接证明建筑节能。'],['再追踪材料','材料生产与施工形成隐含排放。需要生命周期边界、工程量及可靠因子，才能比较不同方案。'],['把创新放回公共生活','开放底层、座椅和连续路径让园区与城市发生联系。可达性与舒适度同样需要观察与反馈。']],
    boundary:'使用 CarbonTwin 原有原创建筑研究资产；不是建筑能耗模拟或绿色认证结果。'},
  { number: '04', title: '生态山谷', english: 'ROOM TO BREATHE', detail: '先给河流与森林留出空间，再讨论城市生长。', note: '森林社区 · 河流修复', image: '/media/explore-v10/valley-v8.webp', icon: Leaf,
    question:'城市向自然借来的空间，怎样归还？', story:'社区沿山谷布置，树林与河流保持连续。低层建筑顺着地形退让，步桥跨过河道，远处的风机提醒我们能源系统也占用真实土地。',
    lenses:[['连通的栖息地','生态廊道首先关系到物种和水文过程。连续、适生且得到维护的植被，比孤立的装饰绿岛更值得关注。'],['能源也有边界','风能发电的运行排放较低，但设备制造、建设、维护与退役仍属于生命周期评价的一部分。'],['谨慎谈论碳汇','树木生长可以储存碳，但速率、存活、火灾风险和长期管理都会改变结果。种树不能自动抵消任意排放。']],
    boundary:'地形与风机为原创空间示意；未进行生态影响评价、风资源测量或碳汇核证。'},
  { number: '05', title: '未来枢纽', english: 'THE LOW-CARBON CONNECTION', detail: '让换乘的最后几百米，也成为愿意步行的路。', note: '公共交通 · 立体连接', image: '/media/explore-v10/mobility-v5.webp', icon: TrainFront,
    question:'低碳出行，始于一列车还是一条好走的路？', story:'轨道、站厅与有遮蔽的前场组成同一个抵达空间。列车是系统的一环；安全的步行连接、可靠的班次与便利的换乘同样重要。',
    lenses:[['连接最后一段路','车站是否连接居住区、自行车和无障碍路径，影响人们是否真正愿意减少开车。'],['比较一致的活动量','比较交通方案时，应使用可比的乘客公里，并说明载客率、能源结构与因子年份。'],['从情境走向选择','路线、时间、天气与身体条件不同，选择也不同。行为沙盘可以比较明确假设下的情景，不能替代所有人的现实约束。']],
    boundary:'列车与站房是概念模型；没有真实线路、客流或运营排放数据。'},
  { number: '06', title: '共生之城', english: 'A SHARED FUTURE', detail: '在湖面灯光之间，看见人与自然的长期关系。', note: '湖泊绿地 · 温暖生活', image: '/media/explore-v10/symbiosis-v6.webp', icon: HeartPulse,
    question:'一座更好的城市，如何被持续验证？', story:'天色慢慢变暗，湖边的路灯亮起。城市的意义不止是建成时的一张照片，而是此后多年如何使用资源、照顾自然与回应居民。',
    lenses:[['把建筑看成长期系统','材料、运行能源、维护与更新共同塑造长期影响。一次设计选择需要放进完整生命周期里理解。'],['让绿地成为公共网络','湖岸、街树和公园需要与日常生活连接；维护、用水与生物多样性也应进入长期管理。'],['用证据修正选择','确定边界、记录活动量、选择可靠因子，再观察变化。证据让城市愿景能够被追问、比较和修正。']],
    boundary:'黄昏城市为原创概念场景，不是实时数字孪生或已经核证的碳中和城市。'},
] as const;

export default function ExploreJourney() {
  const [active, setActive] = useState(0);
  const [opened,setOpened]=useState<number|null>(null),[lens,setLens]=useState(0);
  const dialog=useRef<HTMLDialogElement>(null),frame=useRef(0),rects=useRef(new Map<number,DOMRect>());
  useEffect(()=>{
    if(opened===null)return;
    const opener=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow,element=dialog.current;
    element?.showModal();document.body.style.overflow='hidden';
    return()=>{element?.close();document.body.style.overflow=overflow;opener?.focus({preventScroll:true});};
  },[opened]);
  useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
  const select = (index: number) => {
    setActive(index);setOpened(index);setLens(0);
    window.dispatchEvent(new CustomEvent('carbontwin:city-theme', { detail: { index } }));
  };
  const city=opened===null?null:cities[opened];
  return <section id="city-journey" className="explore-journey" aria-labelledby="journey-heading">
    <div className="explore-section-heading">
      <div><span className="explore-kicker">{'// SIX WAYS TO LIVE IN A CITY'}</span><h2 id="journey-heading">城市不是一种答案。<i>选择你的现场。</i></h2></div>
      <p>六段独立构图，六个值得追问的问题。从公共记忆走向共同未来，打开一段旅程，阅读空间背后的选择。</p>
    </div>
    <div className="city-atlas" role="group" aria-label="六种城市探索主题">
      {cities.map(({ number, title, english, detail, note, image, icon: Icon }, index) => <button key={number} type="button" aria-pressed={active === index} aria-haspopup="dialog" aria-controls="city-chapter" className={`city-atlas-card${active === index ? ' is-active' : ''}`} style={{ '--atlas-image': `url(${image})` } as React.CSSProperties} onClick={() => select(index)}
        onPointerEnter={e=>rects.current.set(index,e.currentTarget.getBoundingClientRect())}
        onPointerMove={e=>{if(e.pointerType==='touch'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;const rect=rects.current.get(index),element=e.currentTarget;if(!rect)return;const x=(e.clientX-rect.left)/rect.width-.5,y=(e.clientY-rect.top)/rect.height-.5;cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{element.style.setProperty('--atlas-x',`${x*8}px`);element.style.setProperty('--atlas-y',`${y*6}px`);});}}
        onPointerLeave={e=>{cancelAnimationFrame(frame.current);e.currentTarget.style.setProperty('--atlas-x','0px');e.currentTarget.style.setProperty('--atlas-y','0px');}}>
        <span className="city-atlas-image" aria-hidden="true" />
        <span className="city-atlas-top"><b>{number}</b><Icon size={19} aria-hidden="true" /></span>
        <span className="city-atlas-copy"><small>{english}</small><strong>{title}</strong><em>{detail}</em><span className="city-atlas-note">{note}</span></span>
        <span className="city-atlas-action">打开城市章节 <ArrowUpRight size={16} aria-hidden="true" /></span>
      </button>)}
    </div>
    <div className="journey-progress" aria-live="polite"><span><Building2 size={15} /> 当前章节 {cities[active].number} / {cities[active].title}</span><span>原创三维场景 · 空间与公共生活研究</span><ArrowDownRight size={15} aria-hidden="true" /></div>
    <dialog ref={dialog} id="city-chapter" className="city-chapter-dialog" aria-labelledby="city-chapter-title" onCancel={()=>setOpened(null)} data-lenis-prevent>
      {city&&<><div className="city-chapter-topline"><span>URBAN FIELD NOTES / CHAPTER {city.number}</span><button type="button" autoFocus onClick={()=>setOpened(null)} aria-label="关闭城市章节"><X size={20}/></button></div>
        <div className="city-chapter-layout"><figure><Image src={city.image} alt={`${city.title}的原创三维场景：${city.note}`} width={1000} height={700} sizes="(max-width: 760px) 94vw, 55vw"/><figcaption>原创三维场景 · 静态渲染 / {city.english}</figcaption></figure>
        <div className="city-chapter-reading"><span className="explore-kicker">{city.number} / {city.title}</span><h2 id="city-chapter-title">{city.question}</h2><p>{city.story}</p><div className="city-chapter-lenses" role="group" aria-label="选择观察线索">{city.lenses.map(([title],i)=><button key={title} type="button" aria-pressed={lens===i} onClick={()=>setLens(i)}>0{i+1} {title}</button>)}</div><div className="city-chapter-insight" aria-live="polite"><h3>{city.lenses[lens][0]}</h3><p>{city.lenses[lens][1]}</p></div><p className="city-chapter-boundary">{city.boundary}</p><Link href="/learn" className="primary-button">去学术档案追溯证据 <ArrowUpRight size={16}/></Link>
        <button type="button" className="city-chapter-locate" onClick={()=>{setOpened(null);document.querySelector('#home .formation-v7')?.scrollIntoView({behavior:'smooth',block:'center'});}}>在实时街区中观察这一主题 ↗</button></div></div>
        <div className="city-chapter-bottom"><button type="button" onClick={()=>select(((opened??0)+5)%6)}><ArrowLeft size={16}/> 上一段旅程</button><small>植被：Poly Haven · CC0 / 人物改编：Rain Rig © Blender Foundation · CC BY 4.0</small><button type="button" onClick={()=>select(((opened??0)+1)%6)}>下一段旅程 <ArrowRight size={16}/></button></div></>}
    </dialog>
  </section>;
}
