import * as vscode from "vscode"
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
import { AstViewer } from "./ast-view"
import { exitInsertMode } from "./commands"
import { handleDocumentChange, initializeParser, parseDocument } from "./document-parser"
import { EditorState } from "./editor-state"
import { interceptTypeCommand } from "./intercept-typing"
import { Languages } from "./language/language-support"
import { registerStatusBar } from "./status-bar"
import { toRange, toSelection } from "./utilities/conversion-utilities"
import { findNodeAtSelection } from "./utilities/tree-utilities"
import Parser = require("web-tree-sitter")
import { registerDecorationHandler } from "./decoration"
import { Logger } from "./logger"

export let extensionContext: ExtensionContext
export let logger: Logger

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
    console.log('Extension "code-strider" is now active!')
    extensionContext = context
    logger = new Logger("code-strider debug")

    await initializeParser()

    const ext = new Extension()
    await ext.registerEventHandlers()

    context.subscriptions.push(
        logger,
        registerStatusBar(ext),
        registerDecorationHandler(ext),
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
    // State per open editor (cursor position, node selection, decoration)
    private readonly editorStates = new Map<TextEditor, EditorState>()

    private activeEditorStateChange = new EventEmitter<EditorState | undefined>()
    readonly onActiveEditorStateChange: Event<EditorState | undefined> = this
        .activeEditorStateChange.event
    private activeEditorState?: EditorState

    private astViewer?: AstViewer

    private readonly subscriptions: { dispose(): unknown }[] = []

    async registerEventHandlers() {
        await this.handleChangeActiveTextEditor(window.activeTextEditor)
        this.subscriptions.push(
            window.onDidChangeActiveTextEditor(this.handleChangeActiveTextEditor.bind(this)),
            window.onDidChangeTextEditorSelection(this.handleChangeTextEditorSelection.bind(this))
        )
    }

    dispose() {
        this.astViewer?.dispose()
        Disposable.from(...this.subscriptions, this.activeEditorStateChange).dispose()
    }

    private async handleChangeActiveTextEditor(editor: TextEditor | undefined) {
        logger.debugContext("Event: changed ActiveTextEditor")
        this.activeEditorState = editor ? await this.getOrInitializeEditorState(editor) : undefined
        this.activeEditorStateChange.fire(this.activeEditorState)
    }

    onSelectedNodeChange(state: EditorState) {
        logger.debug("onSelectedNodeChange")
        // TODO: really always fire event here?
        this.activeEditorStateChange.fire(this.activeEditorState)

        // Make sure that the complete node is selected
        const targetNodeSelection = toSelection(state.currentNode)
        const currentSelection = state.editor.selection
        if (!currentSelection.isEqual(targetNodeSelection)) {
            logger.debug("correcting editor selection")
            state.editor.selection = targetNodeSelection
        }
    }

    private async createNewEditorState(editor: TextEditor): Promise<EditorState> {
        logger.debug("initializing new editor state")
        const parseTree = await parseDocument(editor.document)
        const initialNode = findNodeAtSelection(parseTree, editor.selection)

        let state: EditorState = {
            editor,
            parseTree,
            currentNode: initialNode,
            insertMode: false,
        }
        this.editorStates.set(editor, state)
        // TODO: if config.showAstView ...
        // TODO: might create
        AstViewer.create(this, state).then((astViewer) => (this.astViewer = astViewer))
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
            this.activeEditorStateChange.fire(activeState)
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
            }
        })
        this.activeEditorStateChange.fire(this.activeEditorState)
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
        logger.debugContext("Event: changed TextEditorSelection")

        // TODO: should handle multiple selections
        const selection = event.selections[0]

        if (selection.isEqual(toSelection(state.currentNode))) {
            // Nothing to do, the current node already spans the selection.
            // Also happens if we are changing the selection manually after a movement command.
            logger.debug("Selection already matches current node, nothing to do")
            return
        }

        logger.debug("finding new node for selection")
        state.currentNode = findNodeAtSelection(state.parseTree, selection)
        this.onSelectedNodeChange(state)
    }
}
