package cn.mckafei.grokbuild

import com.intellij.openapi.actionSystem.ActionUpdateThread
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.vfs.VfsUtilCore

private fun run(e: AnActionEvent, command: String? = null, before: ((GrokSession) -> Unit)? = null) {
    val project = e.project ?: return
    val session = GrokSession.get(project)
    before?.invoke(session)
    if (command != "showLog") {
        session.focusChat()
    }
    if (command != null) {
        session.sendCommand(command)
    }
}

class OpenChatAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e)
}

class NewSessionAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "newSession")
}

class LoginAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "login")
}

class LogoutAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "logout")
}

class SetApiKeyAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "setApiKey")
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
        if (!editor.selectionModel.hasSelection()) {
            return
        }
        val session = GrokSession.get(project)
        session.pushEditorContext()
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
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)
        if (file != null) {
            val text = e.getData(CommonDataKeys.EDITOR)?.document?.text
                ?: FileDocumentManager.getInstance().getDocument(file)?.text
                ?: runCatching { VfsUtilCore.loadText(file) }.getOrDefault("")
            session.sidecar?.sendContext(null, GrokContext.toFile(file, text))
        } else {
            session.pushEditorContext()
        }
        session.focusChat()
        session.sendCommand("addActiveFile")
    }
}

class RestartAgentAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "restart")
}

class ShowLogAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        GrokSession.get(project).showLogDialog()
    }
}

class CancelAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "cancel")
}

class CompactAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "compact")
}

class RewindAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "rewind")
}

class ResumeAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "resume")
}

class CycleModeAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "cycleMode")
}

class ForkAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "fork")
}

class ExportAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "export")
}

class UsageAction : AnAction(), DumbAware {
    override fun getActionUpdateThread(): ActionUpdateThread = ActionUpdateThread.BGT
    override fun actionPerformed(e: AnActionEvent) = run(e, "usage")
}
