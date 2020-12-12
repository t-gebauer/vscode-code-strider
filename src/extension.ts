import * as vscode from "vscode"
import {
    commands,
    Disposable,
    Event,
    EventEmitter,
    ExtensionContext,
    TextDocument,
    TextDocumentChangeEvent,
    TextEditor,
    TextEditorSelectionChangeEvent,
    window,
    workspace,
} from "vscode"
import { AstViewer } from "./ast-view"
import { exitInsertMode } from "./commands"
import { EditorState } from "./editor-state"
import { interceptTypeCommand } from "./intercept-typing"
import { Languages } from "./language/language-support"
import { registerStatusBar } from "./status-bar"
import { toPoint, toRange, toSelection } from "./utilities/conversion-utilities"
import { findNodeAtSelection } from "./utilities/tree-utilities"
import Parser = require("web-tree-sitter")
import { registerDecorationHandler } from "./decoration"
import { Logger } from "./logger"
import { Tree } from "web-tree-sitter"
import { initializeParser, loadTreeSitterLanguage } from "./utilities/tree-sitter-utilities"

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
            window.onDidChangeTextEditorSelection(this.handleChangeTextEditorSelection.bind(this)),
            workspace.onDidChangeTextDocument(this.handleTextDocumentChange.bind(this))
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
        const { document, selection } = editor
        logger.debug("initializing new editor state")
        const parseTree = this.parseTrees.get(document) ?? (await this.parseTextDocument(document))
        const initialNode = findNodeAtSelection(parseTree, selection)

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

    // State per open file (parse tree caching, incremental parsing)
    private readonly parseTrees = new Map<TextDocument, Parser.Tree>()

    // TODO move parsing specific code into `tree-sitter-utilities`, but keep state and plumbing here
    private async parseTextDocument(document: TextDocument, previousTree?: Tree): Promise<Tree> {
        // TODO: should we reuse the Parser for better performance?
        const parser = new Parser()
        parser.setLanguage(await loadTreeSitterLanguage(document.languageId))
        const newTree = parser.parse(document.getText(), previousTree)

        this.parseTrees.set(document, newTree)
        this.invalidateEditorStatesForDocument(document, newTree)

        return newTree
    }

    private async handleTextDocumentChange(event: TextDocumentChangeEvent) {
        const { document, contentChanges } = event
        // Nothing has changed?
        if (contentChanges.length === 0) return
        const tree = this.parseTrees.get(document)
        if (!tree) return
        // TODO: Does the tree editing really work?
        // Can we test the speed? Is this really faster than parsing from scratch?
        // Do we have to use the same Parser that generated the old tree for this to work?
        contentChanges.forEach((change) => {
            const newLines = change.text.split("\n") // TODO: different end-of-line sequences?
            // TODO: test it
            const edit = {
                startIndex: change.rangeOffset,
                oldEndIndex: change.rangeOffset + change.rangeLength,
                newEndIndex: change.rangeOffset + change.text.length,
                startPosition: toPoint(change.range.start),
                oldEndPosition: toPoint(change.range.end),
                newEndPosition: {
                    row: change.range.start.line + newLines.length - 1,
                    column:
                        newLines.length > 1
                            ? newLines[newLines.length - 1].length
                            : change.range.start.character + change.text.length,
                },
            }
            tree.edit(edit)
        })
        return this.parseTextDocument(document, tree)
    }

    private invalidateEditorStatesForDocument(document: TextDocument, newTree: Parser.Tree) {
        this.editorStates.forEach((state) => {
            if (state.editor.document === document) {
                state.parseTree = newTree
                state.currentNode = findNodeAtSelection(newTree, state.editor.selection)
            }
        })
        this.activeEditorStateChange.fire(this.activeEditorState)
    }
}
