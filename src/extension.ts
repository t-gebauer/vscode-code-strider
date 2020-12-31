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
import { backToPreviousSelection, exitInsertMode, followStructure, undoEdit } from "./commands"
import { EditorState } from "./editor-state"
import { interceptTypeCommand } from "./intercept-typing"
import { Languages } from "./language/language-support"
import { registerStatusBar } from "./status-bar"
import { toPoint, toRange, toSelection } from "./utilities/conversion-utilities"
import { findNodeAtSelection, findNodeBeforeCursor } from "./utilities/tree-utilities"
import Parser = require("web-tree-sitter")
import { registerDecorationHandler } from "./decoration"
import { Logger, OutputChannelLogger } from "./logger"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { TreeSitter } from "./tree-sitter"
import { moveDown, moveLeft, moveRight, moveUp } from "./spatial-movement-commands"

export let logger: Logger

// Main entry point. This method is called when the extension is activated. Configured in package.json.
export async function activate(context: ExtensionContext) {
    console.log('Extension "code-strider" is now active!')
    const outputChannelLogger = new OutputChannelLogger("code-strider debug")
    logger = outputChannelLogger
    logger.context("Activation")

    const treeSitter = new TreeSitter(context.asAbsolutePath("./wasm/"), logger)
    await treeSitter.initialize()

    const ext = new Extension(treeSitter)
    await ext.registerEventHandlers()

    context.subscriptions.push(
        registerStatusBar(ext),
        registerDecorationHandler(ext),
        commands.registerTextEditorCommand(
            "type",
            ext.withState(interceptTypeCommand, interceptTypeCommand)
        ),
        commands.registerTextEditorCommand(
            "code-strider:exit-insert-mode",
            ext.withState(exitInsertMode)
        ),
        ext,
        outputChannelLogger,
        commands.registerTextEditorCommand(
            "code-strider:toggle-ast-viewer",
            ext.toggleAstViewer.bind(ext)
        ),
        commands.registerTextEditorCommand("code-strider:show-log", () =>
            logger.show ? logger.show() : undefined
        ),
        commands.registerTextEditorCommand(
            "code-strider:back-to-previous-selection",
            ext.withState(backToPreviousSelection)
        ),
        commands.registerTextEditorCommand("code-strider:undo-edit", ext.withState(undoEdit)),
        commands.registerTextEditorCommand(
            "code-strider:follow-structure",
            ext.withState(followStructure)
        ),
        // (direct) tree movement commands
        commands.registerTextEditorCommand(
            "code-strider:tree-move-previous",
            ext.withState((state) => ({
                currentNode: state.currentNode.previousNamedSibling || undefined,
            }))
        ),
        commands.registerTextEditorCommand(
            "code-strider:tree-move-next",
            ext.withState((state) => ({
                currentNode: state.currentNode.nextNamedSibling || undefined,
            }))
        ),
        commands.registerTextEditorCommand(
            "code-strider:tree-move-parent",
            ext.withState((state) => ({ currentNode: state.currentNode.parent || undefined }))
        ),
        commands.registerTextEditorCommand(
            "code-strider:tree-move-first-child",
            ext.withState((state) => ({
                currentNode: state.currentNode.firstNamedChild || undefined,
            }))
        ),
        commands.registerTextEditorCommand(
            "code-strider:tree-move-last-child",
            ext.withState((state) => ({
                currentNode: state.currentNode.lastNamedChild || undefined,
            }))
        ),
        // spatial movement commands
        commands.registerTextEditorCommand("code-strider:move-up", ext.withState(moveUp)),
        commands.registerTextEditorCommand("code-strider:move-down", ext.withState(moveDown)),
        commands.registerTextEditorCommand("code-strider:move-left", ext.withState(moveLeft)),
        commands.registerTextEditorCommand("code-strider:move-right", ext.withState(moveRight))
    )
}

// Called by VS Code. But, nothing to do here for now, everything should have been added to
// the context.subscriptions already.
export function deactivate() {
    logger.context("Deactivation")
}

export enum InteractionMode {
    Structural,
    Insert,
}

export type EditorStateChange = {
    currentNode?: SyntaxNode
    insertMode?: boolean
    backToPreviousNode?: true
}

export class Extension implements Disposable {
    // State per open editor (cursor position, node selection, decoration)
    private readonly editorStates = new Map<TextEditor, EditorState>()

    private activeEditorStateChange = new EventEmitter<EditorState | undefined>()
    readonly onActiveEditorStateChange: Event<EditorState | undefined> = this
        .activeEditorStateChange.event
    private activeEditorState?: EditorState

    private astViewer?: AstViewer

    private readonly subscriptions: { dispose(): unknown }[] = []

    constructor(private readonly treeSitter: TreeSitter) {}

    async registerEventHandlers() {
        await this.handleChangeActiveTextEditor(window.activeTextEditor)
        this.subscriptions.push(
            window.onDidChangeActiveTextEditor(this.handleChangeActiveTextEditor.bind(this)),
            window.onDidChangeTextEditorSelection(this.handleChangeTextEditorSelection.bind(this)),
            workspace.onDidChangeTextDocument(this.handleTextDocumentChange.bind(this))
        )
    }

    toggleAstViewer() {
        if (this.astViewer) {
            this.astViewer.dispose()
            this.astViewer = undefined
        } else {
            const state = this.activeEditorState
            if (state) {
                AstViewer.create(this, state).then((astViewer) => (this.astViewer = astViewer))
            }
        }
    }

    dispose() {
        this.astViewer?.dispose()
        Disposable.from(...this.subscriptions, this.activeEditorStateChange).dispose()
    }

    private async handleChangeActiveTextEditor(editor: TextEditor | undefined) {
        logger.context("Event: changed ActiveTextEditor")
        const state = editor ? await this.getOrInitializeEditorState(editor) : undefined
        this.activeEditorState = state
        commands.executeCommand("setContext", "code-strider:is-editor-active", state !== undefined)
        if (state) {
            this.handleSelectedNodeChanged(state) // will also fire the state changed event
        } else {
            this.activeEditorStateChange.fire(this.activeEditorState)
        }
    }

    handleSelectedNodeChanged(state: EditorState) {
        logger.log("handle selectedNode change")
        // Ensure that the complete node is selected
        const targetNodeSelection = toSelection(state.currentNode)
        const currentSelection = state.editor.selection
        if (!currentSelection.isEqual(targetNodeSelection)) {
            logger.log("correcting editor selection")
            state.editor.selection = targetNodeSelection
        }
        // TODO: only reveal range when triggered change occurred via keyboard command?
        //       Do not suddenly scroll the view, when accidentally selecting the whole program.
        state.editor.revealRange(
            toRange(state.currentNode),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport
        )
        // TODO: really always fire event here? Consider sending a second smaller "selected node change event"
        this.activeEditorStateChange.fire(this.activeEditorState)
    }

    private async createNewEditorState(editor: TextEditor): Promise<EditorState> {
        const { document, selection } = editor
        logger.log("initializing new editor state")
        const parseTree = this.parseTrees.get(document) ?? (await this.parseTextDocument(document))
        const initialNode = findNodeAtSelection(parseTree, selection)

        let state: EditorState = {
            editor,
            insertMode: false,
            currentNode: initialNode,
            previousNodes: new Array(),
            parseTree,
        }
        this.editorStates.set(editor, state)
        return state
    }

    private updateActiveEditorState(change: EditorStateChange) {
        const activeState = this.activeEditorState
        if (!activeState) {
            window.showErrorMessage("Invalid state: no compatible editor active")
            return
        }
        const currentNode = activeState.currentNode

        if (change.insertMode !== undefined) {
            logger.log(`changing insertMode: ${change.insertMode}`)
            commands.executeCommand("setContext", "code-strider:is-insert-mode", change.insertMode)
            activeState.insertMode = change.insertMode
        }
        if (change.backToPreviousNode) {
            const previousNode = activeState.previousNodes.pop()
            if (previousNode) {
                activeState.currentNode = previousNode
            }
        }
        if (change.currentNode !== undefined && change.currentNode !== currentNode) {
            activeState.previousNodes.push(currentNode)
            activeState.currentNode = change.currentNode
        }

        const didChangeNode = activeState.currentNode !== currentNode
        if (didChangeNode) {
            this.handleSelectedNodeChanged(activeState) // will also fire the state change event
        } else {
            this.activeEditorStateChange.fire(activeState)
        }
    }

    withState<T extends readonly unknown[], U extends EditorStateChange>(
        fdefined: (state: Readonly<EditorState>, ...args: T) => U | undefined,
        fundefined?: (state: undefined, ...args: T) => void
    ): (...args: T) => void {
        return (...rest) => {
            if (this.activeEditorState) {
                const readonlyState = Object.freeze({ ...this.activeEditorState })
                const change = fdefined(readonlyState, ...rest)
                if (change !== undefined) {
                    this.updateActiveEditorState(change)
                }
            } else if (fundefined) {
                fundefined(undefined, ...rest)
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
        logger.context(`Event: changed TextEditorSelection (${event.kind})`)

        // TODO: should handle multiple selections
        const selection = event.selections[0]

        if (selection.isEqual(toSelection(state.currentNode))) {
            // Nothing to do, the current node already spans the selection.
            // Also happens if we are changing the selection manually after a movement command.
            logger.log("selection already matches current node, nothing to do")
            return
        }

        const timeBefore = Date.now()
        const currentNode = selection.start.isEqual(selection.end)
            ? findNodeBeforeCursor(state.parseTree, selection.start)
            : findNodeAtSelection(state.parseTree, selection)
        logger.log(`finding matching node at selection (took ${Date.now() - timeBefore} ms)`)
        this.updateActiveEditorState({ currentNode })
    }

    // State per open file (parse tree caching, incremental parsing)
    private readonly parseTrees = new Map<TextDocument, Parser.Tree>()

    private async parseTextDocument(document: TextDocument, previousTree?: Tree): Promise<Tree> {
        const newTree = await this.treeSitter.parseText(
            document.getText(),
            document.languageId,
            previousTree
        )
        this.parseTrees.set(document, newTree)
        this.invalidateEditorStatesForDocument(document, newTree)

        return newTree
    }

    private async handleTextDocumentChange(event: TextDocumentChangeEvent) {
        const { document, contentChanges } = event
        // Did the content change? The event is also fired when other properties of the document change.
        if (contentChanges.length === 0) return
        const tree = this.parseTrees.get(document)
        if (!tree) return

        logger.context("Event: TextDocument content changed")
        contentChanges.forEach((change) => {
            const newLines = change.text.split("\n") // TODO: different end-of-line sequences?
            // TODO: write a test for this?
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
        await this.parseTextDocument(document, tree)
    }

    private invalidateEditorStatesForDocument(document: TextDocument, newTree: Parser.Tree) {
        this.editorStates.forEach((state) => {
            if (state.editor.document === document) {
                state.parseTree = newTree
                state.currentNode = findNodeBeforeCursor(newTree, state.editor.selection.active)
                state.previousNodes = new Array() // old references are no longer valid
            }
        })
        this.activeEditorStateChange.fire(this.activeEditorState)
    }
}
