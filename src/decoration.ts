import {
    Disposable,
    TextEditor,
    TextEditorCursorStyle,
    TextEditorDecorationType,
    window,
} from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { Colors } from "./colors"
import { EditorState } from "./editor-state"
import { Extension } from "./extension"
import { toRange, toSelection } from "./utilities/conversion-utilities"


function setOrResetDecorations(
    editor: TextEditor,
    decorationType: TextEditorDecorationType,
    node: SyntaxNode | null
) {
    if (node) {
        editor.setDecorations(decorationType, [toRange(node)])
    } else {
        editor.setDecorations(decorationType, [])
    }
}

export function registerDecorationHandler(ext: Extension): Disposable {
    const currentDecorationType = window.createTextEditorDecorationType({
        backgroundColor: Colors.inactiveSelectionBackground,
    })

    function setDecorationsForNode(editor: TextEditor, node: SyntaxNode | null): void {
        setOrResetDecorations(editor, currentDecorationType, node)
    }

    function updateSelection(state?: EditorState): void {
        if (!state) return
        const { editor } = state
        if (state.insertMode) {
            // Clear highlight when in insert mode
            setDecorationsForNode(editor, null)
            editor.options.cursorStyle = TextEditorCursorStyle.Line
        } else {
            setDecorationsForNode(editor, state.currentNode)
            editor.selection = toSelection(state.currentNode)
            editor.options.cursorStyle = TextEditorCursorStyle.Block
        }
    }

    // TODO: Ideally, we would also change the decorations for inactive editors
    ext.onActiveEditorStateChange(updateSelection)

    return Disposable.from(currentDecorationType)
}
