import { Disposable, TextDocument, TextEditor, TextEditorSelectionChangeEvent, window, workspace } from "vscode";
import Parser = require("web-tree-sitter");
import { showAST } from "./ast-view";
import { setDecorationsForNode } from "./decoration";
import { parseDocument } from "./document-parser";
import { EditorState } from "./editor-state";
import { isLanguageSupported } from "./language/language-support";
import { findNodeAtSelection } from "./utilities/tree-utilities";
import { updateStatusBar } from "./status-bar";
import { toSelection } from "./utilities/conversion-utilities";


export function registerEditorChangeEvent(): Disposable {
    handleEditorChange(window.activeTextEditor);
    return Disposable.from(
        window.onDidChangeActiveTextEditor(handleEditorChange),
        window.onDidChangeTextEditorSelection(handleEditorSelectionChange),
    );
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
    onSelectedNodeChange(state);
    return state;
}

function onSelectedNodeChange(state: EditorState) {
    setDecorationsForNode(state.editor, state.currentNode);
    showAST(state);
    updateStatusBar(state);
    // Make sure that the complete node is selected
    const targetNodeSelection = toSelection(state.currentNode);
    const currentSelection = state.editor.selection;
    if (!currentSelection.isEqual(targetNodeSelection)) {
        state.editor.selection = targetNodeSelection;
    }
}

async function createNewEditorState(editor: TextEditor) {
    const parseTree = await parseDocument(editor.document);
    const initialNode = findNodeAtSelection(parseTree, editor.selection);

    const state: EditorState = {
        editor,
        parseTree,
        currentNode: initialNode,
        insertMode: false,
    };
    editorStates.set(editor, state);
    return state;
}

// TODO: with args?, so that we can use this everywhere where we need the state
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


function handleEditorSelectionChange(event: TextEditorSelectionChangeEvent) {
    // For simplity, let's assume that selection change always happens after editor change.
    // Otherwise we would have to do the parser state initialization here as well.
    // This seems to work for now.

    const editor = event.textEditor;
    // TODO: should handle multiple selections
    const selection = event.selections[0];
    const state = editorStates.get(event.textEditor);
    if (!state || state.insertMode) { return; }
    state.currentNode = findNodeAtSelection(state.parseTree, selection);
    onSelectedNodeChange(state);
}