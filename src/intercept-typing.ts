import { TextEditor, TextEditorEdit } from "vscode"
import * as vscode from "vscode"
import { EditorStateChange } from "./extension"
import { EditorState } from "./editor-state"

export function interceptTypeCommand(
    activeState: Readonly<EditorState> | undefined,
    _editor: TextEditor,
    _edit: TextEditorEdit,
    args: { text: string }
): EditorStateChange | undefined {
    const key = args.text

    if (activeState === undefined || activeState.insertMode) {
        vscode.commands.executeCommand("default:type", args)
    }
    return
}
