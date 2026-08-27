# Grok For VS Code By Kafei

Sidebar client for the Grok Build CLI. It speaks ACP (`grok agent stdio`) and
signs you in through the same browser OAuth flow as `grok login`.

Publisher: `kafei520cn` · Extension: `kafei520cn.grok-for-vs-code`

## Use

1. Install the Grok CLI if it is not already on this machine:

   ```powershell
   irm https://x.ai/cli/install.ps1 | iex
   ```

   macOS / Linux: `curl -fsSL https://x.ai/cli/install.sh | bash`

2. Install **Grok For VS Code By Kafei** from the VS Code Marketplace, or
   `npm run package` then Install from VSIX.
3. Open **Grok For VS Code By Kafei** in the activity bar, or press
   `Ctrl+;` / `Cmd+;`.
4. Click **Sign in with Grok**. VS Code opens `auth.x.ai`. After the browser
   round-trip, chat in the sidebar.

The sidebar is the same agent as the CLI. Type `/` for every slash command
(`/plan`, `/imagine`, `/workflow`, `/compact`, `/resume`, `/mcps`, …). Type `@`
to attach a workspace file. An xAI API key from
[console.x.ai](https://console.x.ai) is the fallback.

## Develop

```powershell
npm install
npm test
npm run compile
```

Then Run and Debug → **Run Grok Build Extension**.
