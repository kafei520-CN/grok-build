package cn.mckafei.grokbuild

import com.google.gson.Gson
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
import kotlin.concurrent.thread

/** Node sidecar：跑共享 GrokController，stdin/stdout 一行一条 JSON */
class Sidecar(
    private val project: Project,
    private val onEvent: (JsonObject) -> Unit,
) : Disposable {
    private val log = Logger.getInstance(Sidecar::class.java)
    private val gson = Gson()
    private val outbound = ArrayDeque<String>()
    private var process: Process? = null
    private var writer: BufferedWriter? = null
    @Volatile var running = false
        private set

    fun start() {
        val node = findNode() ?: error("Node.js not found. Install Node and restart, or set GROK_NODE.")
        val host = SharedAssets.hostJs()
        val cwd = project.basePath ?: System.getProperty("user.home")
        val cmd = GeneralCommandLine(node, host.absolutePath)
            .withWorkDirectory(cwd)
            .withCharset(StandardCharsets.UTF_8)
        cmd.environment["GROK_CWD"] = cwd
        cmd.environment["GROK_VERSION"] = SharedAssets.pluginVersion()
        cmd.environment["GROK_LANG"] = Locale.getDefault().toLanguageTag()
        cmd.environment["GROK_IDE"] = "idea"
        cmd.environment["NODE_NO_WARNINGS"] = "1"
        val proc = cmd.createProcess()
        process = proc
        val out = proc.outputStream.bufferedWriter(StandardCharsets.UTF_8)
        synchronized(this) {
            writer = out
            while (outbound.isNotEmpty()) {
                writeLine(out, outbound.removeFirst())
            }
        }
        running = true
        thread(name = "GrokSidecar-stdout", isDaemon = true) {
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
            running = false
        }
        thread(name = "GrokSidecar-stderr", isDaemon = true) {
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
            writeLine(out, line)
        }
    }

    fun reply(id: Int, value: Any?) {
        send(mapOf("type" to "reply", "id" to id, "ok" to true, "value" to value))
    }

    fun replyError(id: Int, error: String) {
        send(mapOf("type" to "reply", "id" to id, "ok" to false, "error" to error))
    }

    private fun writeLine(out: BufferedWriter, line: String) {
        out.write(line)
        out.newLine()
        out.flush()
    }

    override fun dispose() {
        running = false
        try {
            send(mapOf("type" to "shutdown"))
        } catch (_: Exception) {
        }
        val proc = process
        process = null
        writer = null
        if (proc != null && proc.isAlive) {
            proc.destroy()
            if (!proc.waitFor(2, java.util.concurrent.TimeUnit.SECONDS)) {
                proc.destroyForcibly()
            }
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
            val extras = listOf(
                File("""C:\Program Files\nodejs\node.exe"""),
                File("""D:\Program Files\nodejs\node.exe"""),
                File("/usr/local/bin/node"),
                File("/opt/homebrew/bin/node"),
                File("/usr/bin/node"),
            )
            return extras.firstOrNull { it.isFile }?.absolutePath
        }
    }
}
