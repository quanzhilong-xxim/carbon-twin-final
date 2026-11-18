# functions/ —— 正式网站 Cloudflare Pages Functions

本目录是 **https://carbontwin.pages.dev/ 当前生产部署实际使用的服务端接口代码**，
从正式部署工作目录 `D:\CarbonTwin_Workspace\Deployments\cloud-20261114\static-src\functions` 同步而来。

| 文件 | 作用 |
|---|---|
| `api/chat.js` | DeepSeek 对话（SSE，服务端密钥） |
| `api/tts.js` | 豆包 Seed-TTS 2.0 语音合成 |
| `api/ai/status.js` | AI 配置状态（不返回密钥） |
| `api/tryon/generate.js` | Aidge AI 虚拟试衣 |
| `api/tryon/health.js`、`api/tryon/status.js` | 试衣服务状态 |
| `api/[[path]].js` | 其他 /api/* 的 200 说明兜底 |
| `_lib/aidge.js`、`_lib/bailian.js` | 阿里云签名与调用封装 |

运行前提：Cloudflare Pages 项目启用 `functions/` 目录，并在平台 Settings → Variables and Secrets 配置
`DEEPSEEK_API_KEY`、`VOLCENGINE_TTS_API_KEY`、`AIDGE_*` 等变量（详见 `桌面\环境配置\环境变量配置说明.md`）。
静态页面导出与 Node 版 `app/api` 的差异说明见 `README.md` 第 8 节与 `ASSETS.md`。
