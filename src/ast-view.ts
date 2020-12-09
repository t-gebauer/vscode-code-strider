import { compileFunction } from "vm"
import {
    Disposable,
    Event,
    Position,
    ProviderResult,
    Range,
    TextDocumentContentProvider,
    TextEditorRevealType,
    Uri,
    ViewColumn,
    window,
    workspace,
} from "vscode"
import { SyntaxNode, Tree, TreeCursor } from "web-tree-sitter"
import { EditorState } from "./editor-state"

export interface AstView extends Disposable {
    updateSelectedNode: (node: SyntaxNode) => void
}

/**
 * Print the AST of the given editorState in a new editor window
 */
export async function showAstView(editorState: EditorState): Promise<AstView> {
    const subscriptions: Disposable[] = []
    const nodeDecoration = window.createTextEditorDecorationType({ backgroundColor: "#333" })
    subscriptions.push(nodeDecoration)

    const [content, getRangeForNode] = renderTree(editorState.parseTree)

    // Register content provider
    // There can only be one provider per scheme, so we effectively unregister the previous one.
    const scheme = "code-strider-ast"
    const suffix = ".ast"
    const contentProvider = new (class implements TextDocumentContentProvider {
        onDidChange?: Event<Uri> | undefined
        provideTextDocumentContent(): ProviderResult<string> {
            return content
        }
    })()
    subscriptions.push(workspace.registerTextDocumentContentProvider(scheme, contentProvider))

    // The URI does not matter if we create a new content provider each time?
    // But we add some randomness to force VS Code to update the content.
    // TODO: Use the `onDidChange` event for this?
    const uri = Uri.parse(
        `${scheme}:${editorState.editor.document.fileName}.${Math.floor(
            Math.random() * 100000
        )}${suffix}`
    )
    const document = await workspace.openTextDocument(uri)
    const editor = await window.showTextDocument(document, {
        preserveFocus: true,
        viewColumn: ViewColumn.Beside,
        preview: true,
    })

    function updateSelectedNode(node: SyntaxNode) {
        const currentRange = getRangeForNode(node)
        if (currentRange) {
            editor.setDecorations(nodeDecoration, [currentRange])
            editor.revealRange(currentRange, TextEditorRevealType.InCenterIfOutsideViewport)
        }
    }
    updateSelectedNode(editorState.currentNode)

    return {
        updateSelectedNode,
        dispose: () => subscriptions.forEach((it) => it.dispose()),
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

    const result = renderNode(cursor)

    return [result.content, (node) => ranges.get(nodeIndex(node))]
}

type ReturnValue = { content: string; positions: Map<string, Range>; isNamed: boolean }
const INDENT = "  "

function renderNode(cursor: TreeCursor): ReturnValue {
    const children: Array<ReturnValue> = []
    if (cursor.gotoFirstChild()) {
        children.push(renderNode(cursor))
        while (cursor.gotoNextSibling()) {
            children.push(renderNode(cursor))
        }
        cursor.gotoParent()
    }
    const namedChildren = children.filter((it) => it.isNamed)
    const combinedChildContent = namedChildren
        .flatMap((it) => it.content.split("\n"))
        .map((it) => INDENT + it)
        .join("\n")

    function ownNameAroundChildContent() {
        return (
            printFieldName(cursor) +
            "(" +
            cursor.nodeType +
            (namedChildren.length > 0 ? "\n" + combinedChildContent : "") +
            ")"
        )
    }

    return {
        content: cursor.nodeIsNamed ? ownNameAroundChildContent() : combinedChildContent,
        positions: new Map(),
        isNamed: cursor.nodeIsNamed,
    }
}

// utility function: visitTree ?

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

function notNull<T>(element: T | null | undefined): element is T {
    return element != null
}
