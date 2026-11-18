# CarbonTwin 第三方资源及许可证说明

> 本文档整理 CarbonTwin 实际使用的开源项目、三维模型、贴图、字体、影像与 AI 服务。**不能删除原有署名，也不能把第三方模型宣称为团队独立原创。** 所有条目来自工程内真实记录（`public/**/sources.json`、`ASSET-SOURCES.md`、`docs/academic-ai-assets/LICENSES.md`、`public/media/credits.json` 等）。未登记来源的资产单独列为“待核验”。

## 1. 三维角色

| 资源 | 作者 / 机构 | 来源 | 许可 | 在 CarbonTwin 中的用途 | 公开分发 |
|---|---|---|---|---|---|
| Rain（学生/城市管理者角色基础拓扑） | Blender Foundation | https://studio.blender.org/characters/rain/v2/ | CC BY 4.0 | 角色基础网格；本项目做了发型、服装、道具、材质与动作改编 | 允许，须署名并注明改编 |
| Snow（企业主角色基础拓扑） | Blender Foundation | https://studio.blender.org/characters/snow/v2/ | CC BY 4.0 | 角色基础网格；本项目做了发型、眼镜、服装与局部几何修复 | 允许，须署名并注明改编 |
| CarbonTwin 原创服装/道具/动作 | CarbonTwin 项目 | 工程内 `public/models/characters-*` 与 `lib/visuals/` | 项目原创 | 角色服装、相机、滑板、背包、发束、织纹、动作 | 项目自有 |

> 网站页面已显示署名：“角色改编：Rain / Snow © Blender Foundation · CC BY 4.0；CarbonTwin 原创服装与道具。”该署名不得删除。

## 2. 服装模型（Objaverse / Sketchfab）

记录文件：`public/models/clothing/sources.json`（逐件 UID、作者、许可、三角面数、修改说明）。

| 服装 | 作者 | 来源 | 许可 | 修改 |
|---|---|---|---|---|
| T-shirt | Nayeem | https://sketchfab.com/3d-models/7018d8578d6b4ee7af010d26eda1ecc9 | CC BY 4.0 | 网格优化、材质转换、运行时改色 |
| Jeans Jacket #AgisoftClothesChallenge | Sircher | https://sketchfab.com/3d-models/4348be24475c45dd9a5bdf6e62ba7ebc | CC BY 4.0 | 同上 |
| Capri Khaki Royalton Excursions | albertoch | https://sketchfab.com/3d-models/33ec066dd147462494ff1ab544bcc469 | CC BY 4.0 | 同上 |
| Orange Puff Shorts | Mckai（作者页 tijerin_art） | https://sketchfab.com/3d-models/orange-puff-shorts-f6bca89e7a49466daad36b259fbe0772 | CC BY 4.0 | 改为卡其色、哑光布料，隐藏装饰流苏 |
| Male Sweater | ntrousdale | https://sketchfab.com/3d-models/7075ff0a93d14fdd8cf34121f0897777 | CC BY 4.0 | 网格优化、材质转换 |
| Original Blue Denim Jeans | hazelmatthews | https://sketchfab.com/3d-models/ea045ee2bd364a6fb21a2c51181bcaf9 | CC BY 4.0 | 网格优化、材质转换 |

- 归档来源：https://huggingface.co/datasets/allenai/objaverse
- 织物贴图：Poly Haven `fabric_pattern_05`、`denim_fabric`、`knitted_fleece`，CC0。
- 说明：以上为三维服装网格，**不是**图像到三维的 AI 重建；运行时改色与布料材质转换属于本项目改造。

## 3. 场景与环境资产（Poly Haven / Kenney，CC0 1.0）

记录文件：`public/models/twin/sources.json`、`public/models/city-studies/ASSET-SOURCES.md`、`docs/recovery/v10.4/usage-and-licenses.md`。

