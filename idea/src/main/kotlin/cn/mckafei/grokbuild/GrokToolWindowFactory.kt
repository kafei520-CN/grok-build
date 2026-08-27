package cn.mckafei.grokbuild

import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

class GrokToolWindowFactory : ToolWindowFactory, DumbAware {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val session = GrokSession.get(project)
        val panel = GrokChatPanel(session, toolWindow.disposable)
        val content = ContentFactory.getInstance().createContent(panel.component, "", false)
        content.isCloseable = false
        toolWindow.contentManager.addContent(content)
    }
}
