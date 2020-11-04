import * as fs from "fs";
import { TextDocument, TextEditor } from "vscode";
import * as Parser from 'web-tree-sitter';
import { SyntaxNode } from "web-tree-sitter";
import { showAST } from "./ast-view";
import { selectNode } from "./commands";
import { extensionContext } from "./extension";

export interface State {
    currentNode: SyntaxNode;
    parser: Parser;
    tree: Parser.Tree;
    document: TextDocument;
}
// State per open file (parse tree caching, incremental parsing)
const stateMap = new Map<string, State>();

// Will throw an error if the language is not supported!
export function getState(fileName: string): State {
    const state = stateMap.get(fileName);
    if (!state) {
        // A state should have already been initialized for this file, on the editor-change event.
        throw new Error(`No state initialized for file '${fileName}'`);
    }
    return state;
}

export function isLanguageSupported(languageId: string): boolean {
    return languageId === 'javascript' || languageId === 'html';
}

function loadTreeSitterLanguage(languageId: string): Promise<Parser.Language> {
    const wasmFilePath = extensionContext.asAbsolutePath(`./wasm/tree-sitter-${languageId}.wasm`);
    if (!fs.existsSync(wasmFilePath)) {
        throw new Error(`Missing parser for language '${languageId}'. The file '${wasmFilePath}' does not exist.`);
    }
    return Parser.Language.load(wasmFilePath);
}

export async function handleEditorChange(editor: TextEditor | undefined) {
    if (!editor) {
        return;
    }

    const languageId = editor.document.languageId;
    console.log('Editor change: ' + languageId);
    if (!isLanguageSupported(languageId)) {
        return;
    }

    await Parser.init();

    const fileName = editor.document.fileName;
    const state = stateMap.get(fileName) || await createNewState(editor);
    selectNode(editor, state.currentNode);
    showAST(editor.document.fileName);
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