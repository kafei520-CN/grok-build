package cn.mckafei.grokbuild

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import org.cef.handler.CefRequestHandlerAdapter
import org.cef.handler.CefRequestHandler.TerminationStatus
import java.awt.Component
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.Base64
import javax.swing.JComponent

/** JCEF page + acquireVsCodeApi bridge, shared by chat and Grok Diff. */
class GrokBrowser(
    private val page: File,
    private val onMessage: (String) -> Unit,
) : Disposable {
    val browser: JBCefBrowser = JBCefBrowser.createBuilder()
        .setOffScreenRendering(false)
        .setEnableOpenDevToolsMenuItem(true)
        .build()
    val component: JComponent get() = browser.component
    /** Native CEF widget; AWT file drops land here rather than on the Swing wrapper. */
    val dropTargetComponent: Component
        get() = browser.cefBrowser.uiComponent ?: browser.component

    private val query = JBCefJSQuery.create(browser as JBCefBrowserBase)
    private val pending = mutableListOf<String>()
    private var loaded = false
    private val lock = Any()

    init {
        Disposer.register(this, browser)
        query.addHandler { payload ->
            if (!payload.isNullOrBlank()) {
                ApplicationManager.getApplication().invokeLater(
                    { onMessage(payload) },
                    ModalityState.any(),
                )
            }
            JBCefJSQuery.Response("ok")
        }
        browser.jbCefClient.addLoadHandler(
            object : CefLoadHandlerAdapter() {
                override fun onLoadEnd(cefBrowser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                    if (frame?.isMain == true) {
                        injectBridge()
                    }
                }
            },
            browser.cefBrowser,
        )
        browser.jbCefClient.addRequestHandler(
            object : CefRequestHandlerAdapter() {
                override fun onRenderProcessTerminated(cefBrowser: CefBrowser?, status: TerminationStatus?) {
                    reload()
                }
            },
            browser.cefBrowser,
        )
        browser.loadURL(page.toURI().toString())
    }

    fun reload() {
        synchronized(lock) { loaded = false }
        browser.loadURL(page.toURI().toString())
    }

    fun postJson(json: String) {
        val app = ApplicationManager.getApplication()
        if (app.isDispatchThread) {
            deliver(json)
            return
        }
        app.invokeLater { deliver(json) }
    }

    fun applyTheme() {
        val js = GrokTheme.applyJs()
        val app = ApplicationManager.getApplication()
        val run = Runnable {
            if (loaded) {
                browser.cefBrowser.executeJavaScript(js, browser.cefBrowser.url, 0)
            }
        }
        if (app.isDispatchThread) run.run() else app.invokeLater(run)
    }

    private fun injectBridge() {
        val js = """
            window.grokPost = function(msg) { ${query.inject("msg")} };
            if (window.grokQueue && window.grokQueue.length) {
              window.grokQueue.forEach(function(item) { window.grokPost(item); });
              window.grokQueue = [];
            }
            ${GrokTheme.applyJs()}
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
        val b64 = Base64.getEncoder().encodeToString(json.toByteArray(StandardCharsets.UTF_8))
        val chunk = 80_000
        var i = 0
        while (i < b64.length) {
            val end = minOf(i + chunk, b64.length)
            val last = end == b64.length
            val part = b64.substring(i, end)
            browser.cefBrowser.executeJavaScript(
                "window.__grokPushPart('$part', $last);",
                browser.cefBrowser.url,
                0,
            )
            i = end
        }
    }

    override fun dispose() {
        synchronized(lock) { pending.clear() }
    }
}
