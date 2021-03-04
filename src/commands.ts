// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import * as vscode from "vscode"
import { Selection, TextEditor, TextEditorEdit } from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"
import { toPosition, toRange, toSimpleRange } from "./conversion-utilities"
import { nextChild, nextSibling } from "./lib/node-utilities"
import { findNodeAtSelection } from "./lib/tree-utilities"

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
        currentNode: findNodeAtSelection(state.parseTree, toSimpleRange(state.editor.selection)),
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
export const goToParent = repeatUntilVisuallyChanged((node) => node.parent)

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

function slurpNext(
    state: Readonly<EditorState>,
    edit: TextEditorEdit,
    forward = true
): EditorStateChange {
    const { currentNode } = state
    const sibling = nextSibling(currentNode, forward)
    const child = nextChild(currentNode, !forward)
    if (!(child && sibling)) return {}
    console.log(sibling?.text)
    console.log(child.text)
    edit.delete(toRange(sibling))
    edit.insert(toPosition(forward ? child.startPosition : child.endPosition), sibling.text)
    return {}
}

export function slurpLeft(
    state: Readonly<EditorState>,
    editor: TextEditor,
    edit: TextEditorEdit
): EditorStateChange {
    return slurpNext(state, edit, false)
}

export function slurpRight(
    state: Readonly<EditorState>,
    editor: TextEditor,
    edit: TextEditorEdit
): EditorStateChange {
    return slurpNext(state, edit, true)
}

function barfNext(
    state: Readonly<EditorState>,
    editor: TextEditor,
    edit: TextEditorEdit,
    forward = true
): EditorStateChange {
    const { currentNode: current } = state
    const child = nextChild(current, !forward)
    if (!child) return {}
    const sibling = nextSibling(child, !forward)
    if (!sibling) return {}
    edit.delete(toRange(sibling))
    edit.replace(toPosition(forward ? current.endPosition : current.startPosition), sibling.text)
    // TODO: selections should always be around the original node on its new position
    editor.selection = new Selection(
        toPosition(forward ? current.startPosition : current.endPosition),
        toPosition(forward ? sibling.endPosition : sibling.startPosition)
    )
    return {}
}

export function barfLeft(
    state: Readonly<EditorState>,
    editor: TextEditor,
    edit: TextEditorEdit
): EditorStateChange {
    return barfNext(state, editor, edit, false)
}

export function barfRight(
    state: Readonly<EditorState>,
    editor: TextEditor,
    edit: TextEditorEdit
): EditorStateChange {
    return barfNext(state, editor, edit, true)
}
