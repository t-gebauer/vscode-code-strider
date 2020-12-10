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
 * Print the AST of the given editorState in a new editor window.
 *
 * TODO: This blindly opens a new editor window to the right of the currently selected.
 *       Reuse an existing AST View window instead.
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

    // TODO: The URI does not matter if we create a new content provider each time?
    // But we add some randomness to force VS Code to update the content.
    // Use the `onDidChange` event for this?
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
