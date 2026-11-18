import type { Identity } from '@/lib/store';
/** Editorial perspectives, not different accounting factors. */
export const PERSPECTIVES: Record<Identity, {question:string;guide:string;steps:readonly string[]}> = {
 student:{question:'如果保留舒适与便利，哪一个日常习惯最值得先改变？',guide:'先记录家庭活动量，再比较一个可执行的选择。这里的估算不等于完整个人碳足迹。',steps:['理解：活动量与因子','追溯：一件衣服的旅程','改变：保留一组 A/B 情景']},
 business:{question:'同样的用电变化，应怎样说明组织边界与采购责任？',guide:'用家庭情景练习方法，再进入咖啡厅观察设备。企业购电通常属于 Scope 2；本沙盘不扩算为企业盘查。',steps:['理解：组织边界','追溯：供应链与数据缺口','改变：设备使用方案']},
 city:{question:'建筑、交通与居民行为之间，哪些选择需要共同推进？',guide:'先比较活动情景，再进入城市与建筑。图中的城市是空间示意，不能外推为全市实测减排。',steps:['理解：系统联系','追溯：建筑能源假设','改变：比较协同行动']},
};
export const LIFECYCLE = [
 {name:'原料获取',note:'棉花种植涉及土地、水、肥料与能源；不同产地差异很大。',need:'产地、农业投入、产量与分配方法'},
 {name:'纤维制备',note:'轧棉、清理或化学纤维制备有各自边界；本模型以棉质衣物作概念演示。',need:'实际纤维成分与加工路线'},
 {name:'纺纱织造',note:'纱线形成布料，设备用电与材料损耗需要记录。',need:'工厂用电、纱线质量与布料产出'},
 {name:'染整处理',note:'染色、清洗、干燥可能涉及热、电和水，不能凭颜色推算排放。',need:'工艺、能源来源、用量与废水处理'},
 {name:'裁剪制造',note:'裁剪、缝制与辅料形成成衣；袖子不是独立的排放阶段。',need:'裁剪损耗、辅料与制造能耗'},
 {name:'包装物流',note:'包装重量、运输方式和距离共同决定活动量。',need:'包装清单、路线、方式、装载率'},
 {name:'零售分销',note:'门店与仓储能源需要按明确的规则分配到产品。',need:'店铺能耗、销量与分配规则'},
 {name:'穿着洗护',note:'延长穿着、适度洗涤与减少烘干值得比较，效果依赖实际使用。',need:'穿着次数、洗涤频率、烘干与电力因子'},
 {name:'再用与处置',note:'再使用、回收与废弃处理需要分别核算；回收不等于零排放。',need:'去向、回收率、替代假设与处理方式'},
] as const;
export const SUPPLY_CHAIN = [
 {name:'牧场与饲料',target:'food',note:'饲料种植、土地利用及牧场投入形成上游活动。奶牛是教学入口，不能将牛奶与牛肉数据直接互换。'},
 {name:'肠道甲烷',target:'beefTendon',note:'反刍动物肠道发酵产生甲烷；与 CO₂ 比较时需说明 GWP 时间尺度与研究版本。'},
 {name:'粪污管理',target:'food',note:'处理与储存方式影响甲烷和氧化亚氮；需要当地实际活动数据。'},
 {name:'加工能源',target:'energy',note:'加工环节的电与热分别核算，不能凭模型外观指定占比。'},
 {name:'运输冷链',target:'transport',note:'运输方式、距离、质量、制冷能耗和制冷剂泄漏各有边界。'},
 {name:'包装零售',target:'energy',note:'包装材料与门店能源需要来源和分配规则。'},
 {name:'消费选择',target:'food',note:'按需要采购、合理储存与减少浪费可作为情景；不提供营养或个人饮食诊断。'},
 {name:'废弃物',target:'transport',note:'废弃物去向与处理方式属于生命周期的一部分，避免把回收当作没有排放。'},
] as const;
