import { TextEditor, TextEditorDecorationType, window } from "vscode";
import { SyntaxNode } from "web-tree-sitter";
import { EditorState } from "./editor-state";
import { toRange, toSelection } from "./utilities";

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
    editor.selection = toSelection(node);
    editor.setDecorations(currentDecorationType, [toRange(node)]);
}

export function updateSelection(state: EditorState): void {
    selectNode(state.editor, state.currentNode);
}