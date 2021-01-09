import * as vscode from "vscode"
import { Selection, TextEditor, TextEditorEdit } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { EditorStateChange, logger } from "./extension"
import { toPosition, toRange } from "./utilities/conversion-utilities"
import { findNodeAtSelection } from "./utilities/tree-utilities"

export function insertOnNewLineAbove(
    state: Readonly<EditorState>,
    textEditor: TextEditor
): EditorStateChange {
    const firstLine = toPosition(state.currentNode.startPosition)
    textEditor.selection = new Selection(firstLine, firstLine)
    vscode.commands.executeCommand("editor.action.insertLineBefore")
    return {
        insertMode: true,
    }
}

export function insertOnNewLineBelow(_: Readonly<EditorState>): EditorStateChange {
    vscode.commands.executeCommand("editor.action.insertLineAfter")
    return {
        insertMode: true,
    }
}

export function deleteAndInsert(_: Readonly<EditorState>): EditorStateChange {
    vscode.commands.executeCommand("deleteLeft")
    return {
        insertMode: true,
    }
}

export function insertBefore(state: Readonly<EditorState>) {
    const { editor, currentNode } = state
    const beforeNode = toPosition(currentNode.startPosition)
    editor.selection = new Selection(beforeNode, beforeNode)
    return {
        insertMode: true,
    }
}

export function insertAfter(state: Readonly<EditorState>): EditorStateChange {
    const { editor, currentNode } = state
    const afterNode = toPosition(currentNode.endPosition)
    editor.selection = new Selection(afterNode, afterNode)
    return {
        insertMode: true,
    }
}

export function exitInsertMode(state: Readonly<EditorState>): EditorStateChange {
    return {
        insertMode: false,
        currentNode: findNodeAtSelection(state.parseTree, state.editor.selection),
    }
}

export function undoEdit(_: Readonly<EditorState>): EditorStateChange {
    vscode.commands.executeCommand("undo")
    return {}
}

export function backToPreviousSelection(_: Readonly<EditorState>): EditorStateChange {
    return {
        backToPreviousNode: true,
    }
}

export const goToFirstChild = repeatUntilVisuallyChanged((node) => node.firstNamedChild)
export const goToLastChild = repeatUntilVisuallyChanged((node) => node.lastNamedChild)
export const goToParent = repeatUntilVisuallyChanged(node => node.parent)

// Ignore nodes which take the same space as the original node
function repeatUntilVisuallyChanged(fn: (node: SyntaxNode) => SyntaxNode | null | undefined) {
    return function (state: Readonly<EditorState>): EditorStateChange {
        let nextNode: SyntaxNode | null | undefined = state.currentNode
        do {
            nextNode = fn(nextNode)
        } while (nextNode && toRange(nextNode).isEqual(toRange(state.currentNode)))
        return {
            currentNode: nextNode || undefined,
        }
    }
}

export function greedyDelete(
    state: Readonly<EditorState>,
    _editor: TextEditor,
    edit: TextEditorEdit
): EditorStateChange {
    const { currentNode } = state
    const previousNode = currentNode.previousNamedSibling
    const nextNode = currentNode.nextNamedSibling
    const startPosition = currentNode.startPosition
    const endPosition = nextNode?.startPosition ?? currentNode.endPosition
    // The edit-builder will trigger a text document change event, but only after this command is completely processed.
    edit.delete(new vscode.Range(toPosition(startPosition), toPosition(endPosition)))
    return {
        // TODO: this only works well, if the previous node is defined.
        currentNode: previousNode ?? currentNode,
    }
}

export function raise(
    state: Readonly<EditorState>,
    editor: TextEditor,
    edit: TextEditorEdit
): EditorStateChange {
    const { currentNode } = state
    const parent = currentNode.parent
    if (parent) {
        edit.replace(toRange(parent), currentNode.text)
        return { currentNode: parent }
    } else {
        return {}
    }
}
