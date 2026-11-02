# CarbonTwin · 城市、失衡、复苏

2026-11-02，在组件实现前确定的艺术指导。用户明确选择治愈、绿色、夸张交互，无需另选风格。

```yaml
creative_spec:
  style_card_id: null
  subject: 碳排教学中的城市与数字森林
  use: 可操作的网页首屏、生态沙盘、AI叙事插画
  composition: 左侧严谨数据，右侧空间奇观；沙盘以中央生命树为主体，数据与操作保持可见
  material_texture: 微粒、柔光、深色玻璃；植物使用自绘手工曲线
  lighting: 树冠内部柔和绿光、暖金花朵与青蓝轮廓光；高排放转暗红
  palette: 深空#050B14，生态绿#39FF14，青蓝#77DAD2，暖金#E5C777，警示#C95350
  mood: 温柔而有力量，惊奇但可信
  invariants: [真实数据驱动, 不将森林隐喻伪称生态预测, 可减弱动效, 无视频背景, 不执行模型生成代码]
  avoid: [满屏荧光, 高速闪烁, 虚构科学来源, 用渲染结果冒充实测录像]
  aspect_ratio: responsive
```

无单一审美卡适合此混合场景，因此按 img-gen-taste 允许的第一原则设计，不冒充某张卡的复现。查阅 graphic-abstract 与 illustration-storytelling 两份参考。

Derived EN: An interactive carbon learning observatory: a luminous voxel city reshapes into a living digital forest. Gentle cyan depth, green fireflies, warm gold blossoms, spacious dark editorial typography. User choices move the ecosystem between stress and recovery; evidence and numerical boundaries stay legible. No stock video, no copied scene, no flashing spectacle.

中文改编：一座可操作的碳知识观测站，发光点阵城市随用户选择重组为森林。青蓝景深、绿色流萤、暖金花朵，搭配深色学术排版。生态失衡与恢复是教学隐喻，真实数值与文献边界始终清晰。

## 提示词来源与原创改编

- XiaoyeCodes/code-animation-prompts，B2「萤火光尘」：采用慢速上升、不同景深和柔和呼吸；原提示偏暖色，绿色/青蓝是本项目改编。
- 同库 B3「粒子聚形」：采用同一批点在不同几何目标之间平滑过渡的思想；手写城市→树冠映射，未复制示例心形/房屋代码。
- 同库 K26「卡通渲染 3D」：采用可辨认轮廓与简化树冠；2D 植物另用原生 Canvas 曲线自绘，未声称该条包含植物生长参数。
- Akillll-DuoHe/fy-code-animation：语义分镜、场景/运动分离、确定性参数、性能预算。模型只输出受限 storyboard，浏览器渲染预先审核的图元；不生成或执行脚本，不渲染 MP4。
- NanmiCoder/open-image-prompts：安装 img-gen-taste / img-gen-prompts，检索 oip-visual-v2。若无精确记录，记录检索缺口，不把不相关图片当证据。
- React Bits Shiny Text：参考其渐变文字扫光原理，以自写 CSS 实现暖金—绿金流光。

运动预算：呼吸周期约8秒，目标重组约1.8秒，镜头插值0.05。桌面城市≥20000实例；移动/低帧率关闭WebGL；Canvas降采样并在离屏、后台、减弱动效时暂停。声音默认静音，WebAudio合成，不引入远程音频。

官方参考：https://r3f.docs.pmnd.rs/api/hooks 、https://reactbits.dev/text-animations/shiny-text 、https://next-auth.js.org/providers/credentials 、https://docs.netlify.com/build/data-and-storage/netlify-blobs/
