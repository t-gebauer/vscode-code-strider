import { TextEditor, TextEditorEdit } from "vscode";
import { CommandFunction, commandsForLanguage } from "./commands";
import * as vscode from 'vscode';
import { getLanguageDefinition, isLanguageSupported } from "./language/language-support";
import { statusBar } from "./status-bar";

let inInsertMode = false;

export function interceptTypeCommand(editor: TextEditor, _: TextEditorEdit, args: { text: string }) {
    const key = args.text;

    const languageId = editor.document.languageId;
    if (!isLanguageSupported(languageId) || inInsertMode) {
        console.log(key);
        
        vscode.commands.executeCommand('default:type', args);
        return;
    }

    const languageDefinition = getLanguageDefinition(languageId);
    const commands = commandsForLanguage(languageDefinition);

    // With lack of external configuration options, let's just use a simple switch case statement here...
    // Neo2 mapping :/
    const commandConfig: { [key: string]: CommandFunction } = {
        'h': commands.gotoParent,
        'f': commands.gotoFirstChild,
        'g': commands.gotoPreviousSibling,
        'r': commands.gotoNextSibling,
        'i': enterInsertMode,
    };

    const command = commandConfig[key];
    if (command) {
        command(editor);
    }
}

function enterInsertMode() {
    inInsertMode = true;
    statusBar.updateMode('INSERT');
}

export function exitInsertMode() {
    inInsertMode = false;
    statusBar.updateMode('STRUCT');
}