import { TextEditor, TextEditorDecorationType, window } from 'vscode';
import { SyntaxNode } from 'web-tree-sitter';
import { getState } from './activation';
import { toRange } from './utilities';

export function movementCommand(handler: (node: SyntaxNode) => SyntaxNode | null): (editor: TextEditor) => void {
    return (editor) => {
        const state = getState(editor.document.fileName);

        const node = state.currentNode;
        if (!node) {
            return;
        }

        const next = handler(node);
        if (next) {
            state.currentNode = next;
            selectNode(editor, next);
        }
    };
}

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
    window.showInformationMessage(node.type);
    //setOrResetDecorations(editor, parentDecorationType, node.parent);
    //setOrResetDecorations(editor, nextDecorationType, node.nextNamedSibling);
    //setOrResetDecorations(editor, previousDecorationType, node.previousNamedSibling);
    //setOrResetDecorations(editor, firstChildDecorationType, node.firstNamedChild);
    //editor.selection = toSelection(node);
    editor.setDecorations(currentDecorationType, [toRange(node)]);
}