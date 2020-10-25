import { cursorTo } from 'readline';
import { CodeAction, Position, Range, Selection, TextEditor, TextEditorDecorationType, TextEditorSelectionChangeEvent, TreeItem, window } from 'vscode';
import { downloadAndUnzipVSCode } from 'vscode-test';
import * as Parser from 'web-tree-sitter';
import { SyntaxNode } from 'web-tree-sitter';

var currentNode: SyntaxNode | null = null;

export function initEditor(editor: TextEditor) {}

export function nextSibling(editor: TextEditor) {
    const node = currentNode;
    if (!node) {
        return;
    }

    const next = node.nextNamedSibling;
    if (next) {
        selectNode(editor, next);
        currentNode = next;
    }
}

export function previousSibling(editor: TextEditor) {
    const node = currentNode;
    if (!node) {
        return;
    }

    const next = node.previousNamedSibling;
    if (next) {
        selectNode(editor, next);
        currentNode = next;
    }
}

export function gotoParent(editor: TextEditor) {
    if (!currentNode) {
        return;
    }
    const next = currentNode.parent;
    if (next) {
        selectNode(editor, next);
        currentNode = next;
    }
}

export function gotoFirstChild(editor: TextEditor) {
    if (!currentNode) {
        return;
    }
    const next = currentNode.firstNamedChild;
    if (next) {
        selectNode(editor, next);
        currentNode = next;
    }
}

const currentDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#555"
});

const firstChildDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#533"
});

const parentDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#aaa"
});

const nextDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#338"
});

const previousDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#484"
});

function toSelection(node: SyntaxNode): Selection {
    return new Selection(
        new Position(node.startPosition.row, node.startPosition.column),
        new Position(node.endPosition.row, node.endPosition.column));
}

function toRange(node: SyntaxNode): Range {
    return toSelection(node);
}

function setOrResetDecorations(editor: TextEditor, decorationType: TextEditorDecorationType, node: SyntaxNode | null) {
    if (node) {
        editor.setDecorations(decorationType, [toRange(node)]);
    } else {
        editor.setDecorations(decorationType, []);
    }
}

function selectNode(editor: TextEditor, node: SyntaxNode): void {
    window.showInformationMessage(node.type);
    //setOrResetDecorations(editor, parentDecorationType, node.parent);
    setOrResetDecorations(editor, nextDecorationType, node.nextNamedSibling);
    setOrResetDecorations(editor, previousDecorationType, node.previousNamedSibling);
    setOrResetDecorations(editor, firstChildDecorationType, node.firstNamedChild);
    //editor.selection = toSelection(node);
    editor.setDecorations(currentDecorationType, [toRange(node)]);
}

async function initParser(): Promise<Parser> {
    await Parser.init();
    const parser = new Parser();

    const js = await Parser.Language.load('./wasm/tree-sitter-javascript.wasm');
    parser.setLanguage(js);
    return parser;
}

export async function parseJS(source: string) {
    const parser = await initParser();
    const tree = parser.parse(source);
    //console.log(tree.rootNode.toString());

    currentNode = tree.rootNode.firstNamedChild;
    console.log(currentNode);
}



/// TODO: Abstractions!


export interface LanguageModule {
    parse(source: string): void;
};

export class JavaScriptModule implements LanguageModule {

    parse(source: string): void {

    }

};