package cn.mckafei.grokbuild

import com.google.gson.JsonArray
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
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.util.SystemInfo
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.wm.ToolWindowManager
import java.awt.Toolkit
import java.awt.datatransfer.StringSelection
import java.io.File

/** sidecar 的 host.* 请求 → IDEA 原生对话框 / VFS / 浏览器 */
class HostDispatcher(
    private val project: Project,
    private val session: GrokSession,
) {
    fun handle(event: JsonObject) {
        val id = event.get("id")?.asInt ?: return
        val method = event.get("method")?.asString ?: return
        val params = event.getAsJsonObject("params") ?: JsonObject()
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
                    BrowserUtil.browse(str(params, "url"))
                    sidecar.reply(id, true)
                }
                "openFile" -> {
                    openPath(str(params, "path"))
                    sidecar.reply(id, true)
                }
                "clipboardWrite" -> {
                    Toolkit.getDefaultToolkit().systemClipboard.setContents(
                        StringSelection(str(params, "text")),
                        null,
                    )
                    sidecar.reply(id, true)
                }
                "createTerminal" -> {
                    openTerminal(str(params, "name"), str(params, "command"))
                    sidecar.reply(id, true)
                }
                "closeSidebar" -> {
                    ToolWindowManager.getInstance(project).getToolWindow(GrokSession.TOOL_WINDOW_ID)?.hide(null)
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
                    GrokDiffDialog(project, params, session).show()
                    sidecar.reply(id, true)
                }
                else -> sidecar.replyError(id, "unknown host method $method")
            }
        } catch (error: Exception) {
            sidecar.replyError(id, error.message ?: error.toString())
        }
    }

    private fun balloon(message: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup("Grok Build")
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

    private fun askPick(params: JsonObject): Any? {
        val items: JsonArray = params.getAsJsonArray("items") ?: return null
        if (items.size() == 0) return null
        val labels = items.map { it.asJsonObject.get("label")?.asString ?: "" }.toTypedArray()
        val idx = Messages.showChooseDialog(
            project,
            str(params, "title", "Grok Build"),
            "Grok Build",
            null,
            labels,
            labels[0],
        )
        if (idx < 0 || idx >= items.size()) return null
        val value = items[idx].asJsonObject.get("value") ?: return null
        return when {
            value.isJsonPrimitive && value.asJsonPrimitive.isNumber -> value.asNumber
            value.isJsonPrimitive && value.asJsonPrimitive.isBoolean -> value.asBoolean
            value.isJsonPrimitive -> value.asString
            else -> value.toString()
        }
    }

    private fun askSave(defaultPath: String): String? {
        val descriptor = FileSaverDescriptor("Export session", "", "md")
        val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, project)
        val fallback = File(defaultPath)
        val parent = LocalFileSystem.getInstance().findFileByIoFile(fallback.parentFile ?: File(project.basePath ?: "."))
        return dialog.save(parent, fallback.name)?.file?.path
    }

    private fun askOpenFiles(params: JsonObject = JsonObject()): List<String> {
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
        return FileChooser.chooseFiles(descriptor, project, null).map { it.path }
    }

    private fun askOpenFolders(params: JsonObject = JsonObject()): List<String> {
        val descriptor = FileChooserDescriptor(false, true, false, false, false, true)
        descriptor.title = str(params, "title", "Add to Grok")
        return FileChooser.chooseFiles(descriptor, project, null).map { it.path }
    }

    private fun openPath(path: String) {
        val vf = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path)) ?: return
        OpenFileDescriptor(project, vf).navigate(true)
    }

    private fun readOpenText(path: String): String? {
        val vf = LocalFileSystem.getInstance().findFileByIoFile(File(path)) ?: return null
        val doc = FileDocumentManager.getInstance().getDocument(vf) ?: return null
        return doc.text
    }

    private fun applyText(path: String, text: String): Boolean {
        val io = File(path)
        WriteCommandAction.runWriteCommandAction(project) {
            val vfs = LocalFileSystem.getInstance()
            var vf = vfs.refreshAndFindFileByIoFile(io)
            if (vf == null) {
                io.parentFile?.mkdirs()
                vfs.refreshAndFindFileByIoFile(io.parentFile)?.createChildData(this, io.name)
                vf = vfs.refreshAndFindFileByIoFile(io)
            }
            val target = vf
            if (target == null) {
                io.writeText(text, Charsets.UTF_8)
                vfs.refreshAndFindFileByIoFile(io)
                return@runWriteCommandAction
            }
            val doc = FileDocumentManager.getInstance().getDocument(target)
            if (doc != null) {
                doc.setText(text)
                FileDocumentManager.getInstance().saveDocument(doc)
            } else {
                target.setBinaryContent(text.toByteArray(Charsets.UTF_8))
            }
        }
        return true
    }

    private fun deletePath(path: String): Boolean {
        val vf = LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path)) ?: return false
        WriteCommandAction.runWriteCommandAction(project) {
            vf.delete(this)
        }
        return true
    }

    private fun refreshPath(path: String) {
        LocalFileSystem.getInstance().refreshAndFindFileByIoFile(File(path))
    }

    private fun openTerminal(name: String, command: String) {
        val cwd = project.basePath ?: System.getProperty("user.home")
        val cmd = if (SystemInfo.isWindows) {
            listOf("cmd.exe", "/c", "start", name, "cmd.exe", "/k", command)
        } else if (SystemInfo.isMac) {
            listOf("osascript", "-e", "tell application \"Terminal\" to do script \"cd '$cwd' && $command\"")
        } else {
            listOf("x-terminal-emulator", "-e", command)
        }
        ProcessBuilder(cmd).directory(File(cwd)).start()
    }

    private fun str(params: JsonObject, key: String, fallback: String = ""): String {
        val el = params.get(key) ?: return fallback
        return if (el.isJsonNull) fallback else el.asString
    }
}
