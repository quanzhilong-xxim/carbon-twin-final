import {FACTORS} from '../emissions';
import {calculateRoom,type RoomEnergy} from './room';

export type SpaceKind='home'|'office'|'cafe';
export type SpaceObject='aircon'|'sofa'|'table'|'television'|'plant'|'kettle'|'curtain'|'server'|'computer'|'officeLight'|'officeHVAC'|'desk'|'coffeeMachine'|'fridge'|'grinder'|'cafeLight'|'counter';
export interface ObjectSpec {name:string;position:[number,number,number];watts:number;hours:number;note:string}
export const OBJECTS:Record<SpaceObject,ObjectSpec>={
 aircon:{name:'空调系统',position:[.65,2.8,-3.1],watts:0,hours:0,note:'输入功率、温度系数与能效档是可编辑教学假设；冷媒泄漏需要另外核验。'},
 sofa:{name:'布艺沙发',position:[-1.5,.7,-1.5],watts:0,hours:0,note:'制造、运输、使用寿命与报废构成生命周期。无产品 EPD 不编造 Scope 3 数值。'},
 table:{name:'实木茶几',position:[-.75,.65,.25],watts:0,hours:0,note:'木材储碳不等于完整生命周期净负排放；布局移动不直接减碳。'},
 television:{name:'复古电视',position:[-1.5,1,2.95],watts:80,hours:4,note:'80 W × 4 h 是教学输入，非模型铭牌；关闭电视即可比较用电变化。'},
 plant:{name:'室内绿植',position:[-3.1,1,-.4],watts:0,hours:0,note:'植物摇曳与开花是体验反馈，不作为可核销碳汇。'},
 kettle:{name:'电热水壶',position:[-.9,.9,.3],watts:1500,hours:.067,note:'教学输入 1500 W × 0.067 h = 0.1005 kWh；烧水量、初温与效率会改变实际用电。'},
 curtain:{name:'亚麻窗帘',position:[-3.7,2,1.5],watts:0,hours:0,note:'遮阳影响冷负荷，但没有日照与建筑热工数据，不给出虚构节电百分比。'},
 server:{name:'服务器机柜',position:[2.65,1.3,-2.2],watts:1500,hours:24,note:'1500 W 是整柜平均输入情景，不是实测负载；未包含制冷 PUE，也不另行重复计算。'},
 computer:{name:'办公终端',position:[-1.5,1.2,-1.1],watts:390,hours:8,note:'六台终端合计 390 W 的教学输入；可关闭非工作时段设备，实际功率需测量。'},
 officeLight:{name:'办公照明',position:[0,3.4,0],watts:120,hours:10,note:'照明情景 120 W × 10 h；照度与人因舒适度同样重要。'},
 officeHVAC:{name:'中央送风',position:[.5,2.95,-3.1],watts:2000,hours:8,note:'2000 W 输入情景仅代表此分区，不冒充整栋楼中央空调实测值。'},
 desk:{name:'办公桌',position:[-1.5,.7,-1.2],watts:0,hours:0,note:'家具 Scope 3 需材料清单、供应商 EPD 和核算边界；模型仅提供几何与材质。'},
 coffeeMachine:{name:'意式咖啡机',position:[.3,1.25,-1.9],watts:1400,hours:1,note:'1400 W × 1 h 等效满负荷运行是教学情景；拿铁还包含奶、豆、包装与物流。'},
 fridge:{name:'冷藏展示柜',position:[2.6,1.05,-2.35],watts:42,hours:24,note:'42 W 为假设的全天平均输入，不是铭牌最大功率；冷媒泄漏属于待核验直接排放。'},
 grinder:{name:'咖啡研磨机',position:[-1.4,1.2,-1.9],watts:300,hours:.25,note:'300 W × 0.25 h 为教学输入；咖啡豆产地、烘焙与运输需单独溯源。'},
 cafeLight:{name:'轨道射灯',position:[0,3.35,0],watts:60,hours:10,note:'照明情景 60 W × 10 h；不把装饰灯光变化等同于真实电表变化。'},
 counter:{name:'不锈钢吧台',position:[-.5,.9,-1.8],watts:0,hours:0,note:'钢材制造和咖啡供应链需要不同证据。不能把购电与产品生命周期数据混为一项。'},
};
export const SPACES:Record<SpaceKind,{name:string;english:string;building:number;objects:SpaceObject[];story:string}>={
 home:{name:'低碳住宅',english:'RESIDENTIAL A',building:0,objects:['aircon','sofa','table','television','plant','kettle','curtain'],story:'从一壶水、一度电，理解日常起居的运营排放。'},
 office:{name:'高耗能写字楼',english:'OFFICE TOWER',building:4,objects:['server','computer','officeHVAC','officeLight','desk'],story:'常亮的机柜与空置的工位：营业时间之外，能源流向哪里？'},
 cafe:{name:'街角咖啡厅',english:'NEIGHBOURHOOD CAFÉ',building:5,objects:['coffeeMachine','fridge','grinder','cafeLight','counter'],story:'一杯拿铁的边界，不止在插座，也在牧场、农场和供应链。'},
};
export const LANDMARKS=[0,4,5] as const;
export function spaceForBuilding(id:number):SpaceKind{return id===4?'office':id===5?'cafe':'home';}
export type DeviceStates=Partial<Record<SpaceObject,boolean>>;
export const defaultDevices:DeviceStates={television:false,kettle:false,server:true,computer:true,officeHVAC:true,officeLight:true,coffeeMachine:true,fridge:true,grinder:true,cafeLight:true};
export function objectKWh(id:SpaceObject,energy:RoomEnergy,devices:DeviceStates):number{
 if(id==='aircon')return calculateRoom(energy).watts*energy.hours/1000;
 const spec=OBJECTS[id];return devices[id]?spec.watts*spec.hours/1000:0;
}
export function calculateSpace(kind:SpaceKind,energy:RoomEnergy,devices:DeviceStates){
 const objects=SPACES[kind].objects.map(id=>({id,kWh:objectKWh(id,energy,devices)}));
 const daily=objects.reduce((sum,v)=>sum+v.kWh,0)+(kind==='home'?energy.lighting*.01:0);
 return {kind,objects,daily,monthly:daily*30,scope2Daily:daily*FACTORS.electricity.value};
}
