# 学生个人网站（适用于 GitHub Pages） - 模板说明

功能摘要
- 在 GitHub Pages 上托管的静态网站
- 通过后台（admin.html）上传/添加文章与图片（使用 GitHub REST API 写入仓库）
- 支持自定义背景（通过配置文件或后台设置）
- 支持文章加密（AES，客户端加密/解密）
- 使用 Giscus/Utterances 集成评论（基于 GitHub，无服务器）
- 后台登录使用 GitHub Personal Access Token（PAT）
- 首页可显示“本网站已经稳定存在 XX 年”（可在 config.json 中修改起始日期或自定义文本）
- 支持自定义文章目录结构

快速开始
1. 在 GitHub 创建一个仓库（例如 `username/username.github.io` 或任意 repo 并启用 Pages）。
2. 将本模板文件全部放入仓库的根目录（或 gh-pages 分支），并启用 GitHub Pages。
3. 修改 `config.json`（见示例）来填写你的仓库信息与站点配置。
4. （可选）配置 Giscus 或 Utterances，以启用访问者评论。
5. 打开 `admin.html`，输入你的 GitHub Personal Access Token（repo 权限），填写文章并上传。

重要安全提示
- GitHub Token 不要提交到仓库。只在你的管理页面（本地或托管）输入一次用于管理操作。
- 文章如果需要更安全的访问控制，考虑后端服务；静态方案适合个人/学生用途。
- 加密是基于客户端的 AES（CryptoJS），密钥由用户输入，切勿把敏感密钥公开保存。

如何生成 GitHub Personal Access Token (PAT)
1. 进入 https://github.com/settings/tokens
2. New token (classic) -> 给 token 取名 -> 选 repo 权限（或仅 `contents` 的足够权限）
3. 复制 token 到 admin 页面的登录框（只用于管理操作）

如何启用评论（Giscus 示例）
- 参考 Giscus: https://giscus.app/ 注册并在 config.json 填写对应参数，然后在 index.html 中启用（代码已做占位）。

文件列表
- index.html（网站主页）
- admin.html（后台页面，用于上传文章/图片/修改配置）
- assets/styles.css（样式）
- assets/main.js（站点前端逻辑）
- assets/admin.js（后台逻辑）
- config.json（站点配置）
- README.md（本文件）

如果你愿意，我可以：
- 帮你把配置改成你的仓库信息并生成一个示例文章。
- 按你的审美微调样式或加入主题。