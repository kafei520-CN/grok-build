package cn.mckafei.grokbuild

import com.intellij.openapi.application.PathManager
import com.intellij.openapi.util.io.FileUtil
import java.io.File
import java.net.JarURLConnection
import java.nio.file.Files
import java.nio.file.StandardCopyOption

/** Shared WebView / sidecar assets: classpath first, vscode/dist when running from source. */
object SharedAssets {
    const val PLUGIN_ID = "cn.mckafei.grok-build"
    const val PLUGIN_VERSION = "0.2.29"
    const val TOOL_WINDOW_ID = "Grok Build"
    const val NOTIFICATION_GROUP = "Grok Build"
    const val STATUS_WIDGET_ID = "GrokBuildWidget"

    fun pluginVersion(): String = PLUGIN_VERSION

    fun webviewJs(): File = resolve("webview.js", "dist")

    fun diffJs(): File = resolve("diff.js", "dist")

    fun hostJs(): File = resolve("host.js", "dist")

    fun chatCss(): File = resolve("chat.css", "media")

    fun diffCss(): File = resolve("diff.css", "media")

    fun grokSymbol(): File = resolve("grok-symbol.png", "media")

    fun shikiMonacoJs(): File = resolve("shiki-monaco.js", "dist")

    fun monacoDir(): File {
        val dest = File(workDir("assets"), "monaco")
        if (File(dest, "vs/loader.js").isFile) {
            return dest
        }
        if (extractMonacoTree(dest)) {
            return dest
        }
        val roots = listOf(
            File(System.getProperty("user.dir")),
            File(System.getProperty("user.dir"), ".."),
        )
        for (root in roots) {
            val candidate = File(root, "vscode/dist/monaco")
            if (File(candidate, "vs/loader.js").isFile) {
                return candidate.canonicalFile
            }
        }
        return dest
    }

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

    private fun extractMonacoTree(dest: File): Boolean {
        val url = SharedAssets::class.java.getResource("/grok/monaco/vs/loader.js") ?: return false
        if (url.protocol == "file") {
            val vs = File(url.toURI()).parentFile ?: return false
            copyTree(vs.parentFile, dest)
            return File(dest, "vs/loader.js").isFile
        }
        val conn = url.openConnection() as? JarURLConnection ?: return false
        val prefix = "grok/monaco/"
        val jar = conn.jarFile
        jar.entries().asSequence().forEach { entry ->
            if (entry.isDirectory || !entry.name.startsWith(prefix)) {
                return@forEach
            }
            val out = File(dest, entry.name.removePrefix(prefix))
            out.parentFile.mkdirs()
            jar.getInputStream(entry).use { input ->
                out.outputStream().use { input.copyTo(it) }
            }
        }
        return File(dest, "vs/loader.js").isFile
    }

    fun copyTree(from: File, to: File) {
        if (!from.isDirectory) {
            return
        }
        from.walkTopDown().forEach { src ->
            val dest = File(to, src.relativeTo(from).path)
            if (src.isDirectory) {
                dest.mkdirs()
            } else {
                dest.parentFile.mkdirs()
                Files.copy(src.toPath(), dest.toPath(), StandardCopyOption.REPLACE_EXISTING)
            }
        }
    }
}
