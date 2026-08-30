package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.intellij.execution.filters.TextConsoleBuilderFactory
import com.intellij.execution.ui.ConsoleView
import com.intellij.execution.ui.ConsoleViewContentType
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.Disposable
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.application.ModalityState
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.components.Service
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.ui.content.ContentFactory
import java.io.File
import java.util.ArrayDeque

@Service(Service.Level.PROJECT)
class GrokSession(val project: Project) : Disposable {
    var panel: GrokChatPanel? = null
        private set
    var sidecar: Sidecar? = null
        private set

    private val log = Logger.getInstance(GrokSession::class.java)
    private val logs = StringBuilder()
    private var dispatcher: HostRpc? = null
    private var context: GrokContext? = null
    val diff = GrokDiffSupport(project, this)
    private var logConsole: ConsoleView? = null
    private var ready = false
    private val pendingCommands = ArrayDeque<String>()
    private var lastSelection: JsonObject? = null
    private var lastFile: JsonObject? = null

    init {
        val appBus = ApplicationManager.getApplication().messageBus.connect(this)
        appBus.subscribe(
            LafManagerListener.TOPIC,
            LafManagerListener {
                panel?.applyTheme()
                diff.applyTheme()
            },
        )
        context = GrokContext(project) { selection, file ->
            lastSelection = selection
            lastFile = file
            sidecar?.sendContext(selection, file)
        }
        Disposer.register(this, context!!)
        Disposer.register(this, diff)
    }

    fun attach(panel: GrokChatPanel) {
        this.panel = panel
        ensureSidecar()
        context?.pushNow()
    }

    fun ensureSidecar() {
        if (sidecar != null) {
            return
        }
        val sc = Sidecar(project) { event ->
            when (event.get("type")?.asString) {
                "log" -> appendLog(event)
                "state", "tail" -> enqueueWebview(event)
                else -> ApplicationManager.getApplication().invokeLater { onEvent(event) }
            }
        }
        sidecar = sc
        dispatcher = HostRpc(project, this)
        Disposer.register(this, sc)
        try {
            sc.start()
        } catch (error: Exception) {
            Disposer.dispose(sc)
            sidecar = null
            dispatcher = null
            throw error
        }
    }

    fun sendDropped(paths: List<String>) {
        if (paths.isEmpty()) {
            return
        }
        val uris = paths.joinToString(",") { path ->
            jsonString(fileUri(path))
        }
        sendUi("""{"type":"pasteClipboard","uris":[$uris]}""")
    }

    fun sendUi(messageJson: String) {
        try {
            context?.pushNow()
        } catch (error: Throwable) {
            log.warn("editor context snapshot failed", error)
        }
        sidecar?.sendUi(messageJson)
    }

    fun sendCommand(name: String) {
        val sc = sidecar
        if (ready && sc != null) {
            sc.sendCommand(name)
            return
        }
        pendingCommands.add(name)
        focusChat()
        try {
            ensureSidecar()
        } catch (_: Exception) {
        }
    }

    fun pushEditorContext() {
        context?.pushNow()
    }

    fun focusChat() {
        val tw = ToolWindowManager.getInstance(project).getToolWindow(SharedAssets.TOOL_WINDOW_ID) ?: return
        tw.show()
        tw.activate(null, true)
    }

    fun showDiff(params: JsonObject) {
        val app = ApplicationManager.getApplication()
        if (!app.isDispatchThread) {
            app.invokeLater({ showDiff(params) }, ModalityState.any())
            return
        }
        diff.show(params)
    }

