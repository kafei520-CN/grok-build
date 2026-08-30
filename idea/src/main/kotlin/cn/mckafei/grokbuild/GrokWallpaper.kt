package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.configurations.PathEnvironmentVariableUtil
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.util.SystemInfo
import java.io.File
import java.io.OutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.util.concurrent.TimeUnit
import kotlin.concurrent.thread

/**
 * JCEF cannot decode H.264 and often refuses file:// media from another folder.
 * Stage the clip next to chat/index.html, transcode mp4→webm when ffmpeg exists.
 */
object GrokWallpaper {
    private val log = Logger.getInstance(GrokWallpaper::class.java)
    private val lock = Any()
    private val videoExt = setOf("mp4", "webm", "mov", "m4v", "ogv")
    private var warnedCodec = false
    private var stagedKey = ""
    private var stagedName = ""

    fun prepare(event: JsonObject): JsonObject {
        if (event.get("type")?.asString != "state") {
            return event
        }
        val theme = event.getAsJsonObject("state")?.getAsJsonObject("theme") ?: return event
        val path = theme.get("wallpaperPath")?.takeIf { it.isJsonPrimitive }?.asString ?: return event
        val src = File(path)
        if (!src.isFile) {
            return event
        }
        val ext = src.extension.lowercase()
        if (ext !in videoExt) {
            return event
        }
        val copy = event.deepCopy()
        val staged = synchronized(lock) { stage(src, ext) } ?: return event
        copy.getAsJsonObject("state").getAsJsonObject("theme")
            .addProperty("wallpaperUrl", staged.name)
        return copy
    }

    private fun stage(src: File, ext: String): File? {
        val key = "${src.canonicalPath}:${src.lastModified()}:${src.length()}"
        val dir = SharedAssets.workDir("chat")
        if (key == stagedKey && stagedName.isNotBlank()) {
            val existing = File(dir, stagedName)
            if (existing.isFile) {
                return existing
            }
        }
        val playable = if (ext == "webm" || ext == "ogv") {
            src
        } else {
            transcode(src) ?: src.also { warnH264() }
        }
        val outExt = playable.extension.ifBlank { ext }
        dir.listFiles()?.filter { it.name.startsWith("wp-") }?.forEach { it.delete() }
        val dest = File(dir, "wp-${src.lastModified()}.$outExt")
        if (playable.canonicalPath != dest.canonicalPath) {
            Files.copy(playable.toPath(), dest.toPath(), StandardCopyOption.REPLACE_EXISTING)
        }
        stagedKey = key
        stagedName = dest.name
        return dest
    }

    private fun transcode(src: File): File? {
        val cache = File(src.parentFile, "${src.nameWithoutExtension}.jcef.webm")
        if (cache.isFile && cache.length() > 0 && cache.lastModified() >= src.lastModified()) {
            return cache
        }
        val bin = ffmpeg() ?: return null
        val cmd = GeneralCommandLine(bin.absolutePath)
            .withParameters(
                "-y",
                "-i", src.absolutePath,
                "-an",
                "-c:v", "libvpx",
                "-b:v", "2M",
                "-deadline", "realtime",
                "-cpu-used", "8",
                "-auto-alt-ref", "0",
                cache.absolutePath,
            )
            .withParentEnvironmentType(GeneralCommandLine.ParentEnvironmentType.CONSOLE)
        return try {
            val proc = cmd.createProcess()
            thread(isDaemon = true) { proc.inputStream.copyTo(OutputStream.nullOutputStream()) }
            thread(isDaemon = true) { proc.errorStream.copyTo(OutputStream.nullOutputStream()) }
            val ok = proc.waitFor(180, TimeUnit.SECONDS) && proc.exitValue() == 0 && cache.isFile && cache.length() > 0
            if (!ok) {
                proc.destroyForcibly()
                cache.delete()
                null
            } else {
                cache
            }
        } catch (error: Exception) {
            log.warn("ffmpeg wallpaper transcode", error)
            cache.delete()
            null
        }
    }

    private fun ffmpeg(): File? {
        System.getenv("FFMPEG")?.let { env -> File(env).takeIf { it.isFile } }?.let { return it }
        val home = System.getProperty("user.home")
        val names = if (SystemInfo.isWindows) listOf("ffmpeg.exe", "ffmpeg") else listOf("ffmpeg")
        for (name in names) {
            PathEnvironmentVariableUtil.findInPath(name)?.let { return it }
            File(home, ".grok/bin/$name").takeIf { it.isFile }?.let { return it }
        }
        return null
    }

    private fun warnH264() {
        if (warnedCodec) {
            return
        }
        warnedCodec = true
        NotificationGroupManager.getInstance()
            .getNotificationGroup(SharedAssets.NOTIFICATION_GROUP)
            .createNotification(
                "Grok Build",
                "IntelliJ cannot play H.264 MP4. Use a WebM file, or install ffmpeg and pick the video again. / 当前 IDE 无法播放 H.264（mp4）。请改用 webm，或安装 ffmpeg 后重新选择。",
                NotificationType.WARNING,
            )
            .notify(null)
    }
}
