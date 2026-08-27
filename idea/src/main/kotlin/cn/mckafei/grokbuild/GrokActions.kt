package cn.mckafei.grokbuild

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.vfs.VfsUtilCore

class OpenChatAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        e.project?.let { GrokSession.get(it).focusChat() }
    }
}

class NewSessionAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val session = GrokSession.get(project)
        session.focusChat()
        session.sendCommand("newSession")
    }
}

class AddSelectionAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

    override fun update(e: AnActionEvent) {
        val editor = e.getData(CommonDataKeys.EDITOR)
        e.presentation.isEnabled = e.project != null && editor != null && editor.selectionModel.hasSelection()
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val editor = e.getData(CommonDataKeys.EDITOR) ?: return
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return
        if (!editor.selectionModel.hasSelection()) return
        val session = GrokSession.get(project)
        val start = editor.offsetToLogicalPosition(editor.selectionModel.selectionStart).line + 1
        val end = editor.offsetToLogicalPosition(editor.selectionModel.selectionEnd).line + 1
        session.setContext(
            mapOf(
                "path" to file.path,
                "text" to (editor.selectionModel.selectedText ?: ""),
                "startLine" to start,
                "endLine" to end,
            ),
            activeFile(e),
        )
        session.focusChat()
        session.sendCommand("addSelection")
    }
}

class AddActiveFileAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.EDT

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabled = e.project != null && e.getData(CommonDataKeys.VIRTUAL_FILE) != null
    }

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val session = GrokSession.get(project)
        session.setContext(null, activeFile(e) ?: return)
        session.focusChat()
        session.sendCommand("addActiveFile")
    }
}

private fun activeFile(e: AnActionEvent): Map<String, Any>? {
    val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return null
    val text = e.getData(CommonDataKeys.EDITOR)?.document?.text
        ?: FileDocumentManager.getInstance().getDocument(file)?.text
        ?: VfsUtilCore.loadText(file)
    return mapOf("path" to file.path, "text" to text)
}
