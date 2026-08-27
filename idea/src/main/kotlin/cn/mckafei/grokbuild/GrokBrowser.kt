package cn.mckafei.grokbuild

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.Base64
import java.util.concurrent.atomic.AtomicInteger
import javax.swing.JComponent

/** JCEF 页 + acquireVsCodeApi 桥，聊天和 Diff 共用 */
class GrokBrowser(
    private val page: File,
    private val onMessage: (String) -> Unit,
) : Disposable {
    val browser: JBCefBrowser = JBCefBrowser.createBuilder()
        .setOffScreenRendering(false)
        .setEnableOpenDevToolsMenuItem(true)
        .build()
    val component: JComponent get() = browser.component

    private val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
    private val pending = mutableListOf<String>()
    private var loaded = false
    private val pushSeq = AtomicInteger()
    private val lock = Any()

    init {
        Disposer.register(this, browser)
        query.addHandler { payload ->
            if (!payload.isNullOrBlank()) {
                onMessage(payload)
            }
            JBCefJSQuery.Response("ok")
        }
        browser.jbCefClient.addLoadHandler(
            object : CefLoadHandlerAdapter() {
                override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                    if (frame?.isMain == true) {
                        injectBridge()
                    }
                }
            },
            browser.cefBrowser,
        )
        browser.createImmediately()
        browser.loadURL(page.toURI().toString())
    }

    fun postJson(json: String) {
        val app = ApplicationManager.getApplication()
        val run = Runnable { deliver(json) }
        if (app.isDispatchThread) run.run() else app.invokeLater(run)
    }

    private fun injectBridge() {
        val js = """
            window.grokPost = function(msg) { ${query.inject("msg")} };
            if (window.grokQueue && window.grokQueue.length) {
              window.grokQueue.forEach(function(item) { window.grokPost(item); });
              window.grokQueue = [];
            }
        """.trimIndent()
        browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
        val queued: List<String>
        synchronized(lock) {
            loaded = true
            queued = pending.toList()
            pending.clear()
        }
        queued.forEach { writeToPage(it) }
    }

    private fun deliver(json: String) {
        synchronized(lock) {
            if (!loaded) {
                pending.add(json)
                return
            }
        }
        writeToPage(json)
    }

    private fun writeToPage(json: String) {
        if (json.length > 180_000) {
            val file = File(page.parentFile, "push-${pushSeq.incrementAndGet()}.json")
            file.writeText(json, Charsets.UTF_8)
            val uri = file.toURI().toString()
            browser.cefBrowser.executeJavaScript(
                "fetch('$uri').then(function(r){return r.json();}).then(function(data){window.dispatchEvent(new MessageEvent('message',{data:data}));});",
                browser.cefBrowser.url,
                0,
            )
            return
        }
        val b64 = Base64.getEncoder().encodeToString(json.toByteArray(StandardCharsets.UTF_8))
        val js = """
            (function(){
              var bin = atob('$b64');
              var bytes = Uint8Array.from(bin, function(c){ return c.charCodeAt(0); });
              var data = JSON.parse(new TextDecoder().decode(bytes));
              window.dispatchEvent(new MessageEvent('message', { data: data }));
            })();
        """.trimIndent()
        browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
    }

    override fun dispose() {
        synchronized(lock) { pending.clear() }
    }
}
