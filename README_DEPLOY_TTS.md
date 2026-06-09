# TalKong Cloudflare Pages 部署包

这个包已把你刚上传的文件按 Cloudflare Pages 需要的结构重新整理：

```text
index.html
_headers
_redirects
functions/api/tts.js
README_DEPLOY_TTS.md
```

## 为什么要这样整理

你这次上传的文件内容看起来是错位的：

- `README_DEPLOY_TTS.md` 实际上是完整网页 HTML，所以本包改名为 `index.html`。
- `index.html` 实际上是 Cloudflare `_headers` 配置，所以本包改名为 `_headers`。
- `README.md` 实际上是 SPA fallback 路由配置，所以本包改名为 `_redirects`。
- `_redirects` 实际上是 Cloudflare Pages Function，所以本包放到 `functions/api/tts.js`。

## 上传到 GitHub

把本包解压后，将以下文件/目录上传或覆盖到 GitHub 仓库根目录：

```text
index.html
_headers
_redirects
functions/
README_DEPLOY_TTS.md
```

不要把旧的错位文件继续当作原名称上传。

## Cloudflare Pages 设置

在 Cloudflare Pages 项目里确认环境变量 Secret：

```text
GOOGLE_TTS_API_KEY
```

保存后重新 Deploy。

## 测试 TTS

部署完成后打开：

```text
https://你的域名/api/tts?text=飲茶啦&lang=yue-HK
```

浏览器如果能直接播放或下载 MP3，说明 TTS Function 正常。

## 这版额外修正

- 修正移动端 viewport，加入 `viewport-fit=cover`。
- 增加 iPhone safe-area 底部导航适配。
- 输入框字号固定到 16px，减少 iOS 聚焦自动放大。
- 增加触控优化 `touch-action: manipulation`。
- TTS Function 的 Cache API key 改成 GET request，避免 POST 请求缓存兼容问题。
- JSON 错误响应和音频响应加入更明确的缓存/内容类型头。
