package cn.mckafei.grokbuild

import java.io.File
import java.nio.file.Files

object GrokHtml {
    fun writeChatPage(): File {
        val dir = SharedAssets.workDir("chat")
        copy(SharedAssets.webviewJs(), File(dir, "webview.js"))
        copy(SharedAssets.chatCss(), File(dir, "chat.css"))
        val page = File(dir, "index.html")
        page.writeText(html("Grok Build", "chat.css", "webview.js"), Charsets.UTF_8)
        return page
    }

    fun writeDiffPage(): File {
        val dir = SharedAssets.workDir("diff")
        copy(SharedAssets.diffJs(), File(dir, "diff.js"))
        copy(SharedAssets.diffCss(), File(dir, "diff.css"))
        val page = File(dir, "index.html")
        page.writeText(html("Grok Diff", "diff.css", "diff.js"), Charsets.UTF_8)
        return page
    }

    private fun copy(from: File, to: File) {
        Files.copy(from.toPath(), to.toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING)
    }

    private fun html(title: String, css: String, script: String): String = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="Content-Security-Policy"
            content="default-src 'none'; img-src data: https: file:; style-src 'unsafe-inline' file:; script-src 'unsafe-inline' file:; connect-src file:;" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="$css" />
          <title>$title</title>
        </head>
        <body>
          <div id="app">Starting Grok…</div>
          <script>
            window.grokQueue = [];
            window.grokPost = function(msg) { window.grokQueue.push(msg); };
            window.acquireVsCodeApi = function() {
              if (window.__grokVscode) return window.__grokVscode;
              var state = undefined;
              window.__grokVscode = {
                postMessage: function(msg) { window.grokPost(JSON.stringify(msg)); },
                getState: function() { return state; },
                setState: function(next) { state = next; }
              };
              return window.__grokVscode;
            };
          </script>
          <script src="$script"></script>
        </body>
        </html>
    """.trimIndent()
}
