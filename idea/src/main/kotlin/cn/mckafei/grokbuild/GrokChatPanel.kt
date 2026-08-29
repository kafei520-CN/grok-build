package cn.mckafei.grokbuild

import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.components.JBLabel
import java.awt.BorderLayout
import java.awt.FlowLayout
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingConstants

class GrokChatPanel(
    private val session: GrokSession,
    parent: Disposable,
) : Disposable {
    val component: JComponent
    private var browser: GrokBrowser? = null

    init {
        Disposer.register(parent, this)
        component = JPanel(BorderLayout())
        mount()
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

    private fun mount() {
        browser?.let { Disposer.dispose(it) }
        browser = null
        val panel = component as JPanel
        panel.removeAll()
        if (!GrokJcef.isSupported()) {
            panel.add(missingJcef(), BorderLayout.CENTER)
            panel.revalidate()
            panel.repaint()
            return
        }
        if (Sidecar.findNode() == null) {
            panel.add(missingNode(), BorderLayout.CENTER)
            panel.revalidate()
            panel.repaint()
            return
        }
        try {
            val page = GrokHtml.writeChatPage()
            val view = GrokBrowser(page) { payload -> session.sendUi(payload) }
            browser = view
            Disposer.register(this, view)
            panel.add(view.component, BorderLayout.CENTER)
            session.attach(this)
        } catch (error: Throwable) {
            panel.add(errorPanel(error.message ?: error.toString()), BorderLayout.CENTER)
        }
        panel.revalidate()
        panel.repaint()
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
        retry.addActionListener { mount() }
        bar.add(retry)
        return bar
    }

    override fun dispose() {
        browser = null
    }

    companion object {
        private fun jsonString(value: String): String =
            "\"${value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")}\""

        private fun escapeHtml(value: String): String =
            value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    }
}
