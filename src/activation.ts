import { TextDocument, TextEditor } from "vscode";
import * as Parser from 'web-tree-sitter';
import { SyntaxNode } from "web-tree-sitter";
import { showAST } from "./ast-view";
import { selectNode } from "./commands";

interface State {
    currentNode: SyntaxNode;
    parser: Parser;
    tree: Parser.Tree;
    document: TextDocument;
}
const stateMap = new Map<string, State>();

export function getState(fileName: string): State {
    // TODO: handle this better?
    // We can make this non-null assertion here, because we know that a parser has
    // already been initialised for any editor on editor change.
    const state = stateMap.get(fileName);
    if (!state) {
        console.error('State not initialized!');
    }
    return state!!;
}

function canHandleThisLanguage(languageId: string): boolean {
    return languageId === 'javascript' || languageId === 'html';
}

function loadTreeSitterLanguage(languageId: string) {
    switch (languageId) {
        case 'javascript':
        case 'html':
        default:
            return Parser.Language.load(`./wasm/tree-sitter-${languageId}.wasm`);
    }
}

export async function handleEditorChange(textEditor: TextEditor | undefined) {
    if (!textEditor) {
        return;
    }

    console.log('Editor change: ' + textEditor?.document.languageId);
    const languageId = textEditor.document.languageId;

    if (canHandleThisLanguage(languageId)) {
        await Parser.init();

        const fileName = textEditor.document.fileName;
        let state = stateMap.get(fileName);
        if (!state) {
            state = await createNewState(textEditor);
        }

        selectNode(textEditor, state.currentNode);
        showAST(textEditor.document.fileName);
    }
}

async function createNewState(editor: TextEditor) {
    const languageId = editor.document.languageId;
    const fileName = editor.document.fileName;

    const parser = new Parser();
    parser.setLanguage(await loadTreeSitterLanguage(languageId));
    const tree = parser.parse(editor.document.getText());

    const initialNode = tree.rootNode.firstNamedChild || tree.rootNode;

    const state = {
        parser,
        tree,
        currentNode: initialNode,
        document: editor.document
    };
    stateMap.set(fileName, state);
    return state;
}