import * as vscode from "vscode"
import {
    commands,
    Disposable,
    Event,
    EventEmitter,
    ExtensionContext,
    Selection,
    TextDocument,
    TextDocumentChangeEvent,
    TextEditor,
    TextEditorEdit,
    TextEditorSelectionChangeEvent,
    window,
    workspace,
} from "vscode"
import { AstViewer } from "./ast-view"
import {
    backToPreviousSelection,
    slurpLeft,
    deleteAndInsert,
    exitInsertMode,
    goToFirstChild,
    goToLastChild,
    goToParent,
    greedyDelete,
    insertAfter,
    insertBefore,
    insertOnNewLineAbove,
    insertOnNewLineBelow,
    raise,
    undoEdit,
    slurpRight,
    barfLeft,
    barfRight,
} from "./commands"
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
import { Delayer } from "./utils"

export let logger: Logger

// Main entry point. This method is called when the extension is activated. Configured in package.json.
export async function activate(context: ExtensionContext) {
    const outputChannelLogger = new OutputChannelLogger("code-strider debug")
    logger = outputChannelLogger
    logger.context("Activating extension ...")

    const treeSitter = new TreeSitter(context.asAbsolutePath("./wasm/"), logger)
    await treeSitter.initialize()

    const ext = new Extension(treeSitter)
    ext.registerEventHandlers()

    context.subscriptions.push(
        ext,
        outputChannelLogger,
        registerStatusBar(ext),
        registerDecorationHandler(ext),
        commands.registerTextEditorCommand(
            "type",
            ext.withState(interceptTypeCommand, interceptTypeCommand)
        ),
        commands.registerTextEditorCommand(
            "code-strider:toggle-ast-viewer",
            ext.toggleAstViewer.bind(ext)
        ),
        commands.registerTextEditorCommand("code-strider:show-log", () =>
            logger.show ? logger.show() : undefined
        ),
        // Used during integration tests to wait until the extension is initialized
        commands.registerCommand(
            "code-strider:_ready",
            () =>
                new Promise((resolve) =>
                    ext.onActiveEditorStateChange((state) => (state ? resolve(state) : undefined))
                )
        )
    )

    function registerCommandWithState(
        id: string,
        callback: (
            state: Readonly<EditorState>,
            textEditor: TextEditor,
            edit: TextEditorEdit,
            ...args: any[]
        ) => Promise<EditorStateChange> | EditorStateChange | undefined
    ) {
        context.subscriptions.push(
            commands.registerTextEditorCommand("code-strider:" + id, ext.withState(callback))
        )
    }

    registerCommandWithState("exit-insert-mode", exitInsertMode)
    registerCommandWithState("insert-before", insertBefore)
    registerCommandWithState("insert-after", insertAfter)
    registerCommandWithState("insert-above", insertOnNewLineAbove)
    registerCommandWithState("insert-below", insertOnNewLineBelow)
    registerCommandWithState("delete-and-insert", deleteAndInsert)
    registerCommandWithState("greedy-delete", greedyDelete)
    registerCommandWithState("raise", raise)
    registerCommandWithState("back-to-previous-selection", backToPreviousSelection)
    registerCommandWithState("undo-edit", undoEdit)

    // direct tree movement commands
    registerCommandWithState("tree-move-previous-sibling", (state) => ({
        currentNode: state.currentNode.previousNamedSibling || undefined,
    }))
    registerCommandWithState("tree-move-next-sibling", (state) => ({
        currentNode: state.currentNode.nextNamedSibling || undefined,
    }))
    registerCommandWithState("tree-move-parent", (state) => ({
        currentNode: state.currentNode.parent || undefined,
    }))
    registerCommandWithState("tree-move-first-child", (state) => ({
        currentNode: state.currentNode.firstNamedChild || undefined,
    }))
    registerCommandWithState("tree-move-last-child", (state) => ({
        currentNode: state.currentNode.lastNamedChild || undefined,
    }))

    // tree-movement, but ignores nodes that take the same space
    registerCommandWithState("first-child", goToFirstChild)
    registerCommandWithState("last-child", goToLastChild)
    registerCommandWithState("move-parent", goToParent)

    // spatial movement commands
    registerCommandWithState("move-up", moveUp)
    registerCommandWithState("move-down", moveDown)
    registerCommandWithState("move-left", moveLeft)
    registerCommandWithState("move-right", moveRight)
    registerCommandWithState("follow-structure", goToFirstChild)
    registerCommandWithState("follow-structure-last", goToLastChild)

    // editing commands
    // TODO: afaik, slurping and barfing only works for HTML.
    //       Configure per language "how much" of the selected node is its border?
    //       In HTML: the first named child node
    registerCommandWithState("slurp-left", slurpLeft)
    registerCommandWithState("slurp-right", slurpRight)
    registerCommandWithState("barf-left", barfLeft)
    registerCommandWithState("barf-right", barfRight)

    logger.log("... registration complete.")

    ext.onDidChangeActiveTextEditor(window.activeTextEditor)

    logger.log("... activation complete.")
}