| 资源 | 来源 | 许可 | 用途 |
|---|---|---|---|
| city.glb（19 种完整建筑变体 + 16 种低细节变体） | Kenney City Kit Commercial：https://kenney.nl/assets/city-kit-commercial | CC0 1.0 | 城市建筑体块 |
| Sofa 01 / sofa_03 / modern coffee table 01 / exterior aircon unit / potted plant 01 / television 02 / modular urban apartments facade / laminate floor 02 / bar chair round 01 / metal office desk / CoffeeCart 01 / vintage electric kettle | Poly Haven 各资产页 | CC0 1.0 | 室内家具与设备 |
| dikhololo_night（HDR）、lebombo（HDR） | Poly Haven | CC0 1.0 | 环境光照 |
| venice_sunset_1k.hdr、potsdamer_platz_1k.hdr | Poly Haven：https://polyhaven.com/a/venice_sunset、https://polyhaven.com/a/potsdamer_platz | CC0 1.0 | 建筑反射/昼夜光照 |
| Wooden Bookshelf Worn 1K | https://polyhaven.com/a/wooden_bookshelf_worn | CC0 1.0 | 学术档案图书馆书架 |
| Wooden Floor 02 1K（Charlotte Baglioni / Rico Cilliers） | https://polyhaven.com/a/wooden_floor_02 | CC0 1.0 | 图书馆真实地板 |
| Natural Earth 陆地几何 | https://www.naturalearthdata.com/ | Public Domain | 学术档案地球纹理（不含排放数值） |

> Poly Haven 许可：https://polyhaven.com/license ；CC0 法律文本：https://creativecommons.org/publicdomain/zero/1.0/

## 4. 影像与音频（Wikimedia Commons / NASA / SoundHelix）

记录文件：`public/media/credits.json`。

| 资源 | 作者 | 来源 | 许可 | 修改 |
|---|---|---|---|---|
| Montreal (Jean-Drapeau Park) 延时 | Andre Carrotflower | Wikimedia Commons | CC BY-SA 4.0 | 截取 12 秒、缩至 1920 宽、去声 H.264 |
| Hatfield Forest 湖泊延时 | Acabashi | Wikimedia Commons | CC BY-SA 4.0 | 同上 |
| Belarus 森林航拍（首页引用） | Vladislav Sanikovich | Wikimedia Commons | CC BY 3.0 | 12 秒片段、1920 宽、去声 |
| Artemis II 月升延时 | NASA Kennedy Space Center | Wikimedia Commons | Public domain | 12 秒片段 |
| SoundHelix Song 1（环境音） | T. Schürger / SoundHelix | https://www.soundhelix.com/audio-examples | 允许署名后再使用 | 48 秒片段，淡入淡出 |

> **CC BY-SA 4.0 的影像在分发网站时须保留署名与相同方式共享要求**；网页中已保留来源链接。若后续改为商业发行，需重新评估。
> 音频 `public/audio/aircon-loop.wav` 为项目原创合成滤波噪声与 55 Hz 音调，非设备实录。

## 5. 字体

| 字体 | 文件 | 许可 | 使用 |
|---|---|---|---|
| Instrument Serif | `public/fonts/instrument-serif-*` | SIL Open Font License 1.1（`instrument-serif-OFL.txt`） | 标题与编辑排版 |
| Manrope | `public/fonts/manrope-*` | SIL Open Font License 1.1（`manrope-OFL.txt`） | 正文与界面 |

字体文件自托管于 `public/fonts/`，通过 `next/font/local` 引入，不依赖在线 Google Fonts 请求；OFL 许可文本随字体一同保留。

## 6. 开源软件与工具

