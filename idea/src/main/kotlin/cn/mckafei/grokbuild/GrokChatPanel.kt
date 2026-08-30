package cn.mckafei.grokbuild

import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.util.Disposer
import com.intellij.ui.components.JBLabel
import java.awt.BorderLayout
import java.awt.FlowLayout
import java.io.File
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingConstants

class GrokChatPanel(
    private val session: GrokSession,
    parent: Disposable,
) : Disposable {
    private val content = JPanel(BorderLayout())
    val component: JComponent = GrokDrop.attach(content, this) { session.sendDropped(it) }
    private var browser: GrokBrowser? = null
    private var disposed = false

    init {
        Disposer.register(parent, this)
        showCenter(JBLabel("Starting Grok…", SwingConstants.CENTER))
        scheduleMount()
    }

    fun postToWebview(json: String) {
        browser?.postJson(json)
    }

    fun applyTheme() {
        browser?.applyTheme()
    }

    fun onHostReady() {
        /* webview posts ready; sidecar alive is enough */
    }

    fun onHostError(message: String) {
        val safe = jsonString(message)
        browser?.postJson(
            """{"type":"state","state":{"status":"error","error":$safe,"messages":[],"attachments":[],"commands":[],"locale":"zh-CN"}}""",
        )
    }

    private fun scheduleMount() {
        val app = ApplicationManager.getApplication()
        app.executeOnPooledThread {
            if (disposed) {
                return@executeOnPooledThread
            }
            if (!GrokJcef.isSupported()) {
                app.invokeLater({ if (!disposed) showCenter(missingJcef()) }, ModalityState.any())
                return@executeOnPooledThread
            }
            if (Sidecar.findNode() == null) {
                app.invokeLater({ if (!disposed) showCenter(missingNode()) }, ModalityState.any())
                return@executeOnPooledThread
            }
            val page = try {
                GrokHtml.writeChatPage()
            } catch (error: Throwable) {
                app.invokeLater({
                    if (!disposed) showCenter(errorPanel(error.message ?: error.toString()))
                }, ModalityState.any())
                return@executeOnPooledThread
            }
            app.invokeLater({ mountBrowser(page) }, ModalityState.any())
        }
    }

    private fun mountBrowser(page: File) {
        if (disposed) {
            return
        }
        browser?.let { Disposer.dispose(it) }
        browser = null
        try {
            val view = GrokBrowser(page) { payload -> session.sendUi(payload) }
            browser = view
            Disposer.register(this, view)
            GrokDrop.install(view.dropTargetComponent) { session.sendDropped(it) }
            showCenter(view.component)
            session.attach(this)
        } catch (error: Throwable) {
            showCenter(errorPanel(error.message ?: error.toString()))
        }
    }

    private fun showCenter(child: JComponent) {
        content.removeAll()
        content.add(child, BorderLayout.CENTER)
        content.revalidate()
        content.repaint()
    }

    private fun missingJcef(): JComponent {
        val wrap = JPanel(BorderLayout())
        wrap.add(JBLabel(GrokJcef.MISSING_HTML, SwingConstants.CENTER), BorderLayout.CENTER)
        wrap.add(retryBar(), BorderLayout.SOUTH)
        return wrap
    }

    private fun missingNode(): JComponent {
        val wrap = JPanel(BorderLayout())
        wrap.add(
            JBLabel(
                "<html>Need Node.js to run the Grok Build sidecar.<br>Install Node, restart IntelliJ, or set GROK_NODE.</html>",
                SwingConstants.CENTER,
            ),
            BorderLayout.CENTER,
        )
        wrap.add(retryBar(), BorderLayout.SOUTH)
        return wrap
    }

    private fun errorPanel(message: String): JComponent {
        val wrap = JPanel(BorderLayout())
        wrap.add(JBLabel("<html>${escapeHtml(message)}</html>", SwingConstants.CENTER), BorderLayout.CENTER)
        wrap.add(retryBar(), BorderLayout.SOUTH)
        return wrap
    }

    private fun retryBar(): JComponent {
        val bar = JPanel(FlowLayout(FlowLayout.CENTER))
        val retry = JButton("Retry")
        retry.addActionListener { scheduleMount() }
        bar.add(retry)
        return bar
    }

    override fun dispose() {
        disposed = true
        browser = null
    }

    companion object {
        private fun jsonString(value: String): String =
            "\"${value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")}\""

        private fun escapeHtml(value: String): String =
            value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    }
}