// Called by VS Code. But, nothing to do here for now, everything should have been added to
// the context.subscriptions already.
export function deactivate() {
    logger.context("Deactivation")
}

// XXX: This is not used as much as it should be
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
    private activeEditorStateChange = new EventEmitter<EditorState | undefined>()
    readonly onActiveEditorStateChange: Event<EditorState | undefined> = this
        .activeEditorStateChange.event
    private activeEditorState?: EditorState

    private astViewer?: AstViewer

    private readonly subscriptions: { dispose(): unknown }[] = []

    constructor(private readonly treeSitter: TreeSitter) {}

    registerEventHandlers() {
        this.subscriptions.push(
            window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this)),
            window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection.bind(this)),
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

    onDidChangeActiveTextEditor(editor?: TextEditor) {
        logger.context("Event: changed activeTextEditor")
        const isEditorSupported = editor && Languages.isSupported(editor.document.languageId)
        commands.executeCommand("setContext", "code-strider:is-editor-supported", isEditorSupported)
        this.activeEditorState = undefined
        if (!editor || !isEditorSupported) {
            this.activeEditorStateChange.fire(undefined)
            return
        }
        // XXX: Initially the `editor.selection` will be " 0,0,0,0 " if switching to another tab
        // (in the same editor group). (When a new editor is created?)
        // We have to wait for the `onDidChangeTextEditorSelection` event which will always
        // fire directly after this event(?) restoring the correct selection.
        // Is this a bug or a feature?
        //
        // However, when opening a new document the selection event will not fire. In this case
        // the selection is correctly positioned at the start of the file.
        // Also, switching between two editor groups (split windows) will only fire the
        // `onDidChangeActiveTextEditor`, but this time with the correct expected selection.
        setTimeout(() => {
            const promise = this.createNewEditorState(editor)
            promise.then((newState) => {
                this.activeEditorState = newState
                this.handleSelectedNodeChanged(newState)
                this.handleModeChanged(newState)
            })
        }, 1)
    }

    // XXX: This delay just needs to be high enough for [Ctrl-LeftButton] "Go to definition" to
    // work correctly.
    private readonly textSelectionChangeDelayer = new Delayer(30)
    onDidChangeTextEditorSelection(event: TextEditorSelectionChangeEvent) {
        if (event.textEditor !== window.activeTextEditor) {
            return
        }
        const state = this.activeEditorState
        if (!state) {
            return
        }
        if (event.textEditor !== state.editor) {
            // The active state should always match the `activeTextEditor` or be `undefined`,
            // therefore, this should not be possible?
            logger.log("WARNING: discarding stale selection event")
            return
        }
        if (state.insertMode) {
            return
        }
        // TODO: should handle multiple selections
        const selection = event.selections[0]
        if (selection.isEqual(toSelection(state.currentNode))) {
            // Nothing to do, the current node already spans the selection.
            // Also happens if we are changing the selection manually after a movement command.
            return
        }
        logger.context(`Event: changed ActiveTextEditorSelection (${event.kind})`)
        // XXX: this does not only debounce multiple events, but also delays single events to
        // ensure that we are not directly changing the selection inside this event callback.
        // This seems to be important for the mouse action [Ctrl-LeftButton] "Go to definition"
        // to work.
        this.textSelectionChangeDelayer.delay(() => {
            // TODO: discard this event when the the state changed during the delay?
            this.changeActiveEditorState({
                currentNode: this.findBestNodeForSelection(state.parseTree, selection),
            })
        })
    }

    private handleSelectedNodeChanged(state: EditorState) {
        logger.log("-> selectedNode changed")
        // Ensure that the complete node is selected
        const targetNodeSelection = toSelection(state.currentNode)
        const currentSelection = state.editor.selection
        if (!currentSelection.isEqual(targetNodeSelection)) {
            logger.log("correcting editor selection")
            // TODO: automatically changing the selection causes way too many problems:
            // ctrl-leftButton : does not work. We could fix that one by delaying the selection update

            state.editor.selection = targetNodeSelection
        }
        // TODO: only reveal range when triggered change occurred via keyboard command?
        //       Do not suddenly scroll the view, when accidentally selecting the whole program.
        state.editor.revealRange(
            toRange(state.currentNode),
            vscode.TextEditorRevealType.InCenterIfOutsideViewport
        )
        // TODO: really always fire event here? Consider sending a second smaller "selected node change event"
        this.activeEditorStateChange.fire(state)
    }

    private async createNewEditorState(editor: TextEditor): Promise<EditorState> {
        logger.log("Starting to create new editor state ...")
        const { document } = editor
        const parseTree = this.parseTrees.get(document) ?? (await this.parseTextDocument(document))
        let state: EditorState = {
            editor,
            insertMode: false,
            currentNode: findNodeAtSelection(parseTree, editor.selection),
            previousNodes: new Array(),
            parseTree,
        }
        logger.log("... editor state created.")
        return state
    }

    private changeActiveEditorState(change: EditorStateChange) {
        const activeState = this.activeEditorState
        if (!activeState) {
            logger.log("WARNING: inconsistent state: no editor active")
            return
        }
        if (activeState.editor !== window.activeTextEditor) {
            logger.log("WARNING: stale editor reference")
            return
        }
        const currentNode = activeState.currentNode

        if (change.insertMode !== undefined) {
            activeState.insertMode = change.insertMode
            this.handleModeChanged(activeState)
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

    private handleModeChanged(state: EditorState) {
        logger.log(`changing insertMode: ${state.insertMode}`)
        commands.executeCommand("setContext", "code-strider:is-insert-mode", state.insertMode)
    }

    withState<T extends readonly unknown[], U extends EditorStateChange>(
        fdefined: (state: Readonly<EditorState>, ...args: T) => Promise<U> | U | undefined,
        fundefined?: (state: undefined, ...args: T) => Promise<void> | unknown | undefined
    ): (...args: T) => Promise<void> {
        return async (...rest) => {
            logger.context("State changing event: " + fdefined.name)
            if (this.activeEditorState) {
                const readonlyState = Object.freeze({ ...this.activeEditorState })
                const change = await fdefined(readonlyState, ...rest)
                if (change !== undefined) {
                    this.changeActiveEditorState(change)
                }
            } else if (fundefined) {
                await fundefined(undefined, ...rest)
            }
            logger.log("State change event done: " + fdefined.name)
        }
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

    // TODO: ensure that multiple edits are correctly processed in order
    handleTextDocumentChange(event: TextDocumentChangeEvent) {
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
        // This is async!
        this.parseTextDocument(document, tree)
    }

    private invalidateEditorStatesForDocument(document: TextDocument, newTree: Parser.Tree) {
        const state = this.activeEditorState
        if (state && state.editor.document === document) {
            state.parseTree = newTree
            // TODO: don't calculate this at every edit?
            state.currentNode = this.findBestNodeForSelection(newTree, state.editor.selection)
            state.previousNodes = new Array() // old references are no longer valid
            this.activeEditorStateChange.fire(state)
        }
    }

    // TODO: there is not "the one" solution to finding the "best" node for the selection
    // Maybe we need to try different ways and choose the best one?
    // if selection completely matches a node -> choose the node
    // if the selection is just a single cursor,
    //   if it is positioned on whitespace
    //      either choose the node on this line, or on a previous line
    //   if not on whitespace -> chose a node on this position?
    // We should also consider whether this is an automatic reaction or a
    //   user generated (mouse selection) event.
    private findBestNodeForSelection(parseTree: Tree, selection: Selection): SyntaxNode {
        // TODO: remove this benchmarking here?
        const timeBefore = Date.now()
        // Is the selection just a single character?
        const currentNode = selection.start.isEqual(selection.end)
            ? findNodeBeforeCursor(parseTree, selection.start)
            : findNodeAtSelection(parseTree, selection)
        logger.log(`finding matching node at selection (took ${Date.now() - timeBefore} ms)`)
        return currentNode
    }
}
