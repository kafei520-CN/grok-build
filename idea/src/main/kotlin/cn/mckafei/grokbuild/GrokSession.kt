package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindowManager
import java.awt.BorderLayout
import java.awt.Dimension
import javax.swing.Action
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JScrollPane
import javax.swing.JTextArea

@Service(Service.Level.PROJECT)
class GrokSession(val project: Project) : Disposable {
    var panel: GrokChatPanel? = null
        private set
    var sidecar: Sidecar? = null
        private set
    private val logs = StringBuilder()
    private var dispatcher: HostDispatcher? = null

    fun attach(panel: GrokChatPanel) {
        this.panel = panel
        if (sidecar != null) {
            return
        }
        val sc = Sidecar(project) { event ->
            ApplicationManager.getApplication().invokeLater { onEvent(event) }
        }
        sidecar = sc
        dispatcher = HostDispatcher(project, this)
        Disposer.register(this, sc)
        sc.start()
    }

    fun sendUi(messageJson: String) {
        sidecar?.sendRaw("""{"type":"ui","message":$messageJson}""")
    }

    fun sendCommand(name: String) {
        sidecar?.send(mapOf("type" to "command", "name" to name))
    }

    fun setContext(selection: Map<String, Any>?, file: Map<String, Any>?) {
        sidecar?.send(
            mapOf(
                "type" to "context",
                "selection" to selection,
                "file" to file,
            ),
        )
    }

    fun focusChat() {
        ToolWindowManager.getInstance(project).getToolWindow(TOOL_WINDOW_ID)?.activate(null, true)
    }

    fun showLogDialog() {
        object : DialogWrapper(project, true) {
            init {
                title = "Grok Build log"
                init()
            }

            override fun createCenterPanel(): JComponent {
                val area = JTextArea(synchronized(logs) { logs.toString() })
                area.isEditable = false
                area.lineWrap = true
                val panel = JPanel(BorderLayout())
                panel.preferredSize = Dimension(720, 420)
                panel.add(JScrollPane(area), BorderLayout.CENTER)
                return panel
            }

            override fun createActions(): Array<Action> = arrayOf(okAction)
        }.show()
    }

    private fun onEvent(event: JsonObject) {
        when (event.get("type")?.asString) {
            "host" -> dispatcher?.handle(event)
            "state", "tail" -> panel?.postToWebview(event.toString())
            "ready" -> panel?.onHostReady()
            "log" -> appendLog(event)
            "error" -> {
                appendLog(event)
                panel?.onHostError(event.get("message")?.asString ?: "sidecar error")
            }
        }
    }

    private fun appendLog(event: JsonObject) {
        val line = buildString {
            append(event.get("level")?.asString ?: "info")
            append(' ')
            append(event.get("message")?.asString ?: event.toString())
            event.get("detail")?.asString?.let { append('\n').append(it) }
        }
        synchronized(logs) {
            logs.appendLine(line)
            if (logs.length > 200_000) {
                logs.delete(0, logs.length - 150_000)
            }
        }
    }

    override fun dispose() {
        panel = null
        sidecar = null
        dispatcher = null
    }

    companion object {
        const val TOOL_WINDOW_ID = "Grok Build"

        fun get(project: Project): GrokSession = project.getService(GrokSession::class.java)
    }
}
