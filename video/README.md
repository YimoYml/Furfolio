# Furfolio 宣传片

30 秒横屏 4:3，1440 × 1080，60 fps。奶油纸、青柠与钴蓝主视觉，穿插四种实际模板、编辑器和手机响应式页面。字体遮罩、短距离位移、匀速 ticker 和克制背景网格；入场曲线为 cubic-bezier(.22,1,.36,1)，没有弹跳、夸张 glitch 或新增 AI 3D 图标。

## 预览与导出

在本目录执行 `npm ci`，再执行 `npm run studio`。浏览器打开 http://localhost:3300/Furfolio-Promo。六个分镜也可独立打开修改。

`npm run check` 检查 TypeScript；`npm run render` 导出 `../outputs/promo-video/furfolio-promo-4x3.mp4`。Remotion 版本固定为 4.0.534；首次导出可能自动下载 Chrome Headless Shell。

成片播放器：在本目录执行 `node scripts/preview-server.mjs`，打开 http://127.0.0.1:3301/。只在本机监听。

## 分镜

| 时间 | 画面 |
| --- | --- |
| 0–4 秒 | 把你的角色，带到网上。 |
| 4–10 秒 | Y2K / Minimal / Cyber / Editorial 四种实际范本 |
| 10–16 秒 | 真实编辑器，青柠配色切换为粉纸配色 |
| 16–21 秒 | 桌面与手机，手机内容轻滚动 |
| 21–26 秒 | 设计 → 注册 → 发布，说明产品的实际流程 |
| 26–30 秒 | 品牌、网站地址、开始我的主页 |

网页画面由本项目真实 Vue 页面截图采集，并关闭示例入场动效以避免截图空白。编辑器使用独立 `localhost:5173` 演示草稿，未修改 `127.0.0.1:5173` 草稿，也未触发注册、云端发布或改动在线网站。鼠标移动及配色切换由 Remotion 时间线编排；非实时操作录屏。流程镜头为动效说明，没有伪造账号或发布成功通知。

## 配乐与素材

配乐 `public/audio/furfolio-bed.wav` 为本次原创代码合成：30 秒、96 BPM、48 kHz 立体声。柔和合成器、拨音、轻打击；4/10/16/21/26 秒转场提示。没有外部音乐采样或第三方曲目。`scripts/make-audio.py` 可重新生成，依赖 Python + numpy。

角色使用用户指定的现有网站示例 `che-cutout.png` 与已有页面中的示例画廊。这些既有示例是 AI 插画；本次没有新增 AI 角色或 3D 图标。成片结尾注明实际主页使用用户个人上传图片。

Satoshi 与 Noto Sans SC 使用网站已有本地字体。Noto Sans SC 的 OFL 许可证和 Satoshi 来源说明位于 `public/fonts/`。源码工程不包含网站密钥、用户账户信息或云端数据库数据。

