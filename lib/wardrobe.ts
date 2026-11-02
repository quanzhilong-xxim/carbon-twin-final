export type GarmentId='tshirt'|'longsleeve'|'coat'|'trousers'|'shorts'|'wool'|'jeans';
export const GARMENTS=[
 {id:'tshirt',name:'短袖',english:'COTTON T-SHIRT',reference:'棉质 T 恤',kg:6.43,path:'tshirtencoton',proxy:false,advice:'延长穿着，低温清洗，自然晾干。生产阶段通常比一次穿着更值得关注。'},
 {id:'longsleeve',name:'长袖',english:'LONG SLEEVE',reference:'棉质衬衫',kg:13.2,path:'chemiseencoton',proxy:true,advice:'此处用棉衬衫代替长袖情景。真实材质、克重和加工方式会改变结果。'},
 {id:'coat',name:'外套',english:'OUTERWEAR',reference:'外套',kg:101,path:'manteau',proxy:false,advice:'减少低频穿着的换新，用修补、共享或二手延长外套寿命。'},
 {id:'trousers',name:'长裤',english:'TROUSERS',reference:'牛仔裤',kg:25.1,path:'jeans',proxy:true,advice:'使用牛仔裤作代理，不能代表所有长裤。只有确认产品数据后才能精算。'},
 {id:'shorts',name:'短裤',english:'SHORTS',reference:'牛仔裤',kg:25.1,path:'jeans',proxy:true,advice:'短裤缺少可比独立数据，本情景暂借牛仔裤基准，不按布料面积随意减半。'},
 {id:'wool',name:'羊毛衫',english:'WOOL KNIT',reference:'羊毛套头衫',kg:56.7,path:'pullenlaine',proxy:false,advice:'羊毛上游涉及畜牧业排放。按洗标护理，减少不必要清洗并修补起球。'},
 {id:'jeans',name:'牛仔裤',english:'DENIM',reference:'牛仔裤',kg:25.1,path:'jeans',proxy:false,advice:'减少换新与高能耗烘干。不同染整、重量、产地和护理情景差异很大。'},
] as const;
export const WARDROBE_SOURCE='https://impactco2.fr/outils/habillement';
export function annualGarmentAllocation(perItem:number,quantity:number,years:number){
 if(![perItem,quantity,years].every(Number.isFinite)||perItem<0||quantity<0||years<=0)throw new RangeError('Invalid garment allocation');
 return perItem*quantity/years;
}
export function garmentSpeech(index:number,quantity:number,years:number){const g=GARMENTS[index];return `你选择了${g.name}。采用法国 ADEME 的${g.reference}${g.proxy?'代理':''}基准，每件全生命周期约 ${g.kg} 千克二氧化碳当量。${quantity} 件分摊到 ${years} 年，每年约 ${annualGarmentAllocation(g.kg,quantity,years).toFixed(2)} 千克。这是教学情景，不是对你身上衣服的实测。${g.advice}`;}
export const CLOTHING_PROMPTS=['a photo of a person wearing a short sleeve t-shirt','a photo of a person wearing a long sleeve shirt','a photo of a person wearing a coat or jacket','a photo of a person wearing long trousers','a photo of a person wearing shorts','a photo of a person wearing a knitted sweater','a photo of a person wearing blue denim jeans'];
