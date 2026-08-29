package cn.mckafei.grokbuild

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.util.io.FileUtil
import java.io.File

/** Shared WebView / sidecar assets: classpath first, vscode/dist when running from source. */
object SharedAssets {
    const val PLUGIN_ID = "cn.mckafei.grok-build"
    const val TOOL_WINDOW_ID = "Grok Build"
    const val NOTIFICATION_GROUP = "Grok Build"
    const val STATUS_WIDGET_ID = "GrokBuildWidget"

    fun pluginVersion(): String =
        PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))?.version ?: "0.1.92"

    fun webviewJs(): File = resolve("webview.js", "dist")

    fun diffJs(): File = resolve("diff.js", "dist")

    fun hostJs(): File = resolve("host.js", "dist")

    fun chatCss(): File = resolve("chat.css", "media")

    fun diffCss(): File = resolve("diff.css", "media")

    fun workDir(kind: String): File {
        val dir = File(PathManager.getTempPath(), "grok-build/$kind-${pluginVersion()}")
        FileUtil.ensureExists(dir)
        return dir
    }

    private fun resolve(name: String, vscodeSubdir: String): File {
        extract("/grok/$name", name)?.let { return it }
        val roots = listOf(
            File(System.getProperty("user.dir")),
            File(System.getProperty("user.dir"), ".."),
        )
        for (root in roots) {
            val candidate = File(root, "vscode/$vscodeSubdir/$name")
            if (candidate.isFile) {
                return candidate.canonicalFile
            }
        }
        error("Missing shared asset $name. Compile vscode/ (`npm run compile`) first.")
    }

    private fun extract(resource: String, name: String): File? {
        val stream = SharedAssets::class.java.getResourceAsStream(resource) ?: return null
        val out = File(workDir("assets"), name)
        stream.use { input -> out.outputStream().use { input.copyTo(it) } }
        return out
    }
}
