package cn.mckafei.grokbuild

import com.google.gson.JsonObject
import com.google.gson.JsonParser
import java.io.File

/** ~/.grok/idea-settings.json — same file NodePlatform getConfig/setConfig uses. */
object GrokSettingsStore {
    data class Snapshot(
        var cliPath: String = "",
        var preferWorkspaceBinary: Boolean = false,
        var minCliVersion: String = "0.1.0",
        var permissionMode: String = "ask",
        var includeSelectionOnSend: Boolean = true,
        var alwaysApprove: Boolean = false,
        var locale: String = "auto",
        var notifySound: Boolean = true,
    )

    fun file(): File = File(System.getProperty("user.home"), ".grok/idea-settings.json")

    fun load(): Snapshot {
        val raw = try {
            JsonParser.parseString(file().readText(Charsets.UTF_8)).asJsonObject
        } catch (_: Exception) {
            JsonObject()
        }
        return Snapshot(
            cliPath = str(raw, "cliPath", ""),
            preferWorkspaceBinary = bool(raw, "preferWorkspaceBinary", false),
            minCliVersion = str(raw, "minCliVersion", "0.1.0"),
            permissionMode = str(raw, "permissionMode", "ask"),
            includeSelectionOnSend = bool(raw, "includeSelectionOnSend", true),
            alwaysApprove = bool(raw, "alwaysApprove", false),
            locale = str(raw, "locale", "auto"),
            notifySound = bool(raw, "notifySound", true),
        )
    }

    fun save(snapshot: Snapshot) {
        val out = File(System.getProperty("user.home"), ".grok")
        out.mkdirs()
        val obj = JsonObject()
        obj.addProperty("cliPath", snapshot.cliPath)
        obj.addProperty("preferWorkspaceBinary", snapshot.preferWorkspaceBinary)
        obj.addProperty("minCliVersion", snapshot.minCliVersion)
        obj.addProperty("permissionMode", snapshot.permissionMode)
        obj.addProperty("includeSelectionOnSend", snapshot.includeSelectionOnSend)
        obj.addProperty("alwaysApprove", snapshot.alwaysApprove)
        obj.addProperty("locale", snapshot.locale)
        obj.addProperty("notifySound", snapshot.notifySound)
        val target = file()
        val tmp = File(target.path + ".tmp")
        tmp.writeText(obj.toString() + "\n", Charsets.UTF_8)
        if (target.exists()) {
            target.delete()
        }
        tmp.renameTo(target)
    }

    private fun str(obj: JsonObject, key: String, fallback: String): String {
        val el = obj.get(key) ?: return fallback
        return if (el.isJsonNull) fallback else el.asString
    }

    private fun bool(obj: JsonObject, key: String, fallback: Boolean): Boolean {
        val el = obj.get(key) ?: return fallback
        return if (el.isJsonPrimitive) el.asBoolean else fallback
    }
}
