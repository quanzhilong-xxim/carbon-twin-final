'use client';

import Link from 'next/link';
import { ArrowUpRight, BriefcaseBusiness, Building2, GraduationCap } from 'lucide-react';
import { useCarbonStore } from '@/lib/store';
import { exploreCharacterPoster } from '@/lib/visuals/exploreCharacterAssets';

const roles = [
  { id: 'business', index: '01', title: '企业主 / 创业者', english: 'THE BUILDER', description: '每一次采购和设计，都能为未来的增长留下一点空间。', context: '决策现场 / 价值链', backdrop: '/media/explore-v10/waterfront-v5.webp', icon: BriefcaseBusiness },
  { id: 'city', index: '02', title: '城市管理者', english: 'THE STEWARD', description: '在有限的土地与资源之间，寻找更多人都能抵达的答案。', context: '治理现场 / 公共生活', backdrop: '/media/explore-v10/innovation-v5.webp', icon: Building2 },
  { id: 'student', index: '03', title: '学生 / 探索者', english: 'THE LEARNER', description: '从一条通勤路线开始，把好奇变成可以追问的问题。', context: '学习现场 / 日常选择', backdrop: '/media/explore-v10/valley-v8.webp', icon: GraduationCap },
] as const;

export default function ExploreRolePreview() {
  const setIdentity = useCarbonStore(state => state.setIdentity);
  return <section className="explore-roles" aria-labelledby="roles-heading">
    <div className="explore-section-heading roles-heading"><div><span className="explore-kicker">{'// CHOOSE YOUR ROLE · DIFFERENT LENSES'}</span><h2 id="roles-heading">选择你的<i>城市视角。</i></h2></div><p>同一座城市，三种身份，三种需要被看见的关系。点击角色，进入完整的身份视角体验。</p></div>
    <div className="role-preview-grid">{roles.map(({ id, index, title, english, description, context, backdrop, icon: Icon }) => <Link key={id} href="/#identities" onClick={() => setIdentity(id)} className={`role-preview role-preview-${id}`}>
      <span className="role-preview-backdrop" style={{ backgroundImage: `url(${backdrop})` }} aria-hidden="true" />
      <span className="role-preview-shade" aria-hidden="true" />
      <span className="role-preview-portrait" style={{backgroundImage:`url(${exploreCharacterPoster(id, true)})`}} aria-hidden="true" />
      <span className="role-preview-top"><b>{index}</b><span>{context}</span><Icon size={20} aria-hidden="true" /></span>
      <span className="role-preview-copy"><small>{english}</small><strong>{id==='business'?<>企业主<span className="role-preview-subtitle">创业者</span></>:title}</strong><em>{description}</em><span className="role-preview-cta">进入角色 <ArrowUpRight size={16} aria-hidden="true" /></span></span>
    </Link>)}</div><p className="character-credit">角色改编：<a href="https://studio.blender.org/characters/rain/v2/" target="_blank" rel="noreferrer">Rain</a> / <a href="https://studio.blender.org/characters/snow/v2/" target="_blank" rel="noreferrer">Snow</a> © Blender Foundation · CC BY 4.0；CarbonTwin 原创服装与道具。进入角色可查看实时三维与独立动作。</p>
  </section>;
}
