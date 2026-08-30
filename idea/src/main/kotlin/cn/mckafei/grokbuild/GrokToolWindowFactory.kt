package cn.mckafei.grokbuild

import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class GrokToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        GrokJcef.prepare()
        val session = GrokSession.get(project)
        try {
            session.ensureSidecar()
        } catch (_: Exception) {
        }
        val panel = GrokChatPanel(session, toolWindow.disposable)
        val content = ContentFactory.getInstance().createContent(panel.component, "", false)
        content.isCloseable = false
        toolWindow.contentManager.addContent(content)
        val actions = listOfNotNull(
            ActionManager.getInstance().getAction("Grok.NewSession"),
            ActionManager.getInstance().getAction("Grok.Restart"),
            ActionManager.getInstance().getAction("Grok.Resume"),
            ActionManager.getInstance().getAction("Grok.Cancel"),
        )
        if (actions.isNotEmpty()) {
            toolWindow.setTitleActions(actions.filterIsInstance<AnAction>())
        }
    }
}