| 名称 | 版本（真实） | 许可（依据包声明） | 用途 |
|---|---|---|---|
| Next.js | 14.2.35 | MIT | Web 框架（App Router） |
| React / React DOM | 18.3.1 | MIT | UI 运行时 |
| TypeScript | 5.x | Apache-2.0 | 类型系统 |
| three | 0.187.0 | MIT | WebGL 三维渲染 |
| @react-three/fiber | 8.18.0 | MIT | React 的 Three 渲染器 |
| @react-three/drei | 9.122.0 | MIT | 三维辅助组件 |
| @react-three/rapier | 1.5.0 | MIT | 物理 |
| @react-three/postprocessing | 2.19.1 | MIT | 后期处理 |
| @mediapipe/tasks-vision | 1.2.3 | Apache-2.0 | 人体姿态识别 |
| ai（Vercel AI SDK） | 7.x | Apache-2.0 | AI 流式接口协议 |
| zustand | 5.0.16 | MIT | 状态管理 |
| tailwindcss | 3.4.17 | MIT | 原子化 CSS |
| echarts / echarts-for-react | 6.1.0 / 3.0.6 | Apache-2.0 / MIT | 图表 |
| gsap / @gsap/react | 3.15.0 / 2.1.2 | GSAP 自有免费许可（非 OSI 开源） | 动画（需遵守 GreenSock 授权条款） |
| framer-motion | 14.9.0 | MIT | 动效 |
| lenis | 1.3.27 | MIT | 平滑滚动 |
| lucide-react | 1.66.0 | ISC | 图标 |
| localforage | 1.10.0 | Apache-2.0 | 本地存储 |
| howler | 2.2.4 | MIT | 音频播放 |
| jspdf / html2canvas | 4.2.1 / 1.4.1 | MIT | 报告导出 |
| canvas-confetti | 1.9.4 | ISC | 庆祝动效 |
| @samasante/liquid-glass | 0.1.1 | MIT（包内 LICENSE 已核对） | 液态玻璃折射效果 |
| zod | 4.6.7 | MIT | 请求校验 |
| @playwright/test | 1.64.1 | Apache-2.0 | 浏览器测试 |
| Blender（便携版 4.5 LTS / 5.2.3） | 制作工具 | GPL（应用程序本身） | 三维建模与导出；**不是产品运行时依赖**，导出的资产不受 GPL 传染 |

> 依赖许可以 `node_modules/*/package.json` 中的 `license` 字段为准；上表为已核对或包声明明确者。若需逐包完整许可证清单，可在安装依赖后运行 `npx license-checker --summary` 生成（本轮未重新安装依赖，未生成完整清单）。

## 7. AI 服务与数据来源（非开源软件）

| 服务/数据 | 提供方 | 使用方式 | 分发与费用边界 |
|---|---|---|---|
| DeepSeek Chat API | 深度求索 | 服务端调用 `deepseek-chat` | 按官方服务条款使用；密钥不入客户端；无付费套餐 |
| 豆包 Seed-TTS 2.0 | 火山引擎 | 服务端调用语音合成 | 按官方服务条款；密钥不入客户端 |
| Aidge 虚拟试穿 + 阿里云 OSS | 阿里云 | 服务端签名调用，私有桶临时图片 | 免费额度 30 张/90 天；用尽即停，不转按量付费 |
| MediaPipe Pose Landmarker | Google | 浏览器本地推理 | Apache-2.0（代码/模型按官方条款） |
| Web Speech API | 浏览器 | 浏览器内置 ASR | 由浏览器厂商提供，无云端凭证 |
| IPCC AR6 / GHG Protocol / 生态环境部 / US EPA / EWG / NASA GISTEMP / NOAA GML | 各机构 | 作为学术引用与教学因子来源 | **仅引用数据与结论，不复制整篇文献**；中译与解释为本项目编辑工作；不代表机构合作或背书 |

## 8. 明确未使用 / 未授权内容

- 工程记录（`docs/citylight/v16/SOURCE_LICENSES.csv`）显示：若干用户提供的参考图仅用于私人参考分析，**从未作为三维表面纹理使用**，不推断为 CC0 或可再分发许可。
- Tripo、Luma、腾讯 TokenHub 等生成服务：只有查看记录，**未实际调用生成**，未产生资产。
- 未复制第三方视频、私有代码或概念图进入产品；`docs/recent-50-item` 类研究清单只是资料索引，不是复制许可。
- 网站不声称与 IPCC、GHG Protocol、NASA、NOAA、Blender Foundation 等机构存在合作或背书关系。

## 9. 待补充核验项（如实标注）

1. AI 试衣使用的 7 件服装贴图（`public/garments/` 与 OSS `garments/*.png`）未在工程内逐件登记来源，建议提交前补充作者/来源/许可或说明为项目自制素材。
2. 部分历史阶段资产（如 V5/V16 光之塔研究资产）在 `SOURCE_LICENSES.csv` 中标注为“private local study / NOT_APPROVED”，**未纳入正式比赛版发布**；若后续使用需重新核验。
3. 依赖许可清单（完整 SPDX 列表）未在本轮重新生成；上表为已核对项，未逐包复核的以包声明为准。
4. GSAP 为自有许可而非 MIT，若未来用于商业分发需确认其授权范围。
