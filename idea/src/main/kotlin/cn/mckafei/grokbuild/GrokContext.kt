package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.editor.Editor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

/**
 * Sidecar getActiveSelection / getActiveFile snapshot.
 * Do not listen to caret or document changes — that re-serializes the whole file on the EDT.
 */
class GrokContext(
    private val project: Project,
    private val onChange: (JsonObject?, JsonObject?) -> Unit,
) : Disposable {
    init {
        val bus = project.messageBus.connect(this)
        bus.subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun selectionChanged(event: FileEditorManagerEvent) {
                    publish()
                }
            },
        )
        publish()
    }

    fun snapshot(): Pair<JsonObject?, JsonObject?> =
        ApplicationManager.getApplication().runReadAction<Pair<JsonObject?, JsonObject?>> { snapshotNow() }

    fun pushNow() {
        publish()
    }

    private fun publish() {
        val app = ApplicationManager.getApplication()
        if (app.isDispatchThread) {
            emit()
        } else {
            app.invokeLater({ emit() }, ModalityState.any())
        }
    }

    private fun emit() {
        val (selection, file) = snapshot()
        onChange(selection, file)
    }

    private fun snapshotNow(): Pair<JsonObject?, JsonObject?> {
        val editor = FileEditorManager.getInstance(project).selectedTextEditor
        val vf = editor?.let { FileDocumentManager.getInstance().getFile(it.document) }
            ?: FileEditorManager.getInstance(project).selectedFiles.firstOrNull()
        val file = vf?.let { toFile(it, editorText(editor, it)) }
        val selection = if (editor != null && editor.selectionModel.hasSelection() && vf != null) {
            val start = editor.offsetToLogicalPosition(editor.selectionModel.selectionStart).line + 1
            val end = editor.offsetToLogicalPosition(editor.selectionModel.selectionEnd).line + 1
            val text = editor.selectionModel.selectedText ?: ""
            JsonObject().apply {
                addProperty("path", vfPath(vf))
                addProperty("text", cap(text))
                addProperty("startLine", start)
                addProperty("endLine", end)
            }
        } else {
            null
        }
        return selection to file
    }

    override fun dispose() {}

    companion object {
        private const val TEXT_MAX = 256_000

        fun vfPath(vf: VirtualFile): String =
            try {
                vf.toNioPath().toAbsolutePath().toString()
            } catch (_: Exception) {
                vf.path
            }

        fun toFile(vf: VirtualFile, text: String?): JsonObject =
            JsonObject().apply {
                addProperty("path", vfPath(vf))
                addProperty("text", cap(text ?: ""))
            }

        private fun editorText(editor: Editor?, vf: VirtualFile): String {
            val fromEditor = editor?.document?.text
            if (fromEditor != null) {
                return fromEditor
            }
            val doc = FileDocumentManager.getInstance().getDocument(vf)
            return doc?.text ?: ""
        }

        private fun cap(text: String): String =
            if (text.length <= TEXT_MAX) text else ""
    }
}
