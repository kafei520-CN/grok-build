package cn.mckafei.grokbuild

import com.intellij.openapi.editor.colors.EditorColorsManager
import com.intellij.ui.JBColor
import com.intellij.util.ui.JBUI
import com.intellij.util.ui.UIUtil
import java.awt.Color
import javax.swing.UIManager

/** Map IntelliJ LAF colors onto the --vscode-* variables the shared CSS expects. */
object GrokTheme {
    fun isDark(): Boolean = !JBColor.isBright()

    fun cssVariables(): Map<String, String> {
        val scheme = EditorColorsManager.getInstance().globalScheme
        val fg = color("Label.foreground", UIUtil.getLabelForeground())
        val bg = color("ToolWindow.background", UIUtil.getPanelBackground())
        val editorBg = scheme.defaultBackground
        val muted = color("Label.infoForeground", UIUtil.getContextHelpForeground())
        val link = JBUI.CurrentTheme.Link.Foreground.ENABLED
        val error = color("Label.errorForeground", JBColor.RED)
        val uiFont = UIUtil.getLabelFont().family
        val editorFont = scheme.editorFontName
        return mapOf(
            "--vscode-foreground" to hex(fg),
            "--vscode-descriptionForeground" to hex(muted),
            "--vscode-sideBar-background" to hex(bg),
            "--vscode-editor-background" to hex(editorBg),
            "--vscode-textLink-foreground" to hex(link),
            "--vscode-errorForeground" to hex(error),
            "--vscode-font-family" to cssFont(uiFont),
            "--vscode-editor-font-family" to cssFont(editorFont),
        )
    }

    fun styleTag(): String {
        val body = cssVariables().entries.joinToString("\n") { (k, v) -> "        $k: $v;" }
        val scheme = if (isDark()) "dark" else "light"
        return """
            <style id="grok-idea-theme">
              :root {
            $body
              }
              html { color-scheme: $scheme; }
            </style>
        """.trimIndent()
    }

    fun applyJs(): String {
        val entries = cssVariables().entries.joinToString(",") { (k, v) ->
            "'$k':${jsString(v)}"
        }
        val scheme = if (isDark()) "dark" else "light"
        return """
            (function(){
              var vars = {$entries};
              var root = document.documentElement;
              Object.keys(vars).forEach(function(k){ root.style.setProperty(k, vars[k]); });
              root.style.colorScheme = '$scheme';
            })();
        """.trimIndent()
    }

    private fun color(key: String, fallback: Color): Color =
        UIManager.getColor(key) ?: fallback

    private fun hex(color: Color): String =
        String.format("#%02x%02x%02x", color.red, color.green, color.blue)

    private fun cssFont(name: String): String {
        val clean = name.trim().trim('"', '\'')
        return "\"$clean\", sans-serif"
    }

    private fun jsString(value: String): String =
        "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"
}
