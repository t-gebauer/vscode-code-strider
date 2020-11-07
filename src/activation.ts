import { Disposable, TextDocument, TextEditor, window } from "vscode";
import Parser = require("web-tree-sitter");
import { showAST } from "./ast-view";
import { setDecorationsForNode } from "./decoration";
import { parseDocument } from "./document-parser";
import { EditorState } from "./editor-state";
import { isLanguageSupported } from "./language/language-support";
import { updateStatusBar } from "./status-bar";


export function registerEditorChangeEvent(): Disposable {
    const disposable = window.onDidChangeActiveTextEditor(handleEditorChange);
    handleEditorChange(window.activeTextEditor);
    return disposable;
}

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
    const parseTree = await parseDocument(editor.document);
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

export function withState(fun: (state: EditorState) => void): () => void {
    return () => {
        if (activeEditorState) {
            fun(activeEditorState);
        }
    };
}

export function invalidateEditorStates(document: TextDocument, newTree: Parser.Tree) {
    editorStates.forEach(state => {
        if (state.editor.document === document) {
            state.parseTree = newTree;
            state.currentNode = newTree.rootNode.firstNamedChild || newTree.rootNode; // TODO find by cursor position
        }
    });
}