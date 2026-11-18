import type { ReactNode } from 'react';
import type { AcademicReference } from '@/lib/references';
import EvidenceParticles from './EvidenceParticles';
import EvidenceEditorialArt from './EvidenceEditorialArt';

/** Original conceptual diagrams. No invented measured series or official covers. */
const line = (d: string) => <path d={d} />;
const box = (x: number, y: number, w: number, h: number, fill = false) => <rect x={x} y={y} width={w} height={h} rx="2" className={fill ? 'evidence-land' : undefined} />;
const circle = (x: number, y: number, r: number, fill = false) => <circle cx={x} cy={y} r={r} className={fill ? 'evidence-land' : undefined} />;
const text = (x: number, y: number, value: string) => <text x={x} y={y}>{value}</text>;
const arrow = (x: number, y: number, length = 38) => line(`M${x} ${y}h${length}m-6-5 6 5-6 5`);
const house = (x: number, y: number, s = 1) => <g transform={`translate(${x} ${y}) scale(${s})`}>{line('M0 27 25 5 50 27v38H0V27Zm8 0h34M20 65V43h13v22')}{box(7, 34, 8, 10)}{box(36, 34, 8, 10)}</g>;
const turbine = (x: number, y: number, s = 1) => <g transform={`translate(${x} ${y}) scale(${s})`}>{line('M0 0v65m0-65-5-35 9 2-4 33m0 0 32 12-6 7L0 0m0 0-27 20-3-8L0 0')}{circle(0, 0, 4, true)}</g>;
const leaf = (x: number, y: number, s = 1) => <g transform={`translate(${x} ${y}) scale(${s})`}>{line('M0 45C-10 15 10-2 48 0 50 32 35 50 0 45Zm-5 12L41 7M15 32 7 14m17 9 16 1')}</g>;
const factory = (x: number, y: number) => <g transform={`translate(${x} ${y})`}>{line('M0 65V27l20-12v12l20-12v12h15V0h12v65H0Z')}{box(8, 41, 10, 12)}{box(27, 41, 10, 12)}{box(46, 41, 10, 12)}</g>;
const roads = line('M30 111h260M105 110V33m7 77V33M213 110V33m7 77V33');

