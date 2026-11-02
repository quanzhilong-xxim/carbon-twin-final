import localforage from 'localforage';
export interface ARSnapshot { image: string; createdAt: number; garment: string; tracking: string }
const db=localforage.createInstance({name:'CarbonTwinDB',storeName:'ar_snapshots'});
export const saveARSnapshot=(snapshot:ARSnapshot)=>db.setItem('latest',snapshot);
export const latestARSnapshot=()=>db.getItem<ARSnapshot>('latest');
