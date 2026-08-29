package cn.mckafei.grokbuild

/**
 * IntelliJ 2026.2 moved JCEF out of platform into the bundled Web Browser (JCEF) plugin.
 * Probe through the plugin classloader and treat a missing class as unsupported.
 */
object GrokJcef {
    const val MISSING_HTML =
        "<html>Grok Build needs the JCEF embedded browser.<br>" +
            "Enable the bundled plugin <b>Web Browser (JCEF)</b> and restart IntelliJ.<br>" +
            "需要 JCEF 嵌入式浏览器：请启用捆绑插件 “Web Browser (JCEF)” 后重启。</html>"

    @Volatile
    private var prepared = false

    /**
     * Out-of-process JCEF makes executeJavaScript / JSQuery hitch (IJPL-227507).
     * Set before the first JBCefApp use; ignored if JCEF is already running.
     */
    fun prepare() {
        if (prepared) {
            return
        }
        prepared = true
        try {
            if (System.getProperty("ide.browser.jcef.out-of-process.enabled") == null) {
                System.setProperty("ide.browser.jcef.out-of-process.enabled", "false")
            }
        } catch (_: Throwable) {
        }
    }

    fun isSupported(): Boolean {
        prepare()
        return try {
            val cls = Class.forName("com.intellij.ui.jcef.JBCefApp")
            val method = cls.getMethod("isSupported")
            method.invoke(null) as? Boolean ?: false
        } catch (_: Throwable) {
            false
        }
    }
}