export const EVIDENCE_COVER_TOPICS: Record<string, { concept: string; key: string }> = {
  'human-influence': { concept: '地球能量平衡', key: 'energy-balance' }, 'scope-boundaries': { concept: '组织与运营边界', key: 'scope-network' },
  'carbon-budget': { concept: '排放随时间累积', key: 'cumulative-time' }, 'ipcc-wgiii-demand': { concept: '服务需求的三条路径', key: 'demand-paths' },
  'ipcc-wgiii-energy': { concept: '电源与终端效率', key: 'electrification' }, 'ipcc-syr-risks': { concept: '风险的三个组成', key: 'risk-intersection' },
  'ghgp-scope2': { concept: '地点法与市场法', key: 'scope2-methods' }, 'ghgp-scope3': { concept: '上下游价值链', key: 'value-chain' },
  'ghgp-corporate': { concept: '盘查的组织层级', key: 'inventory-hierarchy' }, 'mee-power-2023': { concept: '活动年与发布年', key: 'factor-version' },
  'mee-carbon-footprint-2024': { concept: '足迹管理的数据链', key: 'footprint-policy' }, 'mee-factor-database': { concept: '因子的索引维度', key: 'factor-index' },
  'epa-passenger-vehicle': { concept: '燃料到燃烧排放', key: 'fuel-combustion' }, 'epa-household-electricity': { concept: '购电的地域差异', key: 'grid-region' },
  'poore-nemecek': { concept: '食品系统的多样边界', key: 'food-systems' }, 'wynes-nicholas': { concept: '行为与支持条件', key: 'choice-context' },
  'ipcc-15c': { concept: '温控目标与净零', key: 'warming-target' }, 'unep-gap': { concept: '承诺与实施之间', key: 'implementation-gap' },
  'iea-behaviour': { concept: '习惯与能源服务', key: 'energy-service' }, 'ipcc-land': { concept: '土地利用的连接', key: 'land-mosaic' },
  'europe-2022': { concept: '干旱与能源韧性', key: 'drought-reservoir' }, 'asia-2022': { concept: '洪水与城市暴露', key: 'flood-exposure' },
  'global-2023': { concept: '十年期的温度记录', key: 'decadal-record' }, 'global-2024': { concept: '单年与长期平均', key: 'temporal-window' },
  'europe-2023': { concept: '发电结构与电网', key: 'generation-mix' }, 'africa-2023': { concept: '适应与水资源', key: 'adaptation-water' },
  'asia-2023': { concept: '复合气象风险', key: 'compound-hazards' }, 'apple-2025': { concept: '再生材料的去向', key: 'recycled-components' },
  'ceads-2018': { concept: '部门与燃料清单', key: 'sector-fuel-matrix' }, 'ozone-2019': { concept: '制冷剂与臭氧治理', key: 'refrigerant-layer' },
  'iso-lca-principles': { concept: 'LCA 四个相联阶段', key: 'lca-iteration' }, 'ghgp-product-life': { concept: '产品的分配节点', key: 'product-allocation' },
  'ghgp-cities': { concept: '城市地理边界', key: 'geographic-boundary' }, 'ipcc-urban-systems': { concept: '紧凑与连通的街区', key: 'urban-connectivity' },
  'ipcc-buildings': { concept: '运行与隐含排放', key: 'building-layers' }, 'ipcc-transport': { concept: '相同旅程的不同方式', key: 'passenger-distance' },
  'unep-resource-outlook': { concept: '材料的价值保留', key: 'circular-materials' }, 'unep-food-waste': { concept: '买入、食用与损失', key: 'food-mass-balance' },
  'iea-renewables-2024': { concept: '容量与发电量', key: 'capacity-generation' }, 'worldbank-carbon-pricing': { concept: '定价的覆盖边界', key: 'pricing-coverage' },
  'paris-agreement': { concept: '目标、行动与透明度', key: 'policy-cycle' }, 'ipcc-industry-materials': { concept: '材料与工业服务', key: 'industrial-service' },
  'ipcc-syr-a1-audited': { concept: '从排放到长期增温', key: 'attribution-evidence' }, 'ghgp-scope2-audited': { concept: '发电位置与购电主体', key: 'purchased-power-boundary' },
};

