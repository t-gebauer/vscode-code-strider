import {
    Disposable,
    TextDocument,
    TextEditor,
    TextEditorSelectionChangeEvent,
    window,
} from "vscode"
import Parser = require("web-tree-sitter")
import { setDecorationsForNode } from "./decoration"
import { parseDocument } from "./document-parser"
import { EditorState } from "./editor-state"
import { findNodeAtSelection } from "./utilities/tree-utilities"
import { updateStatusBar } from "./status-bar"
import { toSelection } from "./utilities/conversion-utilities"
import { showAstView } from "./ast-view"
import { Languages } from "./language/language-support"

export function registerEditorChangeEvents(): Disposable {
    handleEditorChange(window.activeTextEditor)
    return Disposable.from(
        window.onDidChangeActiveTextEditor(handleEditorChange),
        window.onDidChangeTextEditorSelection(handleEditorSelectionChange)
    )
}

// State per open editor (cursor position, node selection, decoration)
const editorStates = new Map<TextEditor, EditorState>()

export let activeEditorState: EditorState | null

async function handleEditorChange(editor: TextEditor | undefined) {
    const newState = await initializeEditor(editor)
    activeEditorState = newState
}

async function initializeEditor(editor: TextEditor | undefined): Promise<EditorState | null> {
    if (!editor) {
        return null
    }

    const languageId = editor.document.languageId
    if (!Languages.isSupported(languageId)) {
        return null
    }

    const state = editorStates.get(editor) || (await createNewEditorState(editor))
    onSelectedNodeChange(state)
    return state
}

function onSelectedNodeChange(state: EditorState) {
    setDecorationsForNode(state.editor, state.currentNode)
    state.astView?.updateSelectedNode(state.currentNode)
    updateStatusBar(state)
    // Make sure that the complete node is selected
    const targetNodeSelection = toSelection(state.currentNode)
    const currentSelection = state.editor.selection
    if (!currentSelection.isEqual(targetNodeSelection)) {
        state.editor.selection = targetNodeSelection
    }
}

async function createNewEditorState(editor: TextEditor) {
    const parseTree = await parseDocument(editor.document)
    const initialNode = findNodeAtSelection(parseTree, editor.selection)

    let state: EditorState = {
        editor,
        parseTree,
        currentNode: initialNode,
        insertMode: false,
    }
    // TODO: if config.showAstView ...
    showAstView(state).then((newAstView) => (state.astView = newAstView))
    editorStates.set(editor, state)
    return state
}

export function withState<T extends readonly unknown[], U>(
    fun: (state: EditorState, ...args: T) => U
): (...args: T) => U | undefined {
    return (...rest) => {
        if (activeEditorState) {
            return fun(activeEditorState, ...rest)
        }
    }
}

// The parse tree has changed
export function invalidateEditorStatesForDocument(document: TextDocument, newTree: Parser.Tree) {
    editorStates.forEach((state) => {
        if (state.editor.document === document) {
            state.parseTree = newTree
            state.currentNode = findNodeAtSelection(newTree, state.editor.selection)
            if (state.astView) {
                // No need to wait on the new AST view to show
                showAstView(state).then((newAstView) => (state.astView = newAstView))
            }
        }
    })
}

function handleEditorSelectionChange(event: TextEditorSelectionChangeEvent) {
    // For simplity, let's assume that selection change always happens after editor change.
    // Otherwise we might have to initialize the parser state here. As far as I could observe, this assumption is correct.

    const state = editorStates.get(event.textEditor)
    if (!state || state.insertMode) {
        return
    }

    // TODO: should handle multiple selections
    const selection = event.selections[0]

    if (selection.isEqual(toSelection(state.currentNode))) {
        // Nothing to do, the current node already spans the selection.
        // Also happens if we are changing the selection manually after a movement command.
        return
    }

    state.currentNode = findNodeAtSelection(state.parseTree, selection)
    onSelectedNodeChange(state)
}
