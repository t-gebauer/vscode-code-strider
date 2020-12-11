import { TextEditor, TextEditorEdit } from "vscode"
import {
    CommandFunction,
    commandsForLanguage,
    insertAfter,
    insertBefore,
    selectToChange,
} from "./commands"
import * as vscode from "vscode"
import { updateStatusBar } from "./status-bar"
import { activeEditorState } from "./activation"
import { toRange } from "./utilities/conversion-utilities"
import { Languages } from "./language/language-support"

export function interceptTypeCommand(
    editor: TextEditor,
    _: TextEditorEdit,
    args: { text: string }
) {
    const key = args.text

    const languageId = editor.document.languageId
    const state = activeEditorState
    if (!Languages.isSupported(languageId) || (state && state.insertMode)) {
        vscode.commands.executeCommand("default:type", args)
        return
    }
    if (!state) {
        throw new Error("Unexpected: No editor state for this editor.")
    }

    const languageDefinition = Languages.getDefinition(languageId)
    const commands = commandsForLanguage(languageDefinition)

    // With lack of external configuration options, let's just use a simple switch case statement here...
    // Neo2 mapping :/
    const commandConfig: { [key: string]: CommandFunction } = {
        // Movement
        h: commands.gotoParent,
        f: commands.gotoFirstChild,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        F: commands.gotoLastChild,
        g: commands.gotoPreviousSibling,
        r: commands.gotoNextSibling,
        n: commands.gotoPreviousSibling,
        t: commands.gotoNextSibling,
        //'g': commands.moveUp,
        //'r': commands.moveDown,
        //'n': commands.moveLeft,
        //'t': commands.moveRight,
        // Edit
        i: insertBefore,
        e: insertAfter,
        //'l': insertAbove,
        //'a': insertBelow,
        c: selectToChange,
    }

    const command = commandConfig[key]
    if (command) {
        command(state)
        state.editor.revealRange(
            toRange(state.currentNode),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport
        )
        updateStatusBar(state)
        state.astView?.updateSelectedNode(state.currentNode)
    }
}
