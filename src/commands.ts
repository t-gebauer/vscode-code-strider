import { Selection } from "vscode"
import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"
import {
    CommandName, LanguageDefinition, NodeAccessorFunction
} from "./language/language-definition"
import { Languages } from "./language/language-support"
import { toPosition } from "./utilities/conversion-utilities"
import { findNodeAtSelection } from "./utilities/tree-utilities"

export type CommandFunction = (editor: Readonly<EditorState>) => EditorStateChange | undefined

function movementCommand(selectNext: NodeAccessorFunction): CommandFunction {
    return (state: Readonly<EditorState>): EditorStateChange | undefined => {
        const next = selectNext(state.currentNode)
        if (next) {
            return { currentNode: next }
        }
    }
}

export function commandsForLanguage(languageDefinition: LanguageDefinition) {
    function withOverride(
        commandName: CommandName,
        defaultFunction: NodeAccessorFunction
    ): NodeAccessorFunction {
        return (node) => {
            const overrideFun = Languages.getOverrideFor(languageDefinition, commandName, node)
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

export function selectToChange(_: Readonly<EditorState>): EditorStateChange {
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
    // TODO: should handle multiple selections
    return {
        insertMode: false,
        currentNode: findNodeAtSelection(state.parseTree, state.editor.selection),
    }
}
