import { TextEditor, TextEditorEdit } from "vscode";
import { CommandFunction, commandsForLanguage } from "./commands";
import * as vscode from 'vscode';
import { getLanguageDefinition, isLanguageSupported } from "./language/language-support";
import { updateStatusBar } from "./status-bar";
import { updateSelection } from "./decoration";
import { activeEditorState } from "./activation";
import { EditorState } from "./editor-state";

export function interceptTypeCommand(editor: TextEditor, _: TextEditorEdit, args: { text: string }) {
    const key = args.text;

    const languageId = editor.document.languageId;
    const state = activeEditorState;
    if (!isLanguageSupported(languageId) || (state && state.insertMode)) {
        vscode.commands.executeCommand('default:type', args);
        return;
    }
    if (!state) {
        throw new Error('Unexpected: No editor state for this editor.');
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
        command(state);
        updateSelection(state);
        updateStatusBar(state);
    }
}

function enterInsertMode(state: EditorState) {
    state.insertMode = true;
    updateStatusBar(state);
}

export function exitInsertMode() {
    if (activeEditorState) {
        activeEditorState.insertMode = false;
        updateStatusBar(activeEditorState);
    }
}
