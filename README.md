# CarbonTwin · Phase A 工程底座

## A1 当前交付（2026-11-02）

已增加严格契约、数值校验、分段 Sigmoid、不可变数据读取、五态任务所有权与四秒熔断、带世代与可见性感知的 Worker 控制器。根 Providers 仅挂载运行生命周期，没有增加复杂 UI。A2 的 AI 解析与快照实现尚未开始。

运行 `npm run test:a1` 可执行单元测试与真实 Chrome Worker 强制终止恢复测试。详细边界、状态表与清理规则见 [docs/A1.md](docs/A1.md)。

面向碳知识学习的交互平台，基于 Next.js 14 App Router、React 18、TypeScript、Tailwind CSS 3、Prisma 和 Supabase PostgreSQL。

## 本地预览

在本目录运行：

```powershell
npm run dev -- --hostname 127.0.0.1 --port 3014
```

浏览器打开 http://127.0.0.1:3014 。也可以双击本目录的 `START.cmd`。如果页面已可访问，无需再次启动。

## Supabase 与环境变量

1. 在 Supabase 创建 PostgreSQL 项目，并在 Database Settings 设置数据库密码。
2. 复制 `.env.example` 为 `.env.local`。
3. 将 Supabase Transaction Pooler 地址填入 `DATABASE_URL`，端口使用 `6543`，并保留 `pgbouncer=true&connection_limit=1&sslmode=require`。
4. 将 Supabase Direct Connection 地址填入 `DIRECT_URL`，端口使用 `5432`，仅用于 Prisma migration。
5. 生成 `NEXTAUTH_SECRET`，不要将 `.env.local` 提交到 Git。
6. DeepSeek 配置仅在需要 Phase B AI 接口时填写 `DEEPSEEK_API_KEY`。

密码中包含 `@`、`#`、`%` 等字符时必须先进行 URL 编码。Vercel 部署时，在 Project Settings 的 Environment Variables 中分别配置 Production、Preview 和 Development 变量。

## Prisma

首次配置数据库后运行：

```powershell
npx prisma generate
npx prisma migrate dev --name phase_a_auth_base
```

生产部署使用：

```powershell
npx prisma migrate deploy
```

`DATABASE_URL` 用于运行时连接池，`DIRECT_URL` 只用于 migration。Vercel 运行时禁止使用本地 SQLite。

## 当前 Phase A 范围

- `components/Experience.tsx` 组织页面及 Lenis / GSAP 生命周期。
- `components/Background.tsx` 渲染粒子城市与星系，离开视口后暂停。
- `components/GlassPanel.tsx` 使用 `@samasante/liquid-glass` 光学材质；Chrome / Edge 支持实时背景折射，其他浏览器依照库的支持使用玻璃材质回退。
- `components/MagneticCursor.tsx` 使用指定阻尼弹簧参数；触屏与减少动态效果模式保留系统指针。
- `lib/store.ts` 集中管理身份、主题、滑块、知识展开及聊天预览状态。
- `lib/knowledge.ts` 保存附有 IPCC / GHG Protocol 原文链接的概念摘要。
- 已固定 Next.js 14、React 18、Tailwind 3 和 Prisma 依赖。
- 已建立 Supabase PostgreSQL 的 Pooler / Direct 双连接环境模板。
- 已建立 User、CarbonProfile、SimulationEvent、ChatMessage 和 KnowledgeBookmark 数据模型。
- 登录注册 API、NextAuth 页面和真实计算在步骤 2 继续实现。

## 检查

```powershell
npm run typecheck
npm run lint
npm run build
```

浏览器验收脚本为 `work/qa-phase1.mjs`，使用本机 Chrome；结果和截图位于 `work/`。

## 旧版本保留

重构前的源码位于 `work/phase1-before/`；原依赖及构建目录隔离在 `work/phase1-isolated/`。旧版 AI 接口、图表与扫描组件归档于 `work/phase1-legacy/`，没有挂载到第一阶段页面。这些目录已被 Git 忽略。

Google 字体通过 `next/font/google` 在构建时下载并由应用自行托管。Phase A 的数据库和 NextAuth 配置不需要模型 API Key。
