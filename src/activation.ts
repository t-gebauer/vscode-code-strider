import { TextDocument, TextEditor } from "vscode";
import * as Parser from 'web-tree-sitter';
import { SyntaxNode } from "web-tree-sitter";
import { showAST } from "./ast-view";

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
            const parser = new Parser();
            parser.setLanguage(await loadTreeSitterLanguage(languageId));
            const tree = parser.parse(textEditor.document.getText());
            state = {
                parser,
                tree,
                currentNode: tree.rootNode,
                document: textEditor.document
            };
            stateMap.set(fileName, state);
        }

        showAST(textEditor.document.fileName);
    }
}