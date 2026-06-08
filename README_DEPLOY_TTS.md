# Talkong Cloudflare Pages + Google Cloud Text-to-Speech 部署说明

本包已经完成两处修改：

1. 新增 `functions/api/tts.js`：Cloudflare Pages Function，负责调用 Google Cloud Text-to-Speech。
2. 修改 `index.html`：增加 `window.TALKONG_TTS_ENDPOINT = "/api/tts";`，并修正自定义 TTS endpoint 的语言参数。

## GitHub 上传

把本包里的所有文件覆盖到 GitHub 仓库根目录：

```text
README.md
_headers
_redirects
index.html
functions/api/tts.js
README_DEPLOY_TTS.md
```

提交后 Cloudflare Pages 会自动部署。

## Cloudflare Pages 环境变量

进入 Cloudflare Dashboard：

```text
Workers & Pages
→ 选择 talkong 项目
→ Settings
→ Variables and Secrets
→ Add
```

添加：

```text
Variable name: GOOGLE_TTS_API_KEY
Value: 你的 Google Cloud API key
Type: Secret
Environment: Production
```

建议 Preview 也添加同样的变量，方便预览部署测试。

添加环境变量后，要重新部署一次。

## 测试

部署完成后打开：

```text
https://你的域名/api/tts?text=飲茶啦&lang=yue-HK
```

如果返回/播放 MP3，说明后端成功。

然后再在手机端测试词卡发音和翻译结果发音。

## 注意

不要把 Google API key 写进前端 JavaScript。只放在 Cloudflare Pages 的 Secret 环境变量里。
