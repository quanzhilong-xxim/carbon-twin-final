import { CASE_REFERENCES } from './cases';
import { REFERENCES } from './references';
export type KnowledgeEntry = { id: string; index: string; title: string; english: string; organization: string; summary: string; explanation: string; url: string; source: string; category: string; };
// Curated concept explanations; emission factors are separately versioned in emissions.ts.
export const KNOWLEDGE: KnowledgeEntry[] = [
  { id: 'scope', index: '01', title: '你的排放，边界在哪里？', english: 'SCOPE 1 / 2 / 3', organization: 'GHG Protocol', category: '碳核算入门', summary: '从直接排放，到购入能源，再到完整价值链。', explanation: 'Scope 1 是企业拥有或控制的排放源产生的直接排放；Scope 2 来自购入电力、蒸汽、供热与制冷；Scope 3 涵盖价值链中其余间接排放。先明确组织边界，才能正确归类。', url: 'https://ghgprotocol.org/corporate-standard', source: 'GHG Protocol · Corporate Standard' },
  { id: 'climate', index: '02', title: '每一份减排，为什么重要？', english: 'EVERY FRACTION MATTERS', organization: 'IPCC', category: '气候科学', summary: '累积二氧化碳排放，与全球变暖紧密相关。', explanation: 'IPCC 第六次评估综合报告指出，人类活动已明确导致全球变暖。限制人为变暖需要限制累积 CO₂ 排放，至少实现 CO₂ 净零排放，并大幅减少其他温室气体排放。每增加一分变暖，风险都会上升。', url: 'https://www.ipcc.ch/report/ar6/syr/', source: 'IPCC · AR6 Synthesis Report (2023)' },
  { id: 'energy', index: '03', title: '少用一度电，意味着什么？', english: 'THE ENERGY CONNECTION', organization: 'GHG Protocol', category: '生活与能源', summary: '用电量相同，排放也可能因电力来源而不同。', explanation: '购入电力的间接排放与用电量、适用的排放因子和核算方法有关。基于地点的方法通常使用所在电网的平均因子；符合条件时，基于市场的方法还会考虑合同工具。不能用一个固定数字代表所有地区。', url: 'https://ghgprotocol.org/scope-2-guidance', source: 'GHG Protocol · Scope 2 Guidance' },
  ...CASE_REFERENCES.map(r=>({id:r.id,index:r.index,title:r.title,english:"REAL WORLD / PRIMARY SOURCES",organization:r.organization,category:"现实案例",summary:r.summary,explanation:r.explanation,url:r.url,source:r.citation})),
];
export interface KnowledgePassage { id: string; title: string; content: string; translation: string; source: string; url: string; doi?: string; year: number; locator: string }
/** Primary-source excerpts; GHGP has no DOI, so retain its official URL without inventing one. */
export const KNOWLEDGE_PASSAGES: KnowledgePassage[] = REFERENCES.map(r => ({ id:r.id, title:r.title, content:r.quote, translation:r.translation, source:r.citation, url:r.url, doi:r.doi, year:r.year, locator:r.locator }));

export const REAL_WORLD_CASES = CASE_REFERENCES;
