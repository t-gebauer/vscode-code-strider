import {
    Disposable,
    EventEmitter,
    Position,
    ProviderResult,
    Range,
    TextDocument,
    TextDocumentContentProvider,
    TextEditor,
    TextEditorRevealType,
    Uri,
    ViewColumn,
    window,
    workspace,
} from "vscode"
import { SyntaxNode, Tree, TreeCursor } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { Extension, logger } from "./extension"

const URI_SCHEME = "code-strider-ast"
const AST_FILE_SUFFIX = ".ast"

function createUri(document: TextDocument): Uri {
    return Uri.parse(`${URI_SCHEME}:${document.fileName}${AST_FILE_SUFFIX}`)
}

export class AstViewer implements Disposable {
    static async create(ext: Extension, state: EditorState): Promise<AstViewer> {
        const astView = new AstViewer()
        ext.onActiveEditorStateChange((newState: EditorState | undefined) => {
            astView.setOrUpdateState(newState)
        })
        astView.setOrUpdateState(state)
        await astView.show(state)
        return astView
    }

    private parseTree?: Tree
    private editorState?: EditorState
    private rangeFinder?: (node: SyntaxNode) => Range | undefined
    private editorWindow?: TextEditor

    private readonly subscriptions: Disposable[] = []
    private nodeDecoration = window.createTextEditorDecorationType({ backgroundColor: "#333" })

    contentProvider = new (class implements TextDocumentContentProvider {
        contentChangeEmitter = new EventEmitter<Uri>()
        onDidChange = this.contentChangeEmitter.event
        content = ""
        provideTextDocumentContent(): ProviderResult<string> {
            logger.debug("AST view: Providing TextDocument content")
            return this.content
        }
    })()

    constructor() {
        this.subscriptions.push(
            workspace.registerTextDocumentContentProvider(URI_SCHEME, this.contentProvider)
        )
    }

    setOrUpdateState(editorState: EditorState | undefined) {
        this.editorState = editorState;
        if (editorState === undefined) {
            // remove decorations
            this.editorWindow?.setDecorations(this.nodeDecoration, []);
                return;
        }
        if (!editorState.insertMode && editorState.parseTree !== this.parseTree) {
            logger.debug("AST view: Parse tree change detected")
            this.parseTree = editorState.parseTree
            this.editorState = editorState
            // DO this when the parse tree has changed, e.g. the content changed
            const [content, rangeFinder] = renderTree(editorState.parseTree)
            this.contentProvider.content = content
            this.rangeFinder = rangeFinder
            this.contentProvider.contentChangeEmitter.fire(createUri(editorState.editor.document))
        }
        // TODO: Do we need to wait for the new content to be displayed before updating the decorations?
        this.updateDecorations()
    }

    private updateDecorations() {
        if (!this.editorState || !this.rangeFinder || !this.editorWindow) {
            return
        }

        const node = this.editorState.currentNode
        const currentRange = this.rangeFinder(node)
        if (currentRange) {
            this.editorWindow.setDecorations(this.nodeDecoration, [currentRange])
            this.editorWindow.revealRange(
                currentRange,
                TextEditorRevealType.InCenterIfOutsideViewport
            )
        }
    }

    async show(editorState: EditorState) {
        const document = await workspace.openTextDocument(createUri(editorState.editor.document))
        this.editorWindow = await window.showTextDocument(document, {
            preserveFocus: true,
            viewColumn: ViewColumn.Beside,
            preview: true,
        })
        this.updateDecorations();
    }

    dispose() {
        // We could hide the AST view window here?
        // But `TextEditor.hide()` is deprecated.
        Disposable.from(
            ...this.subscriptions,
            this.nodeDecoration,
            this.contentProvider.contentChangeEmitter
        ).dispose()
    }
}

/**
 * Render the given parse tree to a string.
 *
 * @returns a tuple of
 *   1. the rendered string and
 *   2. a function to query the position of the string representation of
 *      a SyntaxNode in the rendered string.
 */
function renderTree(
    tree: Tree
): [source: string, getRange: (node: SyntaxNode) => Range | undefined] {
    const ranges = new Map<string, Range>()
    const cursor = tree.walk()

    function renderNode(cursor: TreeCursor, indentLevel: number, startRow: number): string {
        let content = ""
        // skip un-named nodes
        if (!cursor.nodeIsNamed) {
            if (cursor.gotoFirstChild()) {
                content += renderNode(cursor, indentLevel, startRow)
            }
            if (cursor.gotoNextSibling()) {
                content += renderNode(cursor, indentLevel, startRow)
                return content
            }
            cursor.gotoParent()
            return content
        }
        // add own description
        content += "\n" + makeIndent(indentLevel) + printFieldName(cursor) + "(" + cursor.nodeType
        // render all children
        if (cursor.gotoFirstChild()) {
            content += renderNode(cursor, indentLevel + 1, startRow + 1)
        }
        // finish this node
        content += ")"
        const lines = content.split("\n")
        // save range information for this node
        ranges.set(
            nodeIndex(cursor),
            new Range(
                new Position(startRow + 1, makeIndent(indentLevel).length),
                new Position(startRow + lines.length - 1, lines[lines.length - 1].length)
            )
        )
        // go to next sibling
        if (cursor.gotoNextSibling()) {
            return content + renderNode(cursor, indentLevel, startRow + lines.length - 1)
        }
        cursor.gotoParent()
        return content
    }

    const content = renderNode(cursor, 0, 0)

    return [content, (node) => ranges.get(nodeIndex(node))]
}

/** Returns a unique string to uniquely identify a SyntaxNode in the parse tree. */
function nodeIndex(node: SyntaxNode | TreeCursor): string {
    const type = isSyntaxNode(node) ? node.type : node.nodeType
    return `${type}:${node.startIndex}:${node.endIndex}`
}

function makeIndent(level: number): string {
    return "  ".repeat(level)
}

function printFieldName(cursor: TreeCursor): string {
    const name = cursor.currentFieldName()
    return name !== null ? `${name}: ` : ""
}

function isSyntaxNode(node: SyntaxNode | TreeCursor): node is SyntaxNode {
    return (node as SyntaxNode).type !== undefined
}
