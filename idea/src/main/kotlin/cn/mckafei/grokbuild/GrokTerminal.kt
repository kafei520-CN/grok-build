package cn.mckafei.grokbuild

import com.intellij.openapi.project.Project
import com.intellij.openapi.util.SystemInfo
import java.io.File

/** Open a visible shell for install/run commands. Prefers the bundled Terminal plugin. */
object GrokTerminal {
    fun open(project: Project, name: String, command: String) {
        val cwd = project.basePath ?: System.getProperty("user.home")
        if (tryIntellijTerminal(project, name, command, cwd)) {
            return
        }
        fallback(name, command, cwd)
    }

    private fun tryIntellijTerminal(project: Project, name: String, command: String, cwd: String): Boolean {
        return try {
            val cls = Class.forName("org.jetbrains.plugins.terminal.TerminalToolWindowManager")
            val manager = cls.getMethod("getInstance", Project::class.java).invoke(null, project)
            val widget = createWidget(cls, manager, cwd, name) ?: return false
            val exec = widget.javaClass.methods.firstOrNull { method ->
                method.name == "executeCommand" || method.name == "sendCommandToExecute"
            } ?: return false
            if (exec.parameterCount == 1) {
                exec.invoke(widget, command)
            } else {
                return false
            }
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun createWidget(cls: Class<*>, manager: Any, cwd: String, name: String): Any? {
        val methods = cls.methods
        methods.firstOrNull { it.name == "createLocalShellWidget" && it.parameterCount == 2 }?.let {
            return it.invoke(manager, cwd, name)
        }
        methods.firstOrNull { it.name == "createLocalShellWidget" && it.parameterCount == 3 }?.let {
            return it.invoke(manager, cwd, name, true)
        }
        methods.firstOrNull { it.name == "createShellWidget" && it.parameterCount >= 2 }?.let { method ->
            val args = Array(method.parameterCount) { index ->
                when (index) {
                    0 -> cwd
                    1 -> name
                    else -> true
                }
            }
            return method.invoke(manager, *args)
        }
        return null
    }

    private fun fallback(name: String, command: String, cwd: String) {
        val cmd = when {
            SystemInfo.isWindows -> listOf("cmd.exe", "/c", "start", name, "cmd.exe", "/k", "cd /d $cwd & $command")
            SystemInfo.isMac -> listOf(
                "osascript",
                "-e",
                "tell application \"Terminal\" to do script \"cd ${escapeSh(cwd)} && ${escapeSh(command)}\"",
            )
            else -> listOf("x-terminal-emulator", "-e", "bash", "-lc", "cd ${escapeSh(cwd)} && ${escapeSh(command)}")
        }
        ProcessBuilder(cmd).directory(File(cwd)).start()
    }

    private fun escapeSh(value: String): String = value.replace("'", "'\\''")
}