    fun showLogDialog() {
        val tw = ToolWindowManager.getInstance(project).getToolWindow(SharedAssets.TOOL_WINDOW_ID) ?: return
        val console = logConsole ?: run {
            val created = TextConsoleBuilderFactory.getInstance().createBuilder(project).console
            logConsole = created
            Disposer.register(this, created)
            val snapshot = synchronized(logs) { logs.toString() }
            if (snapshot.isNotBlank()) {
                created.print(snapshot, ConsoleViewContentType.NORMAL_OUTPUT)
            }
            val content = ContentFactory.getInstance().createContent(created.component, "Log", true)
            tw.contentManager.addContent(content)
            created
        }
        val content = tw.contentManager.contents.find { it.component === console.component }
        if (content != null) {
            tw.contentManager.setSelectedContent(content)
        }
        tw.show()
        tw.activate(null, true)
    }

    fun restartAgent() {
        val sc = sidecar
        if (ready && sc != null) {
            sc.sendCommand("restart")
            return
        }
        sendCommand("restart")
    }

    private val webviewLock = Any()
    private var pendingState: String? = null
    private var pendingTail: String? = null
    private var webviewFlushPosted = false

    private fun enqueueWebview(event: JsonObject) {
        val payload = try {
            GrokWallpaper.prepare(event)
        } catch (error: Throwable) {
            log.warn("wallpaper stage", error)
            event
        }
        val json = payload.toString()
        synchronized(webviewLock) {
            if (event.get("type")?.asString == "state") {
                pendingState = json
                pendingTail = null
            } else {
                pendingTail = json
            }
            if (webviewFlushPosted) {
                return
            }
            webviewFlushPosted = true
        }
        ApplicationManager.getApplication().invokeLater { flushWebview() }
    }

    private fun flushWebview() {
        val state: String?
        val tail: String?
        synchronized(webviewLock) {
            state = pendingState
            tail = pendingTail
            pendingState = null
            pendingTail = null
            webviewFlushPosted = false
        }
        if (state != null) {
            panel?.postToWebview(state)
        }
        if (tail != null) {
            panel?.postToWebview(tail)
        }
    }

    private fun onEvent(event: JsonObject) {
        when (event.get("type")?.asString) {
            "host" -> dispatcher?.handle(event)
            "state", "tail" -> enqueueWebview(event)
            "ready" -> {
                ready = true
                sidecar?.sendContext(lastSelection, lastFile)
                while (pendingCommands.isNotEmpty()) {
                    sidecar?.sendCommand(pendingCommands.removeFirst())
                }
                panel?.onHostReady()
            }
            "log" -> appendLog(event)
            "error" -> {
                appendLog(event)
                panel?.onHostError(event.get("message")?.asString ?: "sidecar error")
            }
        }
    }

    private fun appendLog(event: JsonObject) {
        val line = buildString {
            append(event.get("level")?.asString ?: "info")
            append(' ')
            append(event.get("message")?.asString ?: event.toString())
            event.get("detail")?.asString?.let { append('\n').append(it) }
            append('\n')
        }
        synchronized(logs) {
            logs.append(line)
            if (logs.length > 200_000) {
                logs.delete(0, logs.length - 150_000)
            }
        }
        val type = when (event.get("level")?.asString) {
            "error" -> ConsoleViewContentType.ERROR_OUTPUT
            "warn" -> ConsoleViewContentType.LOG_WARNING_OUTPUT
            else -> ConsoleViewContentType.NORMAL_OUTPUT
        }
        val console = logConsole ?: return
        val app = ApplicationManager.getApplication()
        val run = Runnable { console.print(line, type) }
        if (app.isDispatchThread) run.run() else app.invokeLater(run)
    }

    override fun dispose() {
        panel = null
        sidecar = null
        dispatcher = null
        context = null
        logConsole = null
        ready = false
        pendingCommands.clear()
    }

    companion object {
        fun get(project: Project): GrokSession = project.getService(GrokSession::class.java)

        private fun jsonString(value: String): String =
            "\"${value.replace("\\", "\\\\").replace("\"", "\\\"")}\""

        private fun fileUri(path: String): String {
            if (path.startsWith("file:")) {
                return path
            }
            val abs = File(path).absolutePath.replace('\\', '/')
            return if (abs.length >= 2 && abs[1] == ':') "file:///$abs" else "file://$abs"
        }
    }
}
