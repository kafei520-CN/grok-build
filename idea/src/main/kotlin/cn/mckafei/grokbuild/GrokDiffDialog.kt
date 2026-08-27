package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.jcef.JBCefApp
import java.awt.Dimension
import java.io.File
import javax.swing.Action
import javax.swing.JComponent
import javax.swing.JLabel

class GrokDiffDialog(
    private val project: Project,
    private val payload: JsonObject,
    private val session: GrokSession,
) : DialogWrapper(project, true) {
    private var browser: GrokBrowser? = null

    init {
        title = "Grok Diff"
        init()
    }

    override fun createCenterPanel(): JComponent {
        if (!JBCefApp.isSupported()) {
            return JLabel("JCEF is required for Grok Diff.")
        }
        val page = GrokHtml.writeDiffPage()
        val view = GrokBrowser(page) { raw -> onMessage(raw) }
        browser = view
        Disposer.register(disposable, view)
        val wrap = view.component
        wrap.preferredSize = Dimension(1100, 720)
        return wrap
    }

    override fun createActions(): Array<Action> = arrayOf(cancelAction)

    private fun onMessage(raw: String) {
        val obj = try {
            JsonParser.parseString(raw).asJsonObject
        } catch (_: Exception) {
            return
        }
        when (obj.get("type")?.asString) {
            "ready" -> {
                val envelope = JsonObject()
                envelope.addProperty("type", "diff")
                envelope.add("payload", payload)
                browser?.postJson(envelope.toString())
            }
            "openFile" -> {
                val path = obj.get("path")?.asString ?: return
                val vf = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path)) ?: return
                OpenFileDescriptor(project, vf).navigate(true)
            }
            "revert" -> {
                val messageId = payload.get("messageId")?.asString
                val ui = if (messageId.isNullOrBlank()) {
                    """{"type":"undoEdits"}"""
                } else {
                    """{"type":"undoEdits","messageId":${jsonString(messageId)}}"""
                }
                session.sendUi(ui)
                close(CANCEL_EXIT_CODE)
            }
        }
    }

    companion object {
        private fun jsonString(value: String): String =
            "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""
    }
}
