package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.intellij.openapi.Disposable
import com.intellij.openapi.editor.EditorFactory
import com.intellij.openapi.editor.event.CaretEvent
import com.intellij.openapi.editor.event.CaretListener
import com.intellij.openapi.editor.event.DocumentEvent
import com.intellij.openapi.editor.event.DocumentListener
import com.intellij.openapi.editor.event.SelectionEvent
import com.intellij.openapi.editor.event.SelectionListener
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerEvent
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.util.Alarm

/** Keep sidecar getActiveSelection / getActiveFile in sync with the current editor. */
class GrokContext(
    private val project: Project,
    private val onChange: (JsonObject?, JsonObject?) -> Unit,
) : Disposable {
    private val alarm = Alarm(Alarm.ThreadToUse.SWING_THREAD, this)

    init {
        val bus = project.messageBus.connect(this)
        bus.subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun selectionChanged(event: FileEditorManagerEvent) {
                    schedule()
                }
            },
        )
        val multicaster = EditorFactory.getInstance().eventMulticaster
        multicaster.addSelectionListener(
            object : SelectionListener {
                override fun selectionChanged(e: SelectionEvent) {
                    if (e.editor.project == project) {
                        schedule()
                    }
                }
            },
            this,
        )
        multicaster.addCaretListener(
            object : CaretListener {
                override fun caretPositionChanged(event: CaretEvent) {
                    if (event.editor.project == project) {
                        schedule()
                    }
                }
            },
            this,
        )
        multicaster.addDocumentListener(
            object : DocumentListener {
                override fun documentChanged(event: DocumentEvent) {
                    val editors = EditorFactory.getInstance().getEditors(event.document, project)
                    if (editors.isNotEmpty()) {
                        schedule()
                    }
                }
            },
            this,
        )
        schedule()
    }

    fun snapshot(): Pair<JsonObject?, JsonObject?> {
        val editor = FileEditorManager.getInstance(project).selectedTextEditor
        val vf = editor?.let { FileDocumentManager.getInstance().getFile(it.document) }
            ?: FileEditorManager.getInstance(project).selectedFiles.firstOrNull()
        val file = vf?.let { toFile(it, editor?.document?.text) }
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

    fun pushNow() {
        alarm.cancelAllRequests()
        val (selection, file) = snapshot()
        onChange(selection, file)
    }

    private fun schedule() {
        alarm.cancelAllRequests()
        alarm.addRequest({
            val (selection, file) = snapshot()
            onChange(selection, file)
        }, 180)
    }

    override fun dispose() {
        alarm.cancelAllRequests()
    }

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

        private fun cap(text: String): String =
            if (text.length <= TEXT_MAX) text else ""
    }
}
