import { Selection } from "vscode"
import { updateSelection } from "./decoration"
import { EditorState } from "./editor-state"
import {
    NodeAccessorFunction,
    LanguageDefinition,
    CommandName,
} from "./language/language-definition"
import { getOverrideFor } from "./language/language-support"
import { findNodeAtSelection } from "./utilities/tree-utilities"
import { updateStatusBar } from "./status-bar"
import { toPosition } from "./utilities/conversion-utilities"

export type CommandFunction = (editor: EditorState) => void

function movementCommand(selectNext: NodeAccessorFunction): CommandFunction {
    return (state: EditorState) => {
        const next = selectNext(state.currentNode)
        if (next) {
            state.currentNode = next
            updateSelection(state)
        }
    }
}

export function commandsForLanguage(languageDefinition: LanguageDefinition) {
    function withOverride(
        commandName: CommandName,
        defaultFunction: NodeAccessorFunction
    ): NodeAccessorFunction {
        return (node) => {
            const overrideFun = getOverrideFor(languageDefinition, commandName, node)
            if (overrideFun) {
                return overrideFun(node)
            }
            return defaultFunction(node)
        }
    }

    return {
        gotoParent: movementCommand(withOverride("gotoParent", (node) => node.parent)),
        gotoFirstChild: movementCommand(withOverride("firstChild", (node) => node.firstNamedChild)),
        gotoLastChild: movementCommand(withOverride("lastChild", (node) => node.lastNamedChild)),
        gotoNextSibling: movementCommand(
            withOverride("nextSibling", (node) => node.nextNamedSibling)
        ),
        gotoPreviousSibling: movementCommand(
            withOverride("previousSibling", (node) => node.previousNamedSibling)
        ),
    }
}

export function selectToChange(state: EditorState) {
    state.insertMode = true
    updateSelection(state)
}

export function insertBefore(state: EditorState) {
    state.insertMode = true
    const { editor, currentNode } = state
    const beforeNode = toPosition(currentNode.startPosition)
    editor.selection = new Selection(beforeNode, beforeNode)
    updateSelection(state)
}

export function insertAfter(state: EditorState) {
    state.insertMode = true
    const { editor, currentNode } = state
    const afterNode = toPosition(currentNode.endPosition)
    editor.selection = new Selection(afterNode, afterNode)
    updateSelection(state)
}

export function exitInsertMode(state: EditorState) {
    state.insertMode = false
    // TODO: should handle multiple selections
    state.currentNode = findNodeAtSelection(state.parseTree, state.editor.selection)
    updateStatusBar(state)
    updateSelection(state)
}
