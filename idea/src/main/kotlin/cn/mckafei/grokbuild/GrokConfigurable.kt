package cn.mckafei.grokbuild

import com.intellij.openapi.fileChooser.FileChooser
import com.intellij.openapi.fileChooser.FileChooserDescriptor
import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.ui.TextFieldWithBrowseButton
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import com.intellij.util.ui.JBUI
import javax.swing.JComponent
import javax.swing.JPanel

class GrokConfigurable : Configurable {
    private var panel: JPanel? = null
    private val cliPath = TextFieldWithBrowseButton()
    private val minCli = JBTextField()
    private val preferWorkspace = JBCheckBox("Prefer workspace grok binary")
    private val includeSelection = JBCheckBox("Include current selection when sending")
    private val alwaysApprove = JBCheckBox("Always approve tool permissions")
    private val permission = ComboBox(arrayOf("ask", "acceptEdits", "auto"))
    private val locale = ComboBox(arrayOf("auto", "en", "zh-CN"))
    private var original = GrokSettingsStore.Snapshot()

    override fun getDisplayName(): String = "Grok Build"

    override fun createComponent(): JComponent {
        val descriptor = FileChooserDescriptor(true, false, false, false, false, false)
        descriptor.title = "Grok CLI"
        descriptor.description = "Path to the grok executable"
        cliPath.addActionListener {
            val chosen = FileChooser.chooseFile(descriptor, null, null) ?: return@addActionListener
            cliPath.text = chosen.path
        }
        val form = FormBuilder.createFormBuilder()
            .addLabeledComponent(JBLabel("CLI path:"), cliPath, 1, false)
            .addLabeledComponent(JBLabel("Min CLI version:"), minCli, 1, false)
            .addLabeledComponent(JBLabel("Permission mode:"), permission, 1, false)
            .addLabeledComponent(JBLabel("Locale:"), locale, 1, false)
            .addComponent(preferWorkspace, 8)
            .addComponent(includeSelection, 4)
            .addComponent(alwaysApprove, 4)
            .addComponentFillVertically(JPanel(), 0)
            .panel
        form.border = JBUI.Borders.empty(10)
        panel = form
        reset()
        return form
    }

    override fun isModified(): Boolean {
        val now = snapshotFromUi()
        return now != original
    }

    override fun apply() {
        val now = snapshotFromUi()
        val restart = now.cliPath != original.cliPath ||
            now.preferWorkspaceBinary != original.preferWorkspaceBinary ||
            now.minCliVersion != original.minCliVersion
        GrokSettingsStore.save(now)
        original = now
        if (restart) {
            for (project in ProjectManager.getInstance().openProjects) {
                GrokSession.get(project).restartAgent()
            }
        }
    }

    override fun reset() {
        original = GrokSettingsStore.load()
        cliPath.text = original.cliPath
        minCli.text = original.minCliVersion
        preferWorkspace.isSelected = original.preferWorkspaceBinary
        includeSelection.isSelected = original.includeSelectionOnSend
        alwaysApprove.isSelected = original.alwaysApprove
        permission.selectedItem = original.permissionMode
        locale.selectedItem = original.locale
    }

    override fun disposeUIResources() {
        panel = null
    }

    private fun snapshotFromUi(): GrokSettingsStore.Snapshot =
        GrokSettingsStore.Snapshot(
            cliPath = cliPath.text.trim(),
            preferWorkspaceBinary = preferWorkspace.isSelected,
            minCliVersion = minCli.text.trim().ifBlank { "0.1.0" },
            permissionMode = permission.selectedItem as? String ?: "ask",
            includeSelectionOnSend = includeSelection.isSelected,
            alwaysApprove = alwaysApprove.isSelected,
            locale = locale.selectedItem as? String ?: "auto",
        )
}
