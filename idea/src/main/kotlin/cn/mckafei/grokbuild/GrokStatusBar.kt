package cn.mckafei.grokbuild

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory
import com.intellij.util.Consumer
import java.awt.Component
import java.awt.event.MouseEvent

class GrokStatusBarFactory : StatusBarWidgetFactory {
    override fun getId(): String = SharedAssets.STATUS_WIDGET_ID

    override fun getDisplayName(): String = "Grok Build"

    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget = GrokStatusBar(project)

    override fun disposeWidget(widget: StatusBarWidget) {
        Disposer.dispose(widget)
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
}

class GrokStatusBar(private val project: Project) : StatusBarWidget, StatusBarWidget.TextPresentation {
    override fun ID(): String = SharedAssets.STATUS_WIDGET_ID

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    override fun install(statusBar: StatusBar) {}

    override fun dispose() {}

    override fun getAlignment(): Float = Component.CENTER_ALIGNMENT

    override fun getText(): String = "Grok"

    override fun getTooltipText(): String = "Open Grok Build"

    override fun getClickConsumer(): Consumer<MouseEvent> =
        Consumer {
            GrokSession.get(project).focusChat()
        }
}
