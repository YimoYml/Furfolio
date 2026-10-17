# Furfolio 云端发布 Beta 0.4.5

2026-10-11。正式地址：[Furfolio](https://furfolio.pages.dev/)。用户名注册、一次性恢复码、登录后接续设计、图片上传、云端草稿、发布、再次编辑和撤下均已接入，云端图片通过同域入口显示。

## 服务配置与数据库

- Cloudflare Pages：`furfolio`，目标账户 `2629280157@qq.com`；独立 OAuth profile `fursona-20261010`。
- Supabase URL：`https://dtftipcvgznnnrbjrkea.supabase.co`。公开 Key、服务端 Admin API、Auth 设置和应用表已实测成功。
- Cloudinary Cloud Name：`jcirypaz`。认证 ping、真实小图片上传及删除均成功。
- Production Secrets：`SUPABASE_SECRET_KEY`、`CLOUDINARY_API_SECRET` 和单独的 `DEPLOY_CHECK_TOKEN`。仅由 Functions 使用，不进入前端。无需再提供数据库密码或 SMTP。
- 注册保护：公开 `TURNSTILE_SITE_KEY` 在 `wrangler.toml`，`TURNSTILE_SECRET_KEY` 由负责人添加到 Pages encrypted Secret；已确认机密名称存在，不读取其内容。Turnstile 使用 Managed 模式，不启用预先放行。
- 负责人已执行 `001_initial_schema.sql` 和 `002_cloud_controls.sql`。
- 负责人已执行 `003_publish_conflict_fix.sql`，真实数据库冲突返回检查通过。它将业务冲突错误码从 `40001` 改为 `PT409`，避免 PostgREST 事务重试循环。[Supabase 排障说明](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b)

- 负责人已执行 `004_section_media.sql`；线上 `furfolio_cloud_schema_version` 返回 `3`。发布会检查关于图片与每项喜好图片的所有权，并只公开所选图片 URL。

当前没有待执行的 SQL。新建项目依次执行 001、002、003、004；已有项目按版本补执行对应脚本。最新 001 也包含发布冲突与栏目图片检查，但 004 负责更新控制版本。脚本不删除已有用户或主页，不要在其他业务项目中执行。

## 数据与权限

| 数据 | 存储 | 权限 |
| --- | --- | --- |
| 密码、会话 | Supabase Auth | 认证服务管理；浏览器会话使用 Secure / HttpOnly / SameSite Cookie |
| 登录用户名 | `profiles` | 用户只读自己的映射；后端负责创建 |
| 模板、文字、配色、字体、布局等草稿 | `homepages` | 用户仅能读写自己的草稿；每账号一个主页 |
| Cloudinary 图片元数据 | `assets` | 用户只读自己的图片；后端核验后写入 |
| 公开版本与所选图片 URL | `published_homepages` | 访客仅能读公开配置；事务检查版本和图片所有权后更新 |
| 限流、上传申请、恢复码哈希 | `private` schema | 仅受控服务端函数可访问 |

四张应用表均启用 RLS。正常资料读写携带用户 JWT，发布函数再次检查所有权；跨用户读取、修改与发布已在真实服务验证。高权限密钥只用于创建账号、限流、恢复码及核验上传结果等受控操作。

私有草稿与公开快照分开，保存新草稿不会改变访客看到的内容。撤下只删除公开快照，保留可编辑草稿。发布拒绝他人图片、缺失图片及示例图库素材。公开配置不包含登录用户名映射或其他未选中的图片。

## 用户流程

1. 未登录即可编辑、选择本地图片和预览；配置保存在 localStorage，图片 Blob 保存在 IndexedDB。
2. 点击发布时先保存草稿，再进入注册或登录；显示昵称与唯一登录用户名分开。
3. 注册只需用户名和密码，不填写真实邮箱；仅提交注册时加载并执行 Turnstile，服务端验证通过才创建账号。注册后需保存一次性恢复码并确认，再接续原草稿。
4. 确认云端保存或发布后才上传所选图片、保存配置；发布成功生成 `/u/:slug` 链接。
5. 登录 `/dashboard` 可以载入云端草稿继续编辑、重新发布或撤下，也可以凭当前密码更换恢复码。

本地草稿属于当前浏览器与域名，localhost 和正式网址不会自动共享。已保存的云端草稿可以在其他设备登录后载入。恢复码只显示一次，数据库只保存哈希；使用后更换密码和恢复码，原码不能重复使用。密码与恢复码均丢失时，目前没有邮箱找回渠道。

## 上传与配额

浏览器先压缩图片，Functions 再读取受限上传请求，校验 PNG / JPEG / WebP 文件类型和文件头，固定 Cloudinary 素材 ID 和变换，核验真实返回的格式、尺寸、字节数和 HTTPS 地址。浏览器没有可复用的 Cloudinary 上传签名。

- 每张图片最多 3 MiB，长边最多 2000 px。
- 每账号最多保存 24 张云端图片；每账号每小时最多 24 次上传申请。
- 全站每日最多 150 次、固定 31 天窗口最多 500 次上传申请；申请失败也可能消耗限流次数。
- 新申请前检查既存图片总量达到 32 MiB 的情况；并发申请可能超过这一阈值，它不是严格总容量上限。
- 注册、登录、恢复、保存与发布均有限流；测试请求使用独立测试标识，不消耗真实访问者的 IP 注册桶。
- 旧图片回收界面尚未实现，替换和删除草稿中的图片不会释放云端图片额度。

现阶段仍采用免费计划，不使用 R2 或独立服务器。服务商免费额度会变化，应用限流不等于供应商账单或剩余额度保证。官方计划与来源见 [部署方案](../deployment-plan.md)。

## 验证记录

| 记录 | 已验证内容 |
| --- | --- |
| `schema-verification.json` | PostgreSQL 引擎下的 RLS、公开读取、所有权、slug、版本冲突及重复执行 |
| `controls-verification.json` | 服务端权限、限流、上传配额、恢复码的领取与轮换 |
| `conflict-fix-verification.json` | 003 修补及重复执行 |
| `api-contract-verification.json` | 32 项 API 契约检查，含图片、字体/构图、自由文本联系方式及 Turnstile 注册验证，拒绝缺失/过期/重复令牌、域名/action 不符、测试密钥和服务异常 |
| `client-flow-verification.json` | 28 项模拟 DOM 流程，含注册接续、延迟上传、后台载入、公开图片、联系方式，以及延后验证、取消/过期/重试、配置异常与保留草稿 |
| `live-flow-verification.json` | 36 项真实 Supabase / Cloudinary 检查：认证、实际上传、跨用户隔离、发布/编辑/撤下及恢复码 |
| `section-media-verification.json` | 12 项 PostgreSQL 检查：004 升级/重复执行、独立图片所有权、公开所选媒体、兼容旧草稿 |
| `../editing-update/live-media-verification.json` | 10 项新增真实云端检查：两张栏目图片上传、发布、再次载入、文案字体和手机构图保存、移除图片后重发 |
| `../media-proxy-update/contract-verification.json` | 16 项同域图片转发与缓存契约：实际字节、账户/路径限制、拒绝跳转、缓存、条件请求、类型/大小限制 |
| `../media-proxy-update/legacy-client-verification.json` | 6 项旧云端草稿图片映射兼容检查，无需重新上传或发布 |
| `../media-proxy-update/live-verification.json` | 正式站现有公开图片与原图字节一致、边缘缓存命中、HEAD 和 ETag 304、非法路径和写请求拒绝 |
| `../media-proxy-update/domestic-acceptance.json` | 负责人在刚才不开代理的国内网络确认图片正常显示 |

真实测试只使用本次创建的临时账号和小图片，清理全部成功。临时测试路由不随最终版本部署；`server/internal-verification.js` 和 `scripts/verify-cloud-flow.mjs` 保留测试源码，但线上默认没有对应入口。只读服务检查保留独立随机密钥保护，未授权返回 404，不返回用户数据或 Secret。

此前实际浏览器验证包含四种模板的桌面/手机横图、竖图、方图，连续拖动裁切、独立手机偏移、关于图片与喜好详情、文案字体和刷新恢复；截图在 `../editing-update/`。手机使用浏览器尺寸模拟，实体手机触摸仍未验证。0.4.2 已由负责人在刚才不开代理的国内网络确认图片正常显示，其他运营商未逐一验证。HTTP、资源完整性及最终服务状态见 [部署记录](../deployment-status.md)。

0.4.1 新增 `aboutFrame` 方形头像构图，服务端和客户端统一规范化；旧草稿、旧公开快照默认居中裁剪。数据库发布函数保留完整配置 JSON，因此无需新 SQL。画廊原比例与手机大图调整属于共享渲染器，截图及尺寸验证位于 `../avatar-gallery-update/`。

0.4.3 增加 Y2K / Cyber 常驻动效与共享栏目展开；既有动效设置保留，无需重新发布或执行 SQL。17 项浏览器动效检查和重新通过的 17 项客户端流程见 `../motion-update/`。

0.4.4 将联系方式输入改为“链接或账号”，QQ 号、用户名、邮箱等文本可以保存；公开主页对有效 HTTP / HTTPS 地址提供跳转，其他非空文本提供复制。仍使用原 `contacts[].url` 字段，数据库不需迁移，更新内容后正常保存并发布。四套模板的桌面/手机实际复制等 14 项浏览器检查见 `../contact-update/`。

0.4.5 仅注册提交接入 Turnstile，用户选择风格、本地图片、编辑及预览不加载其脚本。客户端延后执行，服务端 Siteverify 检查 success、域名与 register action；失败或上游异常不会创建账号，不提供绕过路径，既有注册限流保留。正式环境拒绝官方测试密钥；测试组件仅由隔离本地测试服务提供。无需新 SQL。详见 `../turnstile-update/`。

## 同域图片读取

0.4.2 由 Pages Functions 的 `/api/media/…` 从 Cloudinary 读取并返回实际图片内容。数据库保留原 Cloudinary URL，渲染时转换为相对同域路径，兼容既有公开主页和云端草稿；本地 Blob 不受影响，没有新增 SQL。

入口仅允许 `jcirypaz/image/upload/` 下的 `furfolio/<用户 UUID>/<图片 UUID>.(webp|png|jpg)` 原图，可带已有版本号。拒绝其他账户、任意网址、转换参数、查询参数及上游跳转；限制响应为最多 3 MiB 的匹配格式图片。不会把浏览器的 Cookie、认证、Range 或协商头传给 Cloudinary，不缓存错误响应。

浏览器缓存 1 天，边缘缓存 7 天，支持 ETag / Last-Modified 条件请求。Cache API 缓存位于接收请求的数据中心；缓存命中仍执行 Functions，免费计划的 Functions 请求计入与 Workers 共用的每日 100,000 次额度。图片字节仍消耗 Cloudinary 回源流量，缓存减少重复回源。来源：[Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/)、[Pages Functions 计费](https://developers.cloudflare.com/pages/functions/pricing/)。
