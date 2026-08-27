package cn.mckafei.grokbuild

import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import java.awt.BorderLayout
import javax.swing.JComponent
import javax.swing.JLabel
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
        if (!JBCefApp.isSupported()) {
            component = JLabel("JCEF is required for Grok Build.", SwingConstants.CENTER)
        } else if (Sidecar.findNode() == null) {
            component = JLabel(
                "<html>需要 Node.js 才能运行 Grok Build sidecar。<br>安装 Node 后重启 IDEA，或设置环境变量 GROK_NODE。</html>",
                SwingConstants.CENTER,
            )
        } else {
            val panel = JPanel(BorderLayout())
            try {
                val page = GrokHtml.writeChatPage()
                val view = GrokBrowser(page) { payload -> session.sendUi(payload) }
                browser = view
                Disposer.register(this, view)
                panel.add(view.component, BorderLayout.CENTER)
                session.attach(this)
            } catch (error: Exception) {
                panel.add(JLabel(error.message ?: error.toString(), SwingConstants.CENTER), BorderLayout.CENTER)
            }
            component = panel
        }
    }

    fun postToWebview(json: String) {
        browser?.postJson(json)
    }

    fun onHostReady() {
        /* webview 自己会 post ready；这里只确认 sidecar 活着 */
    }

    fun onHostError(message: String) {
        browser?.postJson(
            """{"type":"state","state":{"status":"error","error":${jsonString(message)},"messages":[],"attachments":[],"commands":[],"locale":"zh-CN"}}""",
        )
    }

    override fun dispose() {
        browser = null
    }

    companion object {
        private fun jsonString(value: String): String =
            "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""
    }
}
