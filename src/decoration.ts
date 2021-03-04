// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import {
    Disposable,
    TextEditor,
    TextEditorCursorStyle,
    TextEditorDecorationType,
    window,
    workspace,
} from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { Colors } from "./colors"
import { EditorState } from "./editor-state"
import { Extension } from "./extension"
import { toRange } from "./conversion-utilities"

function setOrResetDecorations(
    editor: TextEditor,
    decorationType: TextEditorDecorationType,
    node?: SyntaxNode
) {
    if (node) {
        editor.setDecorations(decorationType, [toRange(node)])
    } else {
        editor.setDecorations(decorationType, [])
    }
}

export function registerDecorationHandler(ext: Extension): Disposable {
    const currentDecorationType = window.createTextEditorDecorationType({
        backgroundColor: Colors.selectionBackground,
    })

    const currentLineDecorationType = window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: Colors.inactiveSelectionBackground,
    })

    function setDecorationsForNode(editor: TextEditor, node?: SyntaxNode): void {
        setOrResetDecorations(editor, currentDecorationType, node)
        setOrResetDecorations(editor, currentLineDecorationType, node)
    }

    function updateSelection(state?: EditorState): void {
        if (!state) {
            resetCursorStyle()
        } else if (state.insertMode) {
            // Clear highlight when in insert mode
            setDecorationsForNode(state.editor, undefined)
            state.editor.options.cursorStyle = TextEditorCursorStyle.Line
        } else {
            setDecorationsForNode(state.editor, state.currentNode)
            state.editor.options.cursorStyle = TextEditorCursorStyle.BlockOutline
        }
    }

    // TODO: Ideally, we would also change the decorations for inactive editors
    ext.onActiveEditorStateChange(updateSelection)

    return Disposable.from(currentDecorationType, currentLineDecorationType)
}

function resetCursorStyle() {
    const activeEditor = window.activeTextEditor
    if (activeEditor) {
        activeEditor.options.cursorStyle = workspace.getConfiguration("editor").get("cursorStyle")
    }
}
