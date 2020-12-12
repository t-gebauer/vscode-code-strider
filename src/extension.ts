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
import * as vscode from "vscode"
import Parser = require("web-tree-sitter")
import { showAstView } from "./ast-view"
import { exitInsertMode } from "./commands"
import { setDecorationsForNode, updateSelection } from "./decoration"
import { handleDocumentChange, initializeParser, parseDocument } from "./document-parser"
import { EditorState } from "./editor-state"
import { interceptTypeCommand } from "./intercept-typing"
import { Languages } from "./language/language-support"
import { registerStatusBar } from "./status-bar"
import { toRange, toSelection } from "./utilities/conversion-utilities"
import { findNodeAtSelection } from "./utilities/tree-utilities"

export let extensionContext: ExtensionContext

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
    console.log('Extension "code-strider" is now active!')
    extensionContext = context

    await initializeParser()

    const ext = new Extension()
    await ext.registerEventHandlers()

    context.subscriptions.push(
        registerStatusBar(ext),
        commands.registerTextEditorCommand("type", ext.withState(interceptTypeCommand)),
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

export type EditorStateChange = Partial<EditorState>

export class Extension implements Disposable {
    /* Dont use events for simple things... this will just add detached code, just call functions */
    private activeEditorChange = new EventEmitter<EditorState | undefined>()

    onActiveEditorChange: Event<EditorState | undefined> = this.activeEditorChange.event

    // State per open editor (cursor position, node selection, decoration)
    editorStates = new Map<TextEditor, EditorState>()
    activeEditorState?: EditorState

    readonly subscriptions: { dispose(): unknown }[] = []

    debugOutputChannel = window.createOutputChannel("code-strider debug")

    private debugText(message: string) {
        this.debugOutputChannel.appendLine(message)
    }

    private debugContext(name: string) {
        this.debugText(`[${Date.now()}] ${name}`)
    }

    debug(message: string) {
        this.debugText(`  ${message}`)
    }

    async registerEventHandlers() {
        this.debugOutputChannel.show()
        await this.handleChangeActiveTextEditor(window.activeTextEditor)
        this.subscriptions.push(
            window.onDidChangeActiveTextEditor(this.handleChangeActiveTextEditor.bind(this)),
            window.onDidChangeTextEditorSelection(this.handleChangeTextEditorSelection.bind(this))
        )
    }

    dispose() {
        Disposable.from(
            ...this.subscriptions,
            this.activeEditorChange,
            this.debugOutputChannel
        ).dispose()
    }

    private async handleChangeActiveTextEditor(editor: TextEditor | undefined) {
        this.debugContext("Event: changed ActiveTextEditor")
        this.activeEditorState = editor ? await this.getOrInitializeEditorState(editor) : undefined
        this.activeEditorChange.fire(this.activeEditorState)
    }

    onSelectedNodeChange(state: EditorState) {
        this.debug("onSelectedNodeChange")
        // TODO: rework to inverse event handling
        setDecorationsForNode(state.editor, state.currentNode)
        state.astView?.updateSelectedNode(state.currentNode)
        // TODO: really always fire event here?
        this.activeEditorChange.fire(this.activeEditorState)

        // Make sure that the complete node is selected
        const targetNodeSelection = toSelection(state.currentNode)
        const currentSelection = state.editor.selection
        if (!currentSelection.isEqual(targetNodeSelection)) {
            this.debug("correcting editor selection")
            state.editor.selection = targetNodeSelection
        }
    }

    private async createNewEditorState(editor: TextEditor): Promise<EditorState> {
        this.debug("initializing new editor state")
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

    private updateActiveEditorState(change: EditorStateChange) {
        const activeState = this.activeEditorState
        if (!activeState) {
            window.showErrorMessage("Invalid state: no compatible editor active")
            return
        }

        let didChange = false
        // Is there really no sane way to iterate over a known type?
        for (const [k, v] of Object.entries(change)) {
            ;(activeState as any)[k] = v
            didChange = true
        }

        if (didChange) {
            if (change.currentNode !== undefined) {
                activeState.editor.revealRange(
                    toRange(change.currentNode),
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport
                )
            }
            updateSelection(activeState)
            activeState.astView?.updateSelectedNode(activeState.currentNode)
            this.activeEditorChange.fire(activeState)
        }
    }

    withState<T extends readonly unknown[], U extends EditorStateChange>(
        fun: (state: Readonly<EditorState>, ...args: T) => U | undefined
    ): (...args: T) => void {
        return (...rest) => {
            if (this.activeEditorState) {
                const readonlyState = Object.freeze({ ...this.activeEditorState })
                const change = fun(readonlyState, ...rest)
                if (change != undefined) {
                    this.updateActiveEditorState(change)
                }
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

    private async getOrInitializeEditorState(
        editor: TextEditor | undefined
    ): Promise<EditorState | undefined> {
        if (!editor) {
            return
        }
        const existingState = this.editorStates.get(editor)
        if (existingState) {
            return existingState
        }
        const languageId = editor.document.languageId
        if (!Languages.isSupported(languageId)) {
            return
        }
        return this.createNewEditorState(editor)
    }

    private async handleChangeTextEditorSelection(event: TextEditorSelectionChangeEvent) {
        const state = this.editorStates.get(event.textEditor)
        if (!state || state.insertMode) {
            return
        }
        this.debugContext("Event: changed TextEditorSelection")

        // TODO: should handle multiple selections
        const selection = event.selections[0]

        if (selection.isEqual(toSelection(state.currentNode))) {
            // Nothing to do, the current node already spans the selection.
            // Also happens if we are changing the selection manually after a movement command.
            this.debug("selection matchens current node, nothing to do")
            return
        }

        this.debug("finding new node for selection")
        state.currentNode = findNodeAtSelection(state.parseTree, selection)
        this.onSelectedNodeChange(state)
    }
}
