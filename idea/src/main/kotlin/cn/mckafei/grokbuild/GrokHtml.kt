package cn.mckafei.grokbuild

import java.io.File
import java.nio.file.Files
import java.nio.file.StandardCopyOption

object GrokHtml {
    fun writeChatPage(): File = writePage("chat", "Grok Build", "chat.css", "webview.js", SharedAssets.webviewJs(), SharedAssets.chatCss())

    fun writeDiffPage(): File = writePage("diff", "Grok Diff", "diff.css", "diff.js", SharedAssets.diffJs(), SharedAssets.diffCss())

    private fun writePage(
        kind: String,
        title: String,
        cssName: String,
        jsName: String,
        jsSrc: File,
        cssSrc: File,
    ): File {
        val dir = SharedAssets.workDir(kind)
        val page = File(dir, "index.html")
        val js = File(dir, jsName)
        val css = File(dir, cssName)
        if (page.isFile && js.isFile && css.isFile &&
            js.lastModified() >= jsSrc.lastModified() &&
            css.lastModified() >= cssSrc.lastModified()
        ) {
            return page
        }
        copy(jsSrc, js)
        copy(cssSrc, css)
        page.writeText(html(title, cssName, jsName), Charsets.UTF_8)
        return page
    }

    private fun copy(from: File, to: File) {
        Files.copy(from.toPath(), to.toPath(), StandardCopyOption.REPLACE_EXISTING)
    }

    private fun html(title: String, css: String, script: String): String = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="color-scheme" content="dark light" />
          <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src data: https: file:; style-src 'unsafe-inline' file:; script-src 'unsafe-inline' file:; connect-src file:; font-src file: data:;" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="$css" />
          ${GrokTheme.styleTag()}
          <title>$title</title>
        </head>
        <body>
          <div id="app">Starting Grok…</div>
          <script>
            window.grokQueue = [];
            window.grokPost = function(msg) { window.grokQueue.push(msg); };
            window.__grokParts = [];
            window.__grokPushPart = function(part, done) {
              window.__grokParts.push(part);
              if (!done) return;
              var b64 = window.__grokParts.join('');
              window.__grokParts = [];
              var bin = atob(b64);
              var bytes = Uint8Array.from(bin, function(c){ return c.charCodeAt(0); });
              var data = JSON.parse(new TextDecoder().decode(bytes));
              window.dispatchEvent(new MessageEvent('message', { data: data }));
            };
            window.acquireVsCodeApi = function() {
              if (window.__grokVscode) return window.__grokVscode;
              var state = undefined;
              try { state = JSON.parse(localStorage.getItem('grok-ui') || 'null'); } catch (e) {}
              window.__grokVscode = {
                postMessage: function(msg) { window.grokPost(JSON.stringify(msg)); },
                getState: function() { return state; },
                setState: function(next) {
                  state = next;
                  try { localStorage.setItem('grok-ui', JSON.stringify(next)); } catch (e) {}
                }
              };
              return window.__grokVscode;
            };
          </script>
          <script src="$script"></script>
        </body>
        </html>
    """.trimIndent()
}
