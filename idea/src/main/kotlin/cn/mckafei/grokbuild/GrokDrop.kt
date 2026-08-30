package cn.mckafei.grokbuild

import com.intellij.ide.dnd.FileCopyPasteUtil
import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.JBColor
import java.awt.BasicStroke
import java.awt.Component
import java.awt.Dimension
import java.awt.Font
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.Point
import java.awt.RenderingHints
import java.awt.datatransfer.DataFlavor
import java.awt.datatransfer.Transferable
import java.awt.dnd.DnDConstants
import java.awt.dnd.DragSource
import java.awt.dnd.DragSourceAdapter
import java.awt.dnd.DragSourceDragEvent
import java.awt.dnd.DragSourceDropEvent
import java.awt.dnd.DragSourceMotionListener
import java.awt.dnd.DropTarget
import java.awt.dnd.DropTargetAdapter
import java.awt.dnd.DropTargetDragEvent
import java.awt.dnd.DropTargetDropEvent
import java.io.File
import java.util.Locale
import javax.swing.JComponent
import javax.swing.JLayeredPane
import javax.swing.JPanel

/** Project-view and OS file drops onto the chat panel. */
object GrokDrop {
    fun attach(content: JComponent, parent: Disposable, onPaths: (List<String>) -> Unit): JComponent {
        val glass = DropGlass()
        val layers = DropLayers(content, glass)
        install(glass, onPaths)
        watch(glass, parent)
        return layers
    }

    fun install(component: Component, onPaths: (List<String>) -> Unit) {
        DropTarget(
            component,
            DnDConstants.ACTION_COPY,
            object : DropTargetAdapter() {
                override fun dragEnter(event: DropTargetDragEvent) {
                    if (hasFiles(event.transferable)) {
                        event.acceptDrag(DnDConstants.ACTION_COPY)
                    } else {
                        event.rejectDrag()
                    }
                }

                override fun dragOver(event: DropTargetDragEvent) {
                    if (hasFiles(event.transferable)) {
                        event.acceptDrag(DnDConstants.ACTION_COPY)
                    } else {
                        event.rejectDrag()
                    }
                }

                override fun drop(event: DropTargetDropEvent) {
                    event.acceptDrop(DnDConstants.ACTION_COPY)
                    val paths = pathsFrom(event.transferable)
                    event.dropComplete(paths.isNotEmpty())
                    if (paths.isNotEmpty()) {
                        onPaths(paths)
                    }
                }
            },
            true,
        )
    }

    fun pathsFrom(transferable: Transferable): List<String> {
        val out = LinkedHashSet<String>()
        try {
            FileCopyPasteUtil.getFileList(transferable)?.forEach { file ->
                if (file.path.isNotBlank()) {
                    out.add(file.absolutePath)
                }
            }
        } catch (_: Throwable) {
        }
        if (out.isEmpty() && transferable.isDataFlavorSupported(DataFlavor.javaFileListFlavor)) {
            try {
                val files = transferable.getTransferData(DataFlavor.javaFileListFlavor) as? List<*>
                files?.filterIsInstance<File>()?.forEach { file ->
                    out.add(file.absolutePath)
                }
            } catch (_: Throwable) {
            }
        }
        if (out.isEmpty() && transferable.isDataFlavorSupported(DataFlavor.stringFlavor)) {
            try {
                val text = transferable.getTransferData(DataFlavor.stringFlavor) as? String
                text?.lineSequence()?.map { it.trim() }?.filter { it.isNotEmpty() }?.forEach { line ->
                    pathFromLine(line)?.let { out.add(it) }
                }
            } catch (_: Throwable) {
            }
        }
        return out.toList()
    }

    private fun watch(glass: DropGlass, parent: Disposable) {
        val source = DragSource.getDefaultDragSource()
        val motion = DragSourceMotionListener { event ->
            glass.armed = hasFiles(event.dragSourceContext.transferable) &&
                isOver(glass, event.location)
        }
        val end = object : DragSourceAdapter() {
            override fun dragEnter(event: DragSourceDragEvent) {
                glass.armed = hasFiles(event.dragSourceContext.transferable) &&
                    isOver(glass, event.location)
            }

            override fun dragDropEnd(event: DragSourceDropEvent) {
                glass.armed = false
            }
        }
        source.addDragSourceMotionListener(motion)
        source.addDragSourceListener(end)
        Disposer.register(parent) {
            source.removeDragSourceMotionListener(motion)
            source.removeDragSourceListener(end)
            glass.armed = false
        }
    }

    private fun hasFiles(transferable: Transferable): Boolean {
        return try {
            FileCopyPasteUtil.isFileListFlavorAvailable(transferable.transferDataFlavors) ||
                transferable.isDataFlavorSupported(DataFlavor.javaFileListFlavor)
        } catch (_: Throwable) {
            false
        }
    }

    private fun isOver(component: Component, screen: Point): Boolean {
        if (!component.isShowing) {
            return false
        }
        return try {
            val origin = component.locationOnScreen
            screen.x >= origin.x &&
                screen.x < origin.x + component.width &&
                screen.y >= origin.y &&
                screen.y < origin.y + component.height
        } catch (_: Throwable) {
            false
        }
    }

    private fun pathFromLine(line: String): String? {
        val path = when {
            line.startsWith("file:") -> {
                val stripped = line.removePrefix("file://").removePrefix("/")
                if (stripped.length >= 2 && stripped[1] == ':') stripped else line.removePrefix("file://")
            }
            else -> line
        }
        return path.takeIf {
            it.contains('\\') || it.startsWith("/") || (it.length >= 2 && it[1] == ':')
        }
    }
}

private class DropLayers(
    private val content: JComponent,
    glass: JComponent,
) : JLayeredPane() {
    init {
        add(content, Integer.valueOf(DEFAULT_LAYER))
        add(glass, Integer.valueOf(DRAG_LAYER))
    }

    override fun doLayout() {
        val w = width
        val h = height
        for (child in components) {
            child.setBounds(0, 0, w, h)
        }
    }

    override fun getPreferredSize(): Dimension = content.preferredSize
}

/** Invisible unless a file drag is over the chat; then it intercepts the drop. */
private class DropGlass : JPanel() {
    var armed: Boolean = false
        set(value) {
            if (field == value) {
                return
            }
            field = value
            repaint()
        }

    init {
        isOpaque = false
        isVisible = true
    }

    override fun contains(x: Int, y: Int): Boolean = armed

    override fun paintComponent(g: Graphics) {
        if (!armed) {
            return
        }
        val g2 = g.create() as Graphics2D
        try {
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON)
            g2.color = JBColor(java.awt.Color(0, 0, 0, 88), java.awt.Color(0, 0, 0, 120))
            g2.fillRoundRect(8, 8, width - 16, height - 16, 12, 12)
            g2.color = JBColor(java.awt.Color(0x2B, 0x8C, 0xCE), java.awt.Color(0x7A, 0xD4, 0xFF))
            g2.stroke = BasicStroke(1.5f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 8f, floatArrayOf(6f, 4f), 0f)
            g2.drawRoundRect(8, 8, width - 16, height - 16, 12, 12)
            val zh = Locale.getDefault().language.startsWith("zh")
            val text = if (zh) "拖入文件以引用" else "Drop files to attach"
            g2.font = font.deriveFont(Font.BOLD, 13f)
            val fm = g2.fontMetrics
            g2.drawString(text, (width - fm.stringWidth(text)) / 2, (height + fm.ascent - fm.descent) / 2)
        } finally {
            g2.dispose()
        }
    }
}
