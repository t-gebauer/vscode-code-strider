import { TextDocument, TextEditor, window } from "vscode";
import * as Parser from 'web-tree-sitter';
import { showAST } from "./ast-view";
import { setDecorationsForNode } from "./decoration";
import { EditorState } from "./editor-state";
import { isLanguageSupported } from "./language/language-support";
import { statusBar, updateStatusBar } from "./status-bar";
import { loadTreeSitterLanguage } from "./utilities";

export async function initializeParser() {
    // This is so fast on my machine, that it is barely noticeable.
    statusBar.setText('Initializing Parser...');
    await Parser.init();
    statusBar.setText('');

    window.onDidChangeActiveTextEditor(handleEditorChange);
    handleEditorChange(window.activeTextEditor);
}

// State per open file (parse tree caching, incremental parsing)
const parseTrees = new Map<TextDocument, Parser.Tree>();
// State per open editor (cursor position, node selection, decoration)
const editorStates = new Map<TextEditor, EditorState>();

export let activeEditorState: EditorState | null;

async function handleEditorChange(editor: TextEditor | undefined) {
    const newState = await initializeEditor(editor);
    activeEditorState = newState;
}

async function initializeEditor(editor: TextEditor | undefined): Promise<EditorState | null> {
    if (!editor) { return null; }

    const languageId = editor.document.languageId;
    if (!isLanguageSupported(languageId)) { return null; }

    const state = editorStates.get(editor) || await createNewEditorState(editor);
    setDecorationsForNode(editor, state.currentNode);
    showAST(state);
    updateStatusBar(state);

    return state;
}


async function createNewEditorState(editor: TextEditor) {
    const parseTree = parseTrees.get(editor.document) || await parseDocument(editor.document);
    const initialNode = parseTree.rootNode.firstNamedChild || parseTree.rootNode;

    const state: EditorState = {
        editor,
        parseTree,
        currentNode: initialNode,
        insertMode: false,
    };
    editorStates.set(editor, state);
    return state;
}

async function parseDocument(document: TextDocument): Promise<Parser.Tree> {
    const languageId = document.languageId;

    const parser = new Parser();
    parser.setLanguage(await loadTreeSitterLanguage(languageId));
    const tree = parser.parse(document.getText());
    parseTrees.set(document, tree);
    return tree;
}


export function withState(fun: (state: EditorState) => void): () => void {
    return () => {
        if (activeEditorState) {
            fun (activeEditorState);
        }
    };
}