# Grok For VS Code By Kafei

面向 VS Code 的 Grok Build 编程助手。通过 ACP（`grok agent stdio`）连接本机
grok CLI，登录流程与 `grok login` 相同：用浏览器打开 `auth.x.ai` 即可。

发布者：`kafei520cn` · 扩展 ID：`kafei520cn.grok-for-vs-code`

## 使用

1. 如果还没有 Grok CLI，先安装：

   ```powershell
   irm https://x.ai/cli/install.ps1 | iex
   ```

   macOS / Linux：`curl -fsSL https://x.ai/cli/install.sh | bash`

2. 从 VS Code 扩展市场安装 **Grok For VS Code By Kafei**，或本地
   `npm run package` 后选择“从 VSIX 安装”。
3. 在活动栏打开 **Grok For VS Code By Kafei**，或按 `Ctrl+;` / `Cmd+;`。
4. 点击 **使用 Grok 登录**。VS Code 会打开 `auth.x.ai`，浏览器登录完成后即可
   在侧边栏对话。

侧边栏里的 Agent 与 CLI 是同一个。输入 `/` 可调用全部斜杠命令（`/plan`、
`/imagine`、`/workflow`、`/compact`、`/resume`、`/mcps` 等）。输入 `@` 可附加
工作区文件。也可用 [console.x.ai](https://console.x.ai) 的 xAI API 密钥作为
备选登录方式。

## 开发

```powershell
npm install
npm test
npm run compile
```

然后在 Run and Debug 中选择 **Run Grok Build Extension**。
