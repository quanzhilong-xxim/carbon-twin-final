# CarbonTwin 正式参赛版三维资源清单

> 生成时间：2026-11-18 14:05；来源：正式网站生产部署 `https://carbontwin.pages.dev`（构建产物目录 `static-src\out`，对应部署 `d5bd77fc-037e-40e4-877e-007dc28cf213`）。
> 本清单列出的是**正式站实际发布的 237 个静态资源文件（约 808 MB）**；原始开发资产（Blender 母体、历史候选模型）共约 11.43 GB，不属于运行必需资源，见第 4 节。

## 1. 资源分类汇总

| 类别 | 文件数 | 体积 | 用途 |
|---|---:|---:|---|
| `audio/` | 1 | 0.2 MB | 原创环境音频 |
| `draco/` | 3 | 0.7 MB | GLTF Draco 几何压缩解码器 |
| `environments/` | 3 | 17.7 MB | HDR 环境光照 |
| `fonts/` | 7 | 0.1 MB | 自托管字体（OFL） |
| `garments/` | 9 | 3.1 MB | AI 试衣服装贴图 |
| `media/` | 28 | 32.3 MB | 首页与场景视频/音频片段 |
| `mediapipe/` | 8 | 53.4 MB | MediaPipe 人体姿态检测模型 |
| `models/` | 157 | 694.9 MB | 三维模型（城市/建筑/角色/室内/服装/沙盘场景） |
| `textures/` | 18 | 5.6 MB | 材质与贴图 |

## 2. 关键运行资源（按类别）

### audio/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /audio/aircon-loop.wav | 0.17 MB |

### draco/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /draco/draco_decoder.js | 0.49 MB |
| /draco/draco_decoder.wasm | 0.18 MB |
| /draco/draco_wasm_wrapper.js | 0.06 MB |

### environments/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /environments/citylight/kloppenheim_06_puresky_4k.hdr | 16.58 MB |
| /environments/citylight/kloppenheim_06_puresky_1k.hdr | 1.12 MB |
| /environments/citylight/LICENSE.md | 0 MB |

### fonts/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /fonts/manrope.woff2 | 0.02 MB |
| /fonts/manrope-latin-variable.woff2 | 0.02 MB |
| /fonts/instrument-serif.woff2 | 0.02 MB |
| /fonts/instrument-serif-latin-italic.woff2 | 0.01 MB |
| /fonts/instrument-serif-latin-normal.woff2 | 0.01 MB |
| /fonts/instrument-serif-OFL.txt | 0 MB |
| /fonts/manrope-OFL.txt | 0 MB |

### garments/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /garments/shorts.png | 0.84 MB |
| /garments/longsleeve.png | 0.57 MB |
| /garments/jacket.png | 0.4 MB |
| /garments/jeans.png | 0.39 MB |
| /garments/coat.png | 0.33 MB |
| /garments/sweater.png | 0.2 MB |
| /garments/wool.png | 0.14 MB |
| /garments/tshirt.png | 0.11 MB |
| /garments/trousers.png | 0.11 MB |

### media/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /media/still-water.mp4 | 9.25 MB |
| /media/deep-woods.mp4 | 8.73 MB |
| /media/golden-hour.mp4 | 7.99 MB |
| /media/city-poster.svg | 2.3 MB |
| /media/ambient.mp3 | 0.73 MB |
| /media/sakura-poster.png | 0.51 MB |
| /media/still-water.jpg | 0.41 MB |
| /media/explore-v10/valley-v5.webp | 0.31 MB |
| /media/explore-v10/innovation-v5.webp | 0.27 MB |
| /media/explore-v10/culture-v5.webp | 0.21 MB |
| /media/explore-v10/valley-v8.webp | 0.2 MB |
| /media/quiet-dawn.mp4 | 0.2 MB |

### mediapipe/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /mediapipe/wasm/vision_wasm_module_internal.wasm | 13.99 MB |
| /mediapipe/wasm/vision_wasm_internal.wasm | 13.99 MB |
| /mediapipe/wasm/vision_wasm_nosimd_internal.wasm | 10.15 MB |
| /mediapipe/pose_landmarker_full.task | 8.96 MB |
| /mediapipe/pose_landmarker_lite.task | 5.51 MB |
| /mediapipe/wasm/vision_wasm_module_internal.js | 0.32 MB |
| /mediapipe/wasm/vision_wasm_internal.js | 0.32 MB |
| /mediapipe/wasm/vision_wasm_nosimd_internal.js | 0.2 MB |

### models/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /models/citylight/v12/light-court.glb | 24.27 MB |
| /models/characters-v1312-candidate/CT_Student_Explore_v1312A_desktop.glb | 23.8 MB |
| /models/characters-v1311-candidate/CT_Student_Explore_v1311D_desktop.glb | 23.8 MB |
| /models/characters-v138-candidate/CT_Student_Explore_v138B_desktop.glb | 23.52 MB |
| /models/characters-v1311-candidate/CT_Student_Explore_v1311C_desktop.glb | 23.52 MB |
| /models/characters-v137-candidate/CT_Student_Explore_v137C_desktop.glb | 23.52 MB |
| /models/characters-v139-candidate/CT_Student_Explore_v139A_desktop.glb | 23.51 MB |
| /models/characters-v1311-candidate/CT_Student_Explore_v1311A_desktop.glb | 23.42 MB |
| /models/characters-v13-master/student/CT_Student_Explore_Master_v135.glb | 23.13 MB |
| /models/characters-v13-candidate/CT_Student_Explore_v134-web.glb | 23.09 MB |
| /models/characters-v13-candidate/CT_Student_Explore_v132.glb | 22.46 MB |
| /models/characters-v12-candidate/CT_City_Explore_v123e.glb | 20.91 MB |

### textures/

| 文件（相对站点根路径） | 大小 |
|---|---:|
| /textures/sakura/bark-normal.jpg | 0.97 MB |
| /textures/behaviour-v108/grass/normal.jpg | 0.86 MB |
| /textures/research/library-floor-v104/color.jpg | 0.7 MB |
| /textures/behaviour-v108/grass/color.jpg | 0.64 MB |
| /textures/sakura/bark-color.jpg | 0.63 MB |
| /textures/research/library-floor-v104/roughness.jpg | 0.52 MB |
| /textures/research/library-floor-v104/normal.jpg | 0.41 MB |
| /textures/behaviour-v108/grass/roughness.jpg | 0.35 MB |
| /textures/sakura/bark-roughness.jpg | 0.32 MB |
| /textures/characters-v11/business-emerald-brocade.png | 0.04 MB |
| /textures/characters-v11/business-midnight-pinstripe.png | 0.03 MB |
| /textures/home-grain.png | 0.02 MB |

完整 237 个文件清单见 `assets-manifest.json`（含路径与字节数）。

## 3. 资源获取方式（评委可用）

1. **在线直接访问**：正式网站 https://carbontwin.pages.dev/ 会按页面自动加载上述资源，无需下载。
2. **批量下载到本地源码目录**：运行同目录 `download-assets.ps1`，脚本从正式站逐文件下载并按原路径写入 `CarbonTwin项目源代码\`；已存在且大小一致的文件自动跳过，不重复下载。
3. **公众号开地址示例**：
   - 学生角色：`https://carbontwin.pages.dev/models/characters-v1312-candidate/CT_Student_Explore_v1312A_desktop.glb`
   - 光之塔：`https://carbontwin.pages.dev/models/citylight/v12/light-court.glb`
   - 姿态模型：`https://carbontwin.pages.dev/mediapipe/` 目录下 8 个文件
4. **离线交付包**：本机完整资源位于 `CarbonTwin_App\public\`（约 11.86 GB，含全部历史资产）；备份 `D:\CarbonTwin_Recovery_Backups\predeploy-cloud-20261114-215340`。

## 4. 未纳入运行资源的历史开发资产（约 11.43 GB）

| 类别 | 位置 | 说明 |
|---|---|---|
| Blender 母体与源文件 | `CarbonTwin_App\public\models\**\*.blend` | 仅在本地保留，不是网站运行必需；含制作过程版本 |
| 历史候选角色模型（V10–V13 系列） | `public\models\characters-*` | 正式站只引用 v1312A/v123 等上线版本，其余为历史候选 |
| 历史评审/实验资产 | `public\citylight-review-*`、`public\reviews` | 研究与评审截图，不参与正式站运行 |
| 开发缓存/构建产物 | `.next-*`、`out`、`node_modules` | 可重新生成，不交付 |

## 5. 来源与授权

- 角色基础拓扑：Blender Foundation Rain / Snow，CC BY 4.0（页面已署名）。
- 场景家具/建筑/书架等：Poly Haven、Kenney，CC0 1.0。
- 服装模型：Sketchfab / Objaverse 作者，CC BY 4.0（逐件见 `public/models/clothing/sources.json`）。
- 视频/音频：Wikimedia Commons（CC BY-SA 4.0 / CC BY 3.0）、NASA（Public Domain）、SoundHelix（署名使用）。
- 字体：Instrument Serif、Manrope，SIL OFL 1.1。
- 逐项来源、作者、许可与修改说明见 `第三方资源及许可证说明.md` 与各资产目录 `sources.json`。

## 6. 完整性说明

- 本清单来自正式站发布目录，路径与线上一致；下载脚本按站点根 + 路径拼接，公开可访问。
- 未在本清单中的原始 Blender 母体、历史候选与缓存，不属于正式站运行必需资源；如确需，请从本机完整工程或备份获取。
- 若下载后页面仍缺资源，请检查 `public/models` 等目录是否与源码目录同级、文件名大小写是否一致。

