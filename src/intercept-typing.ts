import { TextEditor, TextEditorEdit } from "vscode"
import {
    CommandFunction,
    commandsForLanguage,
    deleteSelection,
    insertAfter,
    insertBefore,
    selectToChange,
    undoEdit,
} from "./commands"
import * as vscode from "vscode"
import { Languages } from "./language/language-support"
import { EditorStateChange } from "./extension"
import { EditorState } from "./editor-state"

export function interceptTypeCommand(
    activeState: EditorState,
    editor: TextEditor,
    _: TextEditorEdit,
    args: { text: string }
): EditorStateChange | undefined {
    const key = args.text

    const languageId = editor.document.languageId
    if (!Languages.isSupported(languageId) || activeState.insertMode) {
        vscode.commands.executeCommand("default:type", args)
        return
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
        //
        // Edit
        i: insertBefore,
        e: insertAfter,
        //'l': insertAbove,
        //'a': insertBelow,
        c: selectToChange,
        d: deleteSelection,
        u: undoEdit,
    }

    const command = commandConfig[key]
    if (command) {
        const change = command(activeState)
        return change
    }
}
