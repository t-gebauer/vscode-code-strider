// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

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
    editCommands,
} from "./commands"
import { EditorState } from "./editor-state"
import { interceptTypeCommand } from "./intercept-typing"
import { Languages } from "./lib/language-support"
import { registerStatusBar } from "./status-bar"
import { toPoint, toRange, toSelection, toSimpleRange } from "./conversion-utilities"
import { composeTreeEdit, findNodeAtSelection, findNodeBeforeCursor } from "./lib/tree-utilities"
import Parser = require("web-tree-sitter")
import { registerDecorationHandler } from "./decoration"
import { Logger } from "./lib/logger"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { TreeSitter } from "./lib/tree-sitter"
import { moveDown, moveLeft, moveRight, moveUp } from "./spatial-movement-commands"
import { Delayer } from "./utils"
import { OutputChannelLogger } from "./output-channel-logger"

export let logger: Logger

// Main entry point. This method is called when the extension is activated. Configured in package.json.
export async function activate(context: ExtensionContext) {
    const outputChannelLogger = new OutputChannelLogger("Code-strider [Debug]")
    logger = outputChannelLogger
    logger.context("Activation ...")

    const treeSitter = new TreeSitter(context.asAbsolutePath("./wasm/"), logger)
    await treeSitter.initialize()

    const ext = new Extension(treeSitter)
    ext.registerEventHandlers()

    context.subscriptions.push(
        ext,
        outputChannelLogger,
        registerStatusBar(ext),
        registerDecorationHandler(ext),
        // It is necessary to intercept the default type command to block all input unless in insert mode.
        commands.registerTextEditorCommand(
            "type",
            ext.withState(interceptTypeCommand, interceptTypeCommand)
        ),
        commands.registerTextEditorCommand(
            "code-strider:toggle-structural-navigation",
            ext.toggleStructuralNavigationCommand.bind(ext)
        ),
        commands.registerTextEditorCommand(
            "code-strider:toggle-ast-viewer",
            ext.toggleAstViewerCommand.bind(ext)
        ),
        // Show the debug log output channel
        commands.registerTextEditorCommand("code-strider:show-log", () =>
            logger.show ? logger.show() : undefined
        ),
        // Command used at the start of integration tests to wait until the extension is initialized
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
    // TODO: slurping and barfing only works for HTML (or similar languages).
    registerCommandWithState("slurp-backward", editCommands.slurpBackwardHtml)
    registerCommandWithState("slurp-forward", editCommands.slurpForwardHtml)
    registerCommandWithState("barf-backward", editCommands.barfBackwardHtml)
    registerCommandWithState("barf-forward", editCommands.barfForwardHtml)

    // language agnostic editing commands
    registerCommandWithState("transpose-next", editCommands.transposeNext)
    registerCommandWithState("transpose-previous", editCommands.transposePrevious)
    registerCommandWithState("splice", editCommands.splice)

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

/**
 * All commands either modify the buffer directly via the TextEditor reference or use
 * this interface to request changes to the currently active state.
 */
export type EditorStateChange = {
    currentNode?: SyntaxNode
    insertMode?: boolean
    backToPreviousNode?: true
}

// effectively a singleton, combining the whole state of the extension
export class Extension implements Disposable {
    private activeEditorStateChange = new EventEmitter<EditorState | undefined>()
    readonly onActiveEditorStateChange: Event<EditorState | undefined> = this
        .activeEditorStateChange.event
    private activeEditorState?: EditorState

    private astViewer?: AstViewer

    private readonly subscriptions: { dispose(): unknown }[] = []

    // config `defaultMode`
    private startInInsertMode = true

    constructor(private readonly treeSitter: TreeSitter) {
        this.readConfiguration()
    }

    registerEventHandlers() {
        this.subscriptions.push(
            window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this)),
            window.onDidChangeTextEditorSelection(this.onDidChangeTextEditorSelection.bind(this)),
            workspace.onDidChangeTextDocument(this.handleTextDocumentChange.bind(this)),
            workspace.onDidChangeConfiguration(this.handleConfigurationChange.bind(this))
        )
    }

    toggleStructuralNavigationCommand() {
        if (this.activeEditorState) {
            logger.context("Stopping structural navigation")
            this.stopStructuralNavigation()
        } else if (window.activeTextEditor) {
            logger.context("Activating structural navigation")
            this.startStructuralNavigation(window.activeTextEditor)
        }
    }

    toggleAstViewerCommand() {
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
        if (!editor || !isEditorSupported || this.startInInsertMode) {
            this.stopStructuralNavigation()
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
        setTimeout(() => this.startStructuralNavigation(editor), 1)
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
            // TODO: automatically changing the selection causes way too many problems?
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

    private startStructuralNavigation(editor: TextEditor) {
        const promise = this.createNewEditorState(editor)
        promise.then((newState) => {
            this.activeEditorState = newState
            this.handleSelectedNodeChanged(newState)
            this.handleModeChanged(newState)
        })
    }

    private stopStructuralNavigation() {
        this.activeEditorState = undefined
        commands.executeCommand("setContext", "code-strider:is-insert-mode", true)
        this.activeEditorStateChange.fire(undefined)
    }

    private async createNewEditorState(editor: TextEditor): Promise<EditorState> {
        logger.log("Starting to create new editor state ...")
        const { document } = editor
        const parseTree = this.parseTrees.get(document) ?? (await this.parseTextDocument(document))
        let state: EditorState = {
            editor,
            insertMode: false,
            currentNode: findNodeAtSelection(parseTree, toSimpleRange(editor.selection)),
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
            if (this.activeEditorState) {
                logger.context("State changing event: " + fdefined.name)
                const readonlyState = Object.freeze({ ...this.activeEditorState })
                const change = await fdefined(readonlyState, ...rest)
                if (change !== undefined) {
                    this.changeActiveEditorState(change)
                }
                logger.log("State change event done: " + fdefined.name)
            } else if (fundefined) {
                await fundefined(undefined, ...rest)
            }
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

    // TODO: ensure that multiple edits are correctly processed in order?
    handleTextDocumentChange(event: TextDocumentChangeEvent) {
        const { document, contentChanges } = event
        // Did the content change? The event is also fired when other properties of the document change.
        if (contentChanges.length === 0) return
        const tree = this.parseTrees.get(document)
        if (!tree) return

        logger.context("Event: TextDocument content changed")
        contentChanges.forEach((change) => {
            tree.edit(
                composeTreeEdit(
                    toSimpleRange(change.range),
                    change.rangeOffset,
                    change.rangeLength,
                    change.text
                )
            )
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
        const timeBefore = Date.now()
        // Is the selection just a single character?
        const currentNode = selection.start.isEqual(selection.end)
            ? findNodeBeforeCursor(parseTree, toPoint(selection.start))
            : findNodeAtSelection(parseTree, toSimpleRange(selection))
        logger.log(`finding matching node at selection (took ${Date.now() - timeBefore} ms)`)
        return currentNode
    }

    private handleConfigurationChange(event: vscode.ConfigurationChangeEvent) {
        logger.context("Event: configuration change detected")
        if (event.affectsConfiguration("code-strider")) {
            this.readConfiguration()
        } else {
            logger.log("does not effect code-strider")
        }
    }

    private readConfiguration() {
        logger.log("checking configuration")
        const config = workspace.getConfiguration("code-strider")
        const defaultMode = config.get("defaultMode")
        if (defaultMode !== undefined) {
            logger.log(`defaultMode: ${defaultMode}`)
            this.startInInsertMode = defaultMode === "insert"
        }
    }
}
