package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.fileEditor.FileEditorStateLevel
import com.intellij.openapi.fileTypes.FileType
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.IconLoader
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.testFramework.LightVirtualFile
import com.intellij.ui.components.JBLabel
import java.awt.BorderLayout
import java.beans.PropertyChangeListener
import java.beans.PropertyChangeSupport
import javax.swing.Icon
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.SwingConstants

object GrokDiffFileType : FileType {
    override fun getName(): String = "Grok Diff"
    override fun getDescription(): String = "Grok Diff"
    override fun getDefaultExtension(): String = "grokdiff"
    override fun getIcon(): Icon = IconLoader.getIcon("/icons/grok.svg", GrokDiffFileType::class.java)
    override fun isBinary(): Boolean = true
    override fun isReadOnly(): Boolean = true
}

class GrokDiffVirtualFile(
    payload: JsonObject,
    val session: GrokSession,
) : LightVirtualFile("Grok Diff", GrokDiffFileType, "") {
    var payload: JsonObject = payload
        private set
    var editor: GrokDiffEditor? = null

    init {
        isWritable = false
    }

    fun updatePayload(next: JsonObject) {
        payload = next
        editor?.showPayload(next)
    }
}

class GrokDiffEditorProvider : FileEditorProvider, DumbAware {
    override fun accept(project: Project, file: VirtualFile): Boolean =
        file is GrokDiffVirtualFile || file.fileType === GrokDiffFileType

    override fun acceptRequiresReadAction(): Boolean = false

    override fun createEditor(project: Project, file: VirtualFile): FileEditor =
        GrokDiffEditor(file as GrokDiffVirtualFile)

    override fun getEditorTypeId(): String = "grok-build-diff"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.HIDE_DEFAULT_EDITOR
}

class GrokDiffEditor(
    private val file: GrokDiffVirtualFile,
) : UserDataHolderBase(), FileEditor {
    private val listeners = PropertyChangeSupport(this)
    private val panel = JPanel(BorderLayout())

    init {
        file.editor = this
        val view = file.session.diff.attach(panel)
        if (view == null) {
            panel.add(JBLabel(GrokJcef.MISSING_HTML, SwingConstants.CENTER), BorderLayout.CENTER)
        }
    }

    fun showPayload(payload: JsonObject) {
        file.session.diff.postIfReady(payload)
    }

    fun applyTheme() {
        file.session.diff.applyTheme()
    }

    override fun getComponent(): JComponent = panel
    override fun getPreferredFocusedComponent(): JComponent = panel
    override fun getName(): String = "Grok Diff"
    override fun getFile(): VirtualFile = file
    override fun isModified(): Boolean = false
    override fun isValid(): Boolean = file.isValid
    override fun getState(level: FileEditorStateLevel): FileEditorState = FileEditorState.INSTANCE
    override fun setState(state: FileEditorState) {}
    override fun addPropertyChangeListener(listener: PropertyChangeListener) {
        listeners.addPropertyChangeListener(listener)
    }
    override fun removePropertyChangeListener(listener: PropertyChangeListener) {
        listeners.removePropertyChangeListener(listener)
    }

    override fun dispose() {
        file.session.diff.detach(panel)
        if (file.editor === this) {
            file.editor = null
        }
    }
}
