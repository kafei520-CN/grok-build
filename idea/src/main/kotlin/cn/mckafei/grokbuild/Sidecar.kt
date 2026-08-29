package cn.mckafei.grokbuild

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonNull
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.configurations.PathEnvironmentVariableUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.SystemInfo
import java.io.BufferedWriter
import java.io.File
import java.nio.charset.StandardCharsets
import java.util.ArrayDeque
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/** Node sidecar: shared GrokController over stdin/stdout JSON lines. */
class Sidecar(
    private val project: Project,
    private val onEvent: (JsonObject) -> Unit,
) : Disposable {
    private val log = Logger.getInstance(Sidecar::class.java)
    private val gson = Gson()
    private val outbound = ArrayDeque<String>()
    private var process: Process? = null
    private var writer: BufferedWriter? = null
    private val wantRun = AtomicBoolean(false)
    private val disposed = AtomicBoolean(false)
    @Volatile var running = false
        private set

    fun start() {
        if (disposed.get()) {
            return
        }
        wantRun.set(true)
        val node = findNode() ?: error("Node.js not found. Install Node and restart, or set GROK_NODE.")
        val host = SharedAssets.hostJs()
        val cwd = project.basePath ?: System.getProperty("user.home")
        val cmd = GeneralCommandLine(node, host.absolutePath)
            .withWorkDirectory(cwd)
            .withCharset(StandardCharsets.UTF_8)
            .withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)
        applyEnvironment(cmd, cwd)
        val proc = cmd.createProcess()
        synchronized(this) {
            if (disposed.get() || !wantRun.get()) {
                proc.destroyForcibly()
                return
            }
            destroyLocked()
            process = proc
            val out = proc.outputStream.bufferedWriter(StandardCharsets.UTF_8)
            writer = out
            while (outbound.isNotEmpty()) {
                writeLine(out, outbound.removeFirst())
            }
        }
        running = true
        thread(name = "GrokSidecar-stdout", isDaemon = true) {
            try {
                proc.inputStream.bufferedReader(StandardCharsets.UTF_8).use { reader ->
                    reader.lineSequence().forEach { line ->
                        if (line.isBlank()) return@forEach
                        try {
                            onEvent(JsonParser.parseString(line).asJsonObject)
                        } catch (error: Exception) {
                            log.warn("sidecar json: $line", error)
                        }
                    }
                }
            } catch (error: Exception) {
                log.warn("sidecar stdout", error)
            } finally {
                synchronized(this) {
                    if (process === proc) {
                        writer = null
                        process = null
                    }
                }
                running = false
                scheduleRestart(proc)
            }
        }
        thread(name = "GrokSidecar-stderr", isDaemon = true) {
            try {
                proc.errorStream.bufferedReader(StandardCharsets.UTF_8).use { reader ->
                    reader.lineSequence().forEach { line ->
                        log.warn("sidecar: $line")
                        val obj = JsonObject()
                        obj.addProperty("type", "log")
                        obj.addProperty("level", "warn")
                        obj.addProperty("message", line)
                        onEvent(obj)
                    }
                }
            } catch (_: Exception) {
            }
        }
    }

    fun send(payload: Map<String, Any?>) {
        sendRaw(gson.toJson(payload))
    }

    fun sendRaw(line: String) {
        synchronized(this) {
            val out = writer
            if (out == null) {
                outbound.add(line)
                return
            }
            try {
                writeLine(out, line)
            } catch (error: Exception) {
                log.warn("sidecar send failed, queued", error)
                outbound.add(line)
            }
        }
    }

    fun sendCommand(name: String) {
        val obj = JsonObject()
        obj.addProperty("type", "command")
        obj.addProperty("name", name)
        sendRaw(gson.toJson(obj))
    }

    fun sendUi(messageJson: String) {
        sendRaw("""{"type":"ui","message":$messageJson}""")
    }

    fun sendContext(selection: JsonElement?, file: JsonElement?) {
        val obj = JsonObject()
        obj.addProperty("type", "context")
        obj.add("selection", selection ?: JsonNull.INSTANCE)
        obj.add("file", file ?: JsonNull.INSTANCE)
        sendRaw(gson.toJson(obj))
    }

    fun reply(id: Int, value: Any?) {
        val obj = JsonObject()
        obj.addProperty("type", "reply")
        obj.addProperty("id", id)
        obj.addProperty("ok", true)
        obj.add("value", toTree(value))
        sendRaw(gson.toJson(obj))
    }

    fun replyError(id: Int, error: String) {
        val obj = JsonObject()
        obj.addProperty("type", "reply")
        obj.addProperty("id", id)
        obj.addProperty("ok", false)
        obj.addProperty("error", error)
        sendRaw(gson.toJson(obj))
    }

    private fun toTree(value: Any?): JsonElement = when (value) {
        null -> JsonNull.INSTANCE
        is JsonElement -> value
        else -> gson.toJsonTree(value)
    }

    private fun writeLine(out: BufferedWriter, line: String) {
        out.write(line)
        out.newLine()
        out.flush()
    }

    private fun applyEnvironment(cmd: GeneralCommandLine, cwd: String) {
        cmd.environment["GROK_CWD"] = cwd
        cmd.environment["GROK_VERSION"] = SharedAssets.pluginVersion()
        cmd.environment["GROK_LANG"] = Locale.getDefault().toLanguageTag()
        cmd.environment["GROK_IDE"] = "idea"
        cmd.environment["NODE_NO_WARNINGS"] = "1"
        val pathKey = cmd.environment.keys.firstOrNull { it.equals("PATH", ignoreCase = true) }
            ?: if (SystemInfo.isWindows) "Path" else "PATH"
        val current = cmd.environment[pathKey] ?: System.getenv(pathKey) ?: ""
        val extras = extraPathDirs().filter { File(it).isDirectory }
        if (extras.isNotEmpty()) {
            val sep = File.pathSeparator
            val merged = (extras + current.split(sep).filter { it.isNotBlank() }).distinct()
            cmd.environment[pathKey] = merged.joinToString(sep)
        }
    }

    private fun extraPathDirs(): List<String> {
        val home = System.getProperty("user.home")
        return listOf(
            File(home, ".grok/bin").absolutePath,
            File(home, "AppData/Roaming/npm").absolutePath,
            File(home, "AppData/Local/Volta/bin").absolutePath,
            File(home, ".volta/bin").absolutePath,
            File(home, ".local/bin").absolutePath,
            File(home, ".nvm/current/bin").absolutePath,
            "/usr/local/bin",
            "/opt/homebrew/bin",
        )
    }

    private fun scheduleRestart(proc: Process) {
        if (disposed.get() || !wantRun.get()) {
            return
        }
        synchronized(this) {
            if (process != null && process !== proc) {
                return
            }
        }
        thread(name = "GrokSidecar-restart", isDaemon = true) {
            try {
                Thread.sleep(800)
            } catch (_: InterruptedException) {
                return@thread
            }
            if (disposed.get() || !wantRun.get()) {
                return@thread
            }
            try {
                start()
            } catch (error: Exception) {
                log.warn("sidecar restart failed", error)
                val obj = JsonObject()
                obj.addProperty("type", "error")
                obj.addProperty("message", error.message ?: error.toString())
                onEvent(obj)
            }
        }
    }

    private fun destroyLocked() {
        val proc = process
        val out = writer
        process = null
        writer = null
        if (proc != null && proc.isAlive) {
            try {
                if (out != null) {
                    writeLine(out, """{"type":"shutdown"}""")
                }
            } catch (_: Exception) {
            }
            proc.destroy()
            if (!proc.waitFor(2, TimeUnit.SECONDS)) {
                proc.destroyForcibly()
            }
        }
    }

    override fun dispose() {
        disposed.set(true)
        wantRun.set(false)
        running = false
        synchronized(this) {
            destroyLocked()
        }
    }

    companion object {
        fun findNode(): String? {
            System.getenv("GROK_NODE")?.let { env ->
                if (File(env).isFile) return env
            }
            val names = if (SystemInfo.isWindows) listOf("node.exe", "node") else listOf("node")
            for (name in names) {
                PathEnvironmentVariableUtil.findInPath(name)?.let { return it.absolutePath }
            }
            val home = System.getProperty("user.home")
            val extras = listOf(
                File("""C:\Program Files\nodejs\node.exe"""),
                File("""D:\Program Files\nodejs\node.exe"""),
                File(home, "AppData/Local/Volta/bin/node.exe"),
                File(home, "AppData/Roaming/nvm/node.exe"),
                File("/usr/local/bin/node"),
                File("/opt/homebrew/bin/node"),
                File("/usr/bin/node"),
            )
            return extras.firstOrNull { it.isFile }?.absolutePath
        }
    }
}
