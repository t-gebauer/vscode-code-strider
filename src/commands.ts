import { TextEditor, TextEditorDecorationType, window } from 'vscode';
import { SyntaxNode } from 'web-tree-sitter';
import { getState, isLanguageSupported, State } from './activation';
import { statusBar } from './status-bar';
import { toRange } from './utilities';

// Common functionality for all commands
function wrapCommand(actualCommand: (state: State, editor: TextEditor) => void): (editor: TextEditor) => void {
    return (editor: TextEditor) => {
        if (!isLanguageSupported(editor.document.languageId)) { return; }

        const state = getState(editor.document.fileName);
        actualCommand(state, editor);

        statusBar.updateNodeType(state.currentNode.type);
    };
}

function movementCommand(selectNext: (node: SyntaxNode) => SyntaxNode | null): (editor: TextEditor) => void {
    return wrapCommand((state: State, editor: TextEditor) => {
        const node = state.currentNode;
        if (!node) { return; }

        const next = selectNext(node);
        if (next) {
            state.currentNode = next;
            selectNode(editor, next);
        }
    });
}

const gotoParent = movementCommand((node) => node.parent);
const gotoFirstChild = movementCommand((node) => node.firstNamedChild);
const gotoNextSibling = movementCommand((node) => node.nextNamedSibling);
const gotoPreviousSibling = movementCommand((node) => node.previousNamedSibling);
export const commands = { gotoParent, gotoFirstChild, gotoNextSibling, gotoPreviousSibling };

// TODO: dispose the decoration type?
const currentDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#555"
});

const firstChildDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#533"
});

const nextDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#338"
});

const previousDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#484"
});

function setOrResetDecorations(editor: TextEditor, decorationType: TextEditorDecorationType, node: SyntaxNode | null) {
    if (node) {
        editor.setDecorations(decorationType, [toRange(node)]);
    } else {
        editor.setDecorations(decorationType, []);
    }
}

export function selectNode(editor: TextEditor, node: SyntaxNode): void {
    //setOrResetDecorations(editor, parentDecorationType, node.parent);
    //setOrResetDecorations(editor, nextDecorationType, node.nextNamedSibling);
    //setOrResetDecorations(editor, previousDecorationType, node.previousNamedSibling);
    //setOrResetDecorations(editor, firstChildDecorationType, node.firstNamedChild);
    //editor.selection = toSelection(node);
    editor.setDecorations(currentDecorationType, [toRange(node)]);
}