import { TextEditor, TextEditorEdit } from "vscode";
import { CommandFunction, commands } from "./commands";
import * as vscode from 'vscode';

function shouldInsertText(): boolean {
    return false; // TODO implement
}

export function interceptTypeCommand(editor: TextEditor, _: TextEditorEdit, args: { text: string }) {
    const key = args.text;

    if (shouldInsertText()) {
        vscode.commands.executeCommand('default:type', args);
    }

    // With lack of external configuration options, let's just use a simple switch case statement here...
    // Neo2 mapping :/
    const commandConfig: { [key: string]: CommandFunction } = {
        'h': commands.gotoParent,
        'f': commands.gotoFirstChild,
        'g': commands.gotoPreviousSibling,
        'r': commands.gotoNextSibling,
    };

    const command = commandConfig[key];
    if (command) {
        command(editor);
    }
}