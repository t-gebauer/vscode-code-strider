import {
    commands,
    Disposable,
    Event,
    EventEmitter,
    ExtensionContext,
    TextDocument,
    TextEditor,
    TextEditorSelectionChangeEvent,
    window,
    workspace,
} from "vscode"
import Parser = require("web-tree-sitter")
import { showAstView } from "./ast-view"
import { exitInsertMode } from "./commands"
import { setDecorationsForNode } from "./decoration"
import { handleDocumentChange, initializeParser, parseDocument } from "./document-parser"
import { EditorState } from "./editor-state"
import { interceptTypeCommand } from "./intercept-typing"
import { Languages } from "./language/language-support"
import { registerStatusBar } from "./status-bar"
import { toSelection } from "./utilities/conversion-utilities"
import { findNodeAtSelection } from "./utilities/tree-utilities"

export let extensionContext: ExtensionContext

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
    console.log('Extension "code-strider" is now active!')
    extensionContext = context

    await initializeParser()

    const ext = new Extension()

    context.subscriptions.push(
        registerStatusBar(ext),
        commands.registerTextEditorCommand("type", interceptTypeCommand),
        commands.registerTextEditorCommand(
            "code-strider:exit-insert-mode",
            ext.withState(exitInsertMode)
        ),
        workspace.onDidChangeTextDocument(handleDocumentChange),
        ext
    )
}

export function deactivate() {}

// ---

export enum InteractionMode {
    Structural,
    Insert,
}

export class Extension implements Disposable {
    private activeEditorChange = new EventEmitter<EditorState>()
    private activeEditorModeChange = new EventEmitter<EditorState>()
    private activeEditorNodeSelectionChange = new EventEmitter<EditorState>()

    onActiveEditorChange: Event<EditorState> = this.activeEditorChange.event
    onActiveEditorModeChange: Event<EditorState> = this.activeEditorModeChange.event
    onActiveEditorNodeSelectionChange: Event<EditorState> = this.activeEditorNodeSelectionChange
        .event

    // State per open editor (cursor position, node selection, decoration)
    editorStates = new Map<TextEditor, EditorState>()
    activeEditorState: EditorState | null = null

    readonly subscriptions: { dispose(): unknown }[] = []

    constructor() {
        this.handleEditorChange(window.activeTextEditor)
        window.onDidChangeActiveTextEditor(this.handleEditorChange),
            window.onDidChangeTextEditorSelection(this.handleEditorSelectionChange)
    }

    dispose() {
        Disposable.from(
            this.activeEditorChange,
            this.activeEditorModeChange,
            this.activeEditorNodeSelectionChange
        ).dispose()
    }

    async handleEditorChange(editor: TextEditor | undefined) {
        const newState = await this.initializeEditor(editor)
        this.activeEditorState = newState
    }

    async initializeEditor(editor: TextEditor | undefined): Promise<EditorState | null> {
        if (!editor) {
            return null
        }

        const languageId = editor.document.languageId
        if (!Languages.isSupported(languageId)) {
            return null
        }

        const state = this.editorStates.get(editor) || (await this.createNewEditorState(editor))
        this.onSelectedNodeChange(state)
        return state
    }

    onSelectedNodeChange(state: EditorState) {
        // TODO: rework to inverse event handling
        setDecorationsForNode(state.editor, state.currentNode)
        state.astView?.updateSelectedNode(state.currentNode)
        this.activeEditorNodeSelectionChange.fire(state)

        // Make sure that the complete node is selected
        const targetNodeSelection = toSelection(state.currentNode)
        const currentSelection = state.editor.selection
        if (!currentSelection.isEqual(targetNodeSelection)) {
            state.editor.selection = targetNodeSelection
        }
    }

    async createNewEditorState(editor: TextEditor) {
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
        this.editorStates.set(editor, state)
        return state
    }

    withState<T extends readonly unknown[], U>(
        fun: (state: EditorState, ...args: T) => U
    ): (...args: T) => U | undefined {
        return (...rest) => {
            if (this.activeEditorState) {
                return fun(this.activeEditorState, ...rest)
            }
        }
    }

    // The parse tree has changed
    invalidateEditorStatesForDocument(document: TextDocument, newTree: Parser.Tree) {
        this.editorStates.forEach((state) => {
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

    handleEditorSelectionChange(event: TextEditorSelectionChangeEvent) {
        // For simplicity, let's assume that selection change always happens after editor change.
        // Otherwise we might have to initialize the parser state here. As far as I could observe, this assumption is correct.

        const state = this.editorStates.get(event.textEditor)
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
        this.onSelectedNodeChange(state)
    }
}
