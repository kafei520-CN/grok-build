package cn.mckafei.grokbuild

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.vfs.LocalFileSystem
import java.awt.BorderLayout
import java.io.File
import javax.swing.JPanel

/** One JCEF Diff instance per project. Warmed after chat loads so the first Review is a tab switch. */
class GrokDiffSupport(
    private val project: Project,
    private val session: GrokSession,
) : Disposable {
    val file: GrokDiffVirtualFile = GrokDiffVirtualFile(emptyPayload(), session)
    private val holder = JPanel(BorderLayout())
    private var browser: GrokBrowser? = null
    var pageReady: Boolean = false
        private set
    private var disposed = false

    fun warm() {
        if (browser != null) {
            return
        }
        val app = ApplicationManager.getApplication()
        app.executeOnPooledThread {
            try {
                GrokHtml.writeDiffPage()
            } catch (_: Throwable) {
                return@executeOnPooledThread
            }
            app.invokeLater({
                if (disposed) {
                    return@invokeLater
                }
                try {
                    ensureBrowser()
                } catch (_: Throwable) {
                }
            }, ModalityState.any())
        }
    }

    fun show(params: JsonObject) {
        file.updatePayload(params)
        ensureBrowser()
        if (pageReady) {
            postPayload(params)
        }
        FileEditorManager.getInstance(project).openFile(file, true)
    }

    fun attach(host: JPanel): GrokBrowser? {
        val view = ensureBrowser() ?: return null
        val component = view.component
        if (component.parent !== host) {
            component.parent?.remove(component)
            host.add(component, BorderLayout.CENTER)
            host.revalidate()
            host.repaint()
        }
        return view
    }

    fun detach(host: JPanel) {
        val component = browser?.component ?: return
        if (component.parent === host) {
            host.remove(component)
            holder.add(component, BorderLayout.CENTER)
        }
    }

    fun applyTheme() {
        browser?.applyTheme()
    }

    fun postIfReady(payload: JsonObject) {
        if (pageReady) {
            postPayload(payload)
        }
    }

    private fun ensureBrowser(): GrokBrowser? {
        if (disposed) {
            return null
        }
        if (browser != null) {
            return browser
        }
        if (!GrokJcef.isSupported()) {
            return null
        }
        return try {
            val page = GrokHtml.writeDiffPage()
            val view = GrokBrowser(page) { raw -> onMessage(raw) }
            Disposer.register(this, view)
            holder.add(view.component, BorderLayout.CENTER)
            browser = view
            view
        } catch (_: Throwable) {
            null
        }
    }

    private fun onMessage(raw: String) {
        val obj = try {
            JsonParser.parseString(raw).asJsonObject
        } catch (_: Exception) {
            return
        }
        when (obj.get("type")?.asString) {
            "ready" -> {
                pageReady = true
                postPayload(file.payload)
            }
            "openFile" -> {
                val path = obj.get("path")?.asString ?: return
                val vf = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path)) ?: return
                OpenFileDescriptor(project, vf).navigate(true)
            }
            "revert" -> {
                val messageId = file.payload.get("messageId")?.asString
                val ui = if (messageId.isNullOrBlank()) {
                    """{"type":"undoEdits"}"""
                } else {
                    """{"type":"undoEdits","messageId":${jsonString(messageId)}}"""
                }
                session.sendUi(ui)
                FileEditorManager.getInstance(project).closeFile(file)
            }
        }
    }

    private fun postPayload(payload: JsonObject) {
        val envelope = JsonObject()
        envelope.addProperty("type", "diff")
        envelope.add("payload", payload)
        browser?.postJson(envelope.toString())
    }

    override fun dispose() {
        disposed = true
        browser = null
        pageReady = false
    }

    companion object {
        private fun emptyPayload(): JsonObject =
            JsonObject().apply { add("files", JsonArray()) }

        private fun jsonString(value: String): String =
            "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""
    }
}