function Artwork({ id }: { id: string }): ReactNode {
  switch (id) {
    case 'ipcc-syr-a1-audited': return <>{[40,64,88].map((y,i)=><g key={y}>{circle(55+i*13,y,5,true)}{circle(41+i*13,y-8,3)}{circle(69+i*13,y+8,3)}{line(`M${44+i*13} ${y-6}l8 4m6 5 8 3`)}</g>)}{arrow(105,70,37)}{line('M166 36q40-22 80 0M165 47q40-22 80 0M176 108V61l-5 7m5-7 5 7M214 108V61l-5 7m5-7 5 7M154 116q49-13 99 0')}{text(33,133,'EMISSIONS')}{text(151,133,'WARMING')}{text(149,19,'ATTRIBUTION')}</>;
    case 'ghgp-scope2-audited': return <EvidenceEditorialArt id={id}/>;
    case 'human-influence': return <>{circle(58, 39, 15, true)}{line('M32 112q128-30 256 0M44 123q116-25 232 0M94 48q70-32 150 0M101 40q62-26 136 0M79 48l31 44m-1-9 1 9-9-3M145 99V63l-5 7m5-7 5 7M199 98V38l-5 7m5-7 5 7M248 90V67l-5 7m5-7 5 7')}{text(31, 17, 'SUN')}{text(123, 132, 'ENERGY BALANCE')}</>;
    case 'scope-boundaries': return <EvidenceEditorialArt id={id}/>;
    case 'carbon-budget': return <EvidenceEditorialArt id={id}/>;
    case 'ipcc-wgiii-demand': return <EvidenceEditorialArt id={id}/>;
    case 'ipcc-wgiii-energy': return <>{turbine(49, 51, .72)}{box(118, 52, 44, 39, true)}{line('M142 57l-13 19h14l-10 12')}{arrow(72, 72, 42)}{arrow(166, 72, 37)}{house(225, 40, .95)}{text(29, 133, 'SUPPLY')}{text(119, 133, 'GRID')}{text(213, 133, 'SERVICE')}</>;
    case 'ipcc-syr-risks': return <>{circle(135, 57, 40)}{circle(184, 57, 40)}{circle(159, 91, 40)}{circle(159, 72, 12, true)}{text(24, 30, 'HAZARD')}{text(233, 30, 'EXPOSURE')}{text(116, 141, 'VULNERABILITY')}{line('M75 28l27 17m120 0 19-16')}</>;
    case 'ghgp-scope2': return <>{factory(28, 34)}{line('M106 72h23m0-32v64m0-64h40m-40 64h40')}{box(174, 20, 112, 40)}{box(174, 84, 112, 40)}{text(186, 44, 'LOCATION')}{text(189, 108, 'MARKET')}{text(33, 124, 'PURCHASED POWER')}</>;
    case 'ghgp-scope3': return <>{box(123, 48, 75, 48, true)}{text(133, 77, 'COMPANY')}{[0, 1, 2].map(i => <g key={i}>{circle(47, 26 + i * 47, 14)}{circle(270, 26 + i * 47, 14)}{line(`M61 ${26+i*47} 119 72m83 0 54 ${-46+i*47}`)}</g>)}{text(19, 142, 'UPSTREAM')}{text(224, 142, 'DOWNSTREAM')}</>;
    case 'ghgp-corporate': return <>{box(122, 13, 77, 28, true)}{line('M160 42v22M61 64h198M61 64v20m99-20v20m99-20v20')}{[28, 127, 226].map(x => <g key={x}>{box(x, 86, 66, 39)}{line(`M${x+11} 97h44m-44 9h44m-44 9h27`)}</g>)}{text(133, 32, 'GROUP')}{text(30, 141, 'OWNERSHIP / CONTROL')}</>;
    case 'mee-power-2023': return <>{box(35, 25, 98, 93)}{box(183, 43, 98, 75, true)}{line('M35 46h98M52 17v17m21-17v17m21-17v17m21-17v17')}{arrow(137, 81, 42)}{text(49, 77, 'ACTIVITY')}{text(49, 97, 'YEAR')}{text(193, 76, 'PUBLISHED')}{text(193, 97, 'VERSION')}{text(58, 137, 'RECORD BOTH DATES')}</>;
    case 'mee-carbon-footprint-2024': return <>{box(33, 21, 69, 90)}{line('M44 40h46m-46 14h46m-46 14h29')}{arrow(105, 68, 28)}{circle(171, 69, 34)}{line('m154 69 13 13 24-29')}{arrow(208, 68, 28)}{box(242, 37, 45, 63, true)}{text(244, 74, 'DATA')}{text(41, 131, 'METHOD → VALIDATE → RECORD')}</>;
    case 'mee-factor-database': return <>{[0, 1, 2].map(i => <g key={i}>{box(55+i*11, 28+i*24, 194, 23, i === 1)}{line(`M${68+i*11} ${39+i*24}h17m12 0h63m12 0h21`)}</g>)}{text(48, 17, 'REGION / YEAR / BOUNDARY')}{circle(267, 110, 16)}{line('m279 122 13 13')}</>;
    case 'epa-passenger-vehicle': return <>{box(29, 29, 43, 66)}{line('M38 29V17h22v12m-16 24h12m14-8 12 8v36h12M130 100V79l13-24h74l20 24v21H130Zm8-21h91m-42-24v24')}{circle(151, 102, 12)}{circle(219, 102, 12)}{arrow(242, 83, 34)}{text(248, 61, 'CO₂')}{text(31, 134, 'L FUEL × COMBUSTION FACTOR')}</>;
    case 'epa-household-electricity': return <>{house(115, 37, 1.3)}{line('M34 27h51v38H34ZM235 83h51v38h-51ZM52 65v39h59m94-45h55v24')}{text(45, 51, 'GRID A')}{text(245, 106, 'GRID B')}{circle(66, 104, 6, true)}{text(78, 139, 'REGION MATTERS')}</>;
    case 'poore-nemecek': return <>{leaf(30, 34, 1.1)}{box(127, 46, 52, 50, true)}{line('M135 46V32h36v14M207 108V44q0-21 25-21t25 21v64m-39-43h29M19 120h280')}{arrow(84, 71, 35)}{arrow(184, 71, 20)}{text(26, 140, 'LAND')}{text(130, 140, 'FARM')}{text(212, 140, 'PRODUCT')}</>;
    case 'wynes-nicholas': return <>{circle(157, 68, 24, true)}{line('M157 44V20m-24 48H92m65 24v33m24-57h46')}{house(26, 32, .7)}{circle(256, 68, 23)}{line('M244 72h24m-21-9h18M140 19h34m-35 111h36')}{text(136, 73, 'CHOICE')}{text(105, 144, 'ENABLING CONDITIONS')}</>;
    case 'ipcc-15c': return <>{line('M42 117V27h235M53 112q73-66 150-71h61M62 130h205M233 117V25')}{circle(234, 42, 7, true)}{text(59, 24, 'TEMPERATURE GOAL')}{text(72, 88, 'PATHWAYS')}{text(226, 135, 'NET ZERO')}</>;
    case 'unep-gap': return <>{line('M38 20v104h244M52 36q97-6 214 31M52 46q110 34 214 64M220 59v37m-5-31 5-6 5 6m-10 26 5 6 5-6')}{text(60, 29, 'PLEDGE')}{text(60, 112, 'IMPLEMENTATION')}{text(238, 84, 'GAP')}</>;
    case 'iea-behaviour': return <>{circle(65, 68, 35)}{line('M65 43v27l18 11M103 68h26')}{box(133, 29, 65, 78, true)}{line('M144 41h42m-42 13h42m-42 13h26M220 103V51h49v52h-49m8-52V31h33v20')}{text(38, 127, 'HABITS')}{text(138, 127, 'SERVICE')}{text(226, 127, 'ENERGY')}</>;
    case 'ipcc-land': return <>{line('M30 106 81 31 168 35 137 116 30 106Zm51-75 30 37 57-33m-57 33 26 48m-26-48-81 38M168 35l78-4 44 74-153 11m80-83-23 76m-35-42 104-4')}{leaf(61, 74, .4)}{turbine(225, 67, .4)}{text(97, 137, 'LAND USE MOSAIC')}</>;
    case 'europe-2022': return <>{line('M28 106h263M45 103 70 54h180l23 49M73 71h173M75 88h166M42 124l34-6 23 8 39-9 34 9 31-8 32 7 33-7')}{circle(263, 33, 17)}{text(35, 26, 'DROUGHT')}{text(115, 103, 'RESERVOIR')}</>;
    case 'asia-2022': return <>{house(53, 41, .9)}{house(144, 17, 1.2)}{line('M27 99q15-12 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0M27 117q15-12 30 0t30 0t30 0t30 0t30 0t30 0t30 0t30 0')}{text(211, 45, 'EXPOSURE')}{line('M205 51h65v35')}</>;
    case 'global-2023': return <>{Array.from({length:10},(_,i)=><g key={i}>{box(39+i*24, 60-(i%3)*6, 13, 55+(i%3)*6, i>6)}</g>)}{line('M37 35h230m-230 0v12m230-12v12')}{text(112, 26, 'TEN YEARS')}{text(85, 138, 'RECORD WINDOW · SCHEMATIC')}</>;
    case 'global-2024': return <>{box(45, 30, 39, 82, true)}{line('M123 37h152M123 57h152M123 77h152M123 97h152M84 71h32')}{circle(199, 69, 43)}{text(41, 132, 'ONE YEAR')}{text(165, 132, 'DECADES')}{text(36, 18, 'DIFFERENT AVERAGING WINDOWS')}</>;
    case 'europe-2023': return <>{turbine(54, 50, .8)}{box(125, 63, 52, 43, true)}{line('M132 70h38m-38 10h38m-38 10h38M139 64l13-21 12 21M218 107V38h43v69M218 51h43m-43 13h43m-43 13h43m-43 13h43')}{arrow(76, 76, 39)}{arrow(181, 76, 31)}{text(99, 136, 'GENERATION MIX')}</>;
    case 'africa-2023': return <>{line('M28 113h264M48 114 67 37h43l14 77M67 37l43 0m-53 35h59M143 115V60q0-23 31-23t31 23v55m-51-34h40M232 113V67m0 17q-20-28 0-37 25 5 0 37')}{text(54, 24, 'WATER')}{text(140, 135, 'ADAPTATION')}</>;
    case 'asia-2023': return <>{circle(77, 54, 23)}{line('M54 87l-8 17m27-17-8 17m28-17-8 17M144 39q44-31 103 0-56-15-101 24 51-23 109-5-52-3-96 30M157 101h112m-101 11h89')}{text(24, 133, 'HEAT')}{text(116, 133, 'STORM + FLOOD')}</>;
    case 'apple-2025': return <>{box(128, 19, 61, 108)}{box(135, 30, 47, 78, true)}{circle(158, 118, 4)}{line('M97 27C42 26 25 78 67 108m-2-11 2 11-11-2M221 113c54-2 62-53 22-85m3 11-3-11 11 2')}{circle(64, 65, 14)}{box(230, 61, 27, 27)}{text(31, 141, 'RECYCLED INPUT ≠ PRODUCT REDUCTION')}</>;
    case 'ceads-2018': return <>{Array.from({length:6},(_,i)=><g key={i}>{Array.from({length:4},(_,j)=><g key={j}>{box(76+i*27, 28+j*23, 19, 15,(i+j)%4===0)}</g>)}</g>)}{text(30, 19, 'FUELS →')}{text(35, 139, 'SECTORS × INVENTORY YEARS')}{line('M58 29v86m-7-86h7m-7 86h7')}</>;
    case 'ozone-2019': return <>{line('M29 35q128-49 262 0M35 45q125-45 249 0M58 108q95-34 191 0M157 15v45m-5-6 5 6 5-6M204 19l-12 31m-2-7 2 7 7-2')}{box(126, 77, 59, 49, true)}{circle(155, 101, 12)}{text(29, 74, 'OZONE LAYER')}{text(201, 135, 'REFRIGERANTS')}</>;
    case 'iso-lca-principles': return <>{box(24, 25, 109, 31)}{box(185, 25, 109, 31)}{box(24, 94, 109, 31)}{box(185, 94, 109, 31)}{arrow(139, 40, 40)}{line('M240 57v31m-5-6 5 6 5-6M79 94V62m-5 6 5-6 5 6M182 109h-42m6-5-6 5 6 5')}{text(34, 45, 'GOAL / SCOPE')}{text(197, 45, 'INVENTORY')}{text(35, 115, 'INTERPRET')}{text(196, 115, 'IMPACT')}</>;
    case 'ghgp-product-life': return <>{box(33, 50, 55, 45)}{arrow(91, 72, 33)}{circle(157, 72, 26, true)}{line('M183 72h30m0-37v74m0-74h22m-22 74h22')}{box(242, 20, 54, 31)}{box(242, 93, 54, 31)}{text(39, 77, 'INPUT')}{text(145, 77, 'LCA')}{text(251, 41, 'A')}{text(251, 114, 'B')}{text(97, 137, 'ALLOCATION')}</>;
    case 'ghgp-cities': return <>{line('M49 29 236 15 287 93 103 129 29 74 49 29Z')}{house(70, 42, .65)}{factory(144, 37)}{line('M24 14 92 45m-10-1 10 1-4-9M225 87l60 44m-10-1 10 1-4-10')}{text(40, 138, 'IN-BOUNDARY')}{text(238, 36, 'OUTSIDE')}</>;
    case 'ipcc-urban-systems': return <>{roads}{[43,128,236].map((x,i)=><g key={x}>{box(x, 49-i*7, 37, 54+i*7,true)}{box(x+8, 58-i*7, 7, 14)}{box(x+23, 58-i*7, 7, 14)}</g>)}{line('M112 83h100M72 37h176M71 37v13m177-13v-7')}{text(47, 136, 'COMPACT · MIXED · CONNECTED')}</>;
    case 'ipcc-buildings': return <>{house(111, 20, 1.5)}{line('M26 108V68h58v40H26Zm11-29h35m-35 11h35M225 90h66v25h-66m0-25 23-20h43v20')}{arrow(86, 89, 22)}{text(24, 135, 'EMBODIED')}{text(214, 135, 'OPERATION')}{text(126, 17, 'SERVICE LEVEL')}</>;
    case 'ipcc-transport': return <>{line('M39 23v98m0-70h239M39 83h239M39 115h239M278 34v89')}{circle(72, 41, 7)}{line('M72 48v13m0-8-8 7m8-7 8 7')}{box(130, 58, 50, 19, true)}{circle(141, 79, 4)}{circle(169, 79, 4)}{circle(220, 105, 8)}{circle(249, 105, 8)}{line('M220 105l14-21 15 21h-29l20-9')}{text(80, 140, 'SAME PASSENGER DISTANCE')}</>;
    case 'unep-resource-outlook': return <>{circle(155, 72, 46)}{line('M155 26h-7m7 0-8-5m8 5-7 7M200 80l7-7m-7 7-8-6m8 6 4 8M132 112l-2 9m2-9 9 1m-9-1-4-8')}{box(132, 52, 46, 39, true)}{text(25, 25, 'REPAIR')}{text(239, 42, 'REUSE')}{text(27, 121, 'RECYCLE')}{text(213, 135, 'REMANUFACTURE')}</>;
    case 'unep-food-waste': return <>{box(29, 38, 54, 66)}{line('M35 38V27h42v11')}{arrow(88, 70, 33)}{circle(153, 69, 26)}{line('M179 70h25m0-31v63m0-63h28m-28 63h28')}{leaf(244, 17, .7)}{box(242, 87, 41, 35, true)}{line('M238 87h49m-39-6h29')}{text(26, 135, 'PURCHASED = EATEN + LOST')}</>;
    case 'iea-renewables-2024': return <>{turbine(58, 58, .8)}{box(132, 29, 51, 31, true)}{box(132, 84, 51, 31)}{arrow(87, 70, 36)}{line('M159 60v23m-5-6 5 6 5-6')}{text(143, 50, 'MW')}{text(138, 105, 'MWh')}{circle(250, 72, 29)}{line('M250 48v26l15 8')}{text(218, 132, 'HOURS / YIELD')}</>;
    case 'worldbank-carbon-pricing': return <>{line('M160 28v89m-72 1h144M68 42h184M87 43l-28 48h56L87 43Zm145 0-28 48h56l-28-48Z')}{circle(160, 28, 7, true)}{text(55, 111, 'TAX')}{text(207, 111, 'ETS')}{text(61, 139, 'JURISDICTION / DATE / SCOPE')}</>;
    case 'paris-agreement': return <>{circle(160, 71, 43)}{box(32, 55, 67, 33)}{box(219, 55, 69, 33)}{arrow(101, 71, 32)}{arrow(186, 71, 31)}{text(42, 76, 'TARGET')}{text(231, 76, 'ACTION')}{text(135, 75, 'REVIEW')}{line('M255 50V21H65v28m-5-6 5 6 5-6')}{text(93, 137, 'TRANSPARENCY CYCLE')}</>;
    case 'ipcc-industry-materials': return <EvidenceEditorialArt id={id}/>;
    default: return <>{box(47, 29, 225, 86)}{line('M63 48h191m-191 18h144m-144 18h173M63 102h95')}{text(63, 24, 'SOURCE NOTE')}</>;
  }
}

export default function EvidenceCoverArt({ entry, paused = false }: { entry: AcademicReference; paused?: boolean }) {
  const spec = EVIDENCE_COVER_TOPICS[entry.id];
  return <><div className="evidence-cover-visual"><svg viewBox="0 0 320 152" aria-hidden="true" className="evidence-illustration evidence-cover-art" data-cover-id={entry.id} data-cover-concept={spec?.key ?? 'source-note'}><Artwork id={entry.id} /></svg><EvidenceParticles id={entry.id} disabled={paused}/></div><em className="cover-concept">{spec?.concept ?? entry.keywords[0]}</em></>;
}
