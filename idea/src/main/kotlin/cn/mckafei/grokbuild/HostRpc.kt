package cn.mckafei.grokbuild

import com.google.gson.JsonArray
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.ide.BrowserUtil
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.application.ApplicationManager

import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.fileChooser.FileChooser
import com.intellij.openapi.fileChooser.FileChooserDescriptor
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.OpenFileDescriptor
import com.intellij.openapi.fileEditor.impl.NonProjectFileWritingAccessProvider
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VfsUtil
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.components.JBList
import com.intellij.ui.components.JBScrollPane
import java.awt.Desktop
import java.awt.Dimension
import java.awt.datatransfer.StringSelection
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import java.io.File
import javax.swing.JComponent
import javax.swing.ListSelectionModel

/** sidecar host.* requests → IntelliJ dialogs / VFS / terminal / browser. */
class HostRpc(
    private val project: Project,
    private val session: GrokSession,
) {
    fun handle(event: JsonObject) {
        val id = event.get("id")?.asInt ?: return
        val method = event.get("method")?.asString ?: return
        val params = event.get("params")?.takeIf { it.isJsonObject }?.asJsonObject ?: JsonObject()
        val sidecar = session.sidecar ?: return
        try {
            when (method) {
                "info" -> {
                    balloon(str(params, "message"), NotificationType.INFORMATION)
                    sidecar.reply(id, true)
                }
                "warn" -> {
                    balloon(str(params, "message"), NotificationType.WARNING)
                    sidecar.reply(id, true)
                }
                "showLog" -> {
                    session.showLogDialog()
                    sidecar.reply(id, true)
                }
                "input" -> sidecar.reply(id, askInput(params))
                "confirm" -> sidecar.reply(id, askConfirm(params))
                "pick" -> sidecar.reply(id, askPick(params))
                "saveFile" -> sidecar.reply(id, askSave(str(params, "defaultPath")))
                "openFiles" -> sidecar.reply(id, askOpenFiles(params))
                "openFolder" -> sidecar.reply(id, askOpenFolders(params))
                "openExternal" -> {
                    val url = str(params, "url")
                    if (url.isNotBlank()) {
                        BrowserUtil.browse(url)
                    }
                    sidecar.reply(id, true)
                }
                "openFile" -> {
                    openPath(str(params, "path"))
                    sidecar.reply(id, true)
                }
                "clipboardWrite" -> {
                    CopyPasteManager.getInstance().setContents(StringSelection(str(params, "text")))
                    sidecar.reply(id, true)
                }
                "hostChrome" -> {
                    val vars = GrokTheme.cssVariables()
                    sidecar.reply(
                        id,
                        mapOf(
                            "background" to vars.getValue("--vscode-sideBar-background"),
                            "foreground" to vars.getValue("--vscode-foreground"),
                        ),
                    )
                }
                "createTerminal" -> {
                    GrokTerminal.open(project, str(params, "name", "Grok"), str(params, "command"))
                    sidecar.reply(id, true)
                }
                "closeSidebar" -> {
                    ToolWindowManager.getInstance(project).getToolWindow(SharedAssets.TOOL_WINDOW_ID)?.hide(null)
                    sidecar.reply(id, true)
                }
                "focusChat" -> {
                    session.focusChat()
                    sidecar.reply(id, true)
                }
                "openText" -> sidecar.reply(id, readOpenText(str(params, "path")))
                "applyText" -> sidecar.reply(id, applyText(str(params, "path"), str(params, "text")))
                "deleteFile" -> sidecar.reply(id, deletePath(str(params, "path")))
                "refresh" -> {
                    refreshPath(str(params, "path"))
                    sidecar.reply(id, true)
                }
                "showDiff" -> {
                    sidecar.reply(id, true)
                    session.showDiff(params)
                }
                else -> sidecar.replyError(id, "unknown host method $method")
            }
        } catch (error: Exception) {
            sidecar.replyError(id, error.message ?: error.toString())
        }
    }

    private fun balloon(message: String, type: NotificationType) {
        if (message.isBlank()) {
            return
        }
        NotificationGroupManager.getInstance()
            .getNotificationGroup(SharedAssets.NOTIFICATION_GROUP)
            .createNotification(message, type)
            .notify(project)
    }

    private fun askInput(params: JsonObject): String? {
        val title = str(params, "title", "Grok Build")
        val prompt = str(params, "prompt", title)
        val password = params.get("password")?.asBoolean == true
        return if (password) {
            Messages.showPasswordDialog(project, prompt, title, null)
        } else {
            Messages.showInputDialog(project, prompt, title, null)
        }
    }

    private fun askConfirm(params: JsonObject): Boolean {
        val action = str(params, "action", "OK")
        return Messages.showYesNoDialog(
            project,
            str(params, "message"),
            "Grok Build",
            action,
            "Cancel",
            null,
        ) == Messages.YES
    }

    private fun askPick(params: JsonObject): JsonElement? {
        val items: JsonArray = params.getAsJsonArray("items") ?: return null
        if (items.size() == 0) {
            return null
        }
        data class Row(val label: String, val description: String, val value: JsonElement) {
            override fun toString(): String =
                if (description.isBlank()) label else "$label  —  $description"
        }
        val rows = items.map { el ->
            val obj = el.asJsonObject
            Row(
                obj.get("label")?.asString ?: "",
                obj.get("description")?.asString ?: "",
                obj.get("value") ?: com.google.gson.JsonNull.INSTANCE,
            )
        }
        val chosen = arrayOfNulls<Row>(1)
        val dialog = object : DialogWrapper(project, true) {
            private val list = JBList(rows)
            init {
                title = str(params, "title", "Grok Build")
                list.selectionMode = ListSelectionModel.SINGLE_SELECTION
                list.selectedIndex = 0
                list.addMouseListener(object : MouseAdapter() {
                    override fun mouseClicked(e: MouseEvent) {
                        if (e.clickCount == 2) {
                            doOKAction()
                        }
                    }
                })
                init()
            }

            override fun createCenterPanel(): JComponent {
                list.visibleRowCount = rows.size.coerceIn(4, 14)
                val scroll = JBScrollPane(list)
                scroll.preferredSize = Dimension(520, 300)
                return scroll
            }

            override fun doOKAction() {
                chosen[0] = list.selectedValue
                super.doOKAction()
            }

            override fun getPreferredFocusedComponent(): JComponent = list
        }
        return if (dialog.showAndGet()) chosen[0]?.value else null
    }

    private fun askSave(defaultPath: String): String? {
        val fallback = File(defaultPath.ifBlank { "grok-session.md" })
        val ext = fallback.extension.ifBlank { "md" }
        val descriptor = FileSaverDescriptor("Export session", "", ext)
        val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, project)
        val parentIo = fallback.parentFile ?: File(project.basePath ?: System.getProperty("user.home"))
        val parent = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(parentIo)
        return dialog.save(parent, fallback.name)?.file?.path
    }

    private fun askOpenFiles(params: JsonObject): List<String>? {
        val descriptor = FileChooserDescriptor(true, false, false, false, false, true)
        descriptor.title = str(params, "title", "Add to Grok")
        val filters = params.getAsJsonObject("filters")
        if (filters != null) {
            val allowed = filters.entrySet().flatMap { entry ->
                entry.value.asJsonArray.map { it.asString.lowercase() }
            }.toSet()
            if (allowed.isNotEmpty()) {
                descriptor.withFileFilter { vf ->
                    vf.isDirectory || allowed.contains(vf.extension?.lowercase())
                }
            }
        }
        val files = FileChooser.chooseFiles(descriptor, project, null)
        if (files.isEmpty()) {
            return null
        }
        return files.map { it.path }
    }

    private fun askOpenFolders(params: JsonObject): List<String>? {
        val descriptor = FileChooserDescriptor(false, true, false, false, false, true)
        descriptor.title = str(params, "title", "Add to Grok")
        val files = FileChooser.chooseFiles(descriptor, project, null)
        if (files.isEmpty()) {
            return null
        }
        return files.map { it.path }
    }

    private fun openPath(path: String) {
        if (path.isBlank()) {
            return
        }
        val vf = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path)) ?: return
        OpenFileDescriptor(project, vf).navigate(true)
    }

    private fun readOpenText(path: String): String? {
        if (path.isBlank()) {
            return null
        }
        val io = File(path)
        val vfs = LocalFileSystem.getInstance()
        val vf = vfs.findFileByIoFile(io) ?: vfs.refreshAndFindFileByIoFile(io) ?: return null
        return ApplicationManager.getApplication().runReadAction<String?> {
            FileDocumentManager.getInstance().getDocument(vf)?.text
        }
    }

    private fun applyText(path: String, text: String): Boolean {
        val io = File(path)
        var ok = false
        val write = Runnable {
            WriteCommandAction.runWriteCommandAction(
                project,
                "Grok Build write",
                null,
                Runnable {
                    val vfs = LocalFileSystem.getInstance()
                    io.parentFile?.mkdirs()
                    var vf = vfs.refreshAndFindFileByIoFile(io)
                    if (vf == null) {
                        val parentIo = io.parentFile ?: return@Runnable
                        val parent = vfs.refreshAndFindFileByIoFile(parentIo)
                            ?: VfsUtil.createDirectories(parentIo.absolutePath)
                        vf = parent.findChild(io.name) ?: parent.createChildData(this@HostRpc, io.name)
                    }
                    val target = vf ?: return@Runnable
                    NonProjectFileWritingAccessProvider.allowWriting(listOf(target))
                    val doc = FileDocumentManager.getInstance().getDocument(target)
                    if (doc != null) {
                        doc.setText(text)
                        FileDocumentManager.getInstance().saveDocument(doc)
                    } else {
                        VfsUtil.saveText(target, text)
                    }
                    ok = true
                },
            )
        }
        val app = ApplicationManager.getApplication()
        if (app.isDispatchThread) write.run() else app.invokeAndWait(write)
        return ok
    }

    private fun deletePath(path: String): Boolean {
        val io = File(path)
        if (!io.exists()) {
            return false
        }
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.MOVE_TO_TRASH)) {
                Desktop.getDesktop().moveToTrash(io)
                refreshPath(path)
                return true
            }
        } catch (_: Exception) {
        }
        val vf = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(io)
        if (vf != null) {
            WriteCommandAction.runWriteCommandAction(project) {
                vf.delete(this)
            }
            return true
        }
        val deleted = io.delete()
        refreshPath(path)
        return deleted
    }

    private fun refreshPath(path: String) {
        ApplicationManager.getApplication().invokeLater {
            LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path))?.refresh(true, false)
        }
    }

    private fun str(params: JsonObject, key: String, fallback: String = ""): String {
        val el = params.get(key) ?: return fallback
        return if (el.isJsonNull) fallback else el.asString
    }
}
