import { TextEditor, TextEditorEdit } from "vscode"
import {
    CommandFunction,
    commandsForLanguage,
    insertAfter,
    insertBefore,
    deleteAndInsert,
} from "./commands"
import * as vscode from "vscode"
import { Languages } from "./language/language-support"
import { EditorStateChange } from "./extension"
import { EditorState } from "./editor-state"

export function interceptTypeCommand(
    activeState: Readonly<EditorState> | undefined,
    editor: TextEditor,
    _: TextEditorEdit,
    args: { text: string }
): EditorStateChange | undefined {
    const key = args.text

    if (activeState === undefined || activeState.insertMode) {
        vscode.commands.executeCommand("default:type", args)
        return
    }

    const languageId = editor.document.languageId
    const languageDefinition = Languages.getDefinition(languageId)
    const commands = commandsForLanguage(languageDefinition)

    // With lack of external configuration options, let's just use a simple switch case statement here...
    // Neo2 mapping :/
    const commandConfig: { [key: string]: CommandFunction } = {
        // Movement
        p: commands.gotoParent,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        F: commands.gotoLastChild,
        // Edit
        i: insertBefore,
        e: insertAfter,
        //'l': insertAbove,
        //'a': insertBelow,
        c: deleteAndInsert,
    }

    const command = commandConfig[key]
    if (command) {
        const change = command(activeState)
        return change
    }
}
