import { Disposable, Event, Position, ProviderResult, Range, TextDocumentContentProvider, TextEditorRevealType, Uri, ViewColumn, window, workspace } from "vscode";
import { SyntaxNode, Tree, TreeCursor } from "web-tree-sitter";
import { EditorState } from "./editor-state";

export interface AstView extends Disposable {
    updateSelectedNode: (node: SyntaxNode) => void,
}

/**
 * Print the AST of the given editorState in a new editor window
 */
export async function showAstView(editorState: EditorState): Promise<AstView> {
    const subscriptions: Disposable[] = [];
    const nodeDecoration = window.createTextEditorDecorationType({ backgroundColor: '#333' });
    subscriptions.push(nodeDecoration);

    const [content, getRangeForNode] = renderTree(editorState.parseTree);

    // Register content provider
    // There can only be one provider per scheme, so we effectively unregister the previous one.
    const scheme = 'code-strider-ast';
    const suffix = '.ast';
    const contentProvider = new class implements TextDocumentContentProvider {
        onDidChange?: Event<Uri> | undefined;
        provideTextDocumentContent(): ProviderResult<string> {
            return content;
        }
    };
    subscriptions.push(
        workspace.registerTextDocumentContentProvider(scheme, contentProvider)
    );

    // The URI does not matter if we create a new content provider each time?
    // But we add some randomness to force VS Code to update the content.
    // TODO: Use the `onDidChange` event for this?
    const uri = Uri.parse(`${scheme}:${editorState.editor.document.fileName}.${Math.floor(Math.random() * 100000)}${suffix}`);
    const document = await workspace.openTextDocument(uri);
    const editor = await window.showTextDocument(document, { preserveFocus: true, viewColumn: ViewColumn.Beside, preview: true });

    function updateSelectedNode(node: SyntaxNode) {
        const currentRange = getRangeForNode(node);
        if (currentRange) {
            editor.setDecorations(nodeDecoration, [currentRange]);
            editor.revealRange(currentRange, TextEditorRevealType.InCenterIfOutsideViewport);
        }
    }
    updateSelectedNode(editorState.currentNode);

    return {
        updateSelectedNode,
        dispose: () => subscriptions.forEach(it => it.dispose()),
    };
}

function renderTree(tree: Tree): [source: string, getRange: (node: SyntaxNode) => Range | undefined] {
    const ranges = new Map<string, Range>();
    const cursor = tree.walk();

    function renderNode(cursor: TreeCursor, indentLevel: number, startRow: number): string {
        let content = '';
        if (!cursor.nodeIsNamed) {
            // ignore all un-named nodes
            if (cursor.gotoFirstChild()) {
                content += renderNode(cursor, indentLevel, startRow);
            }
            if (cursor.gotoNextSibling()) {
                content += renderNode(cursor, indentLevel, startRow);
                return content;
            }
            cursor.gotoParent();
            return content;
        }
        content += '\n' + makeIndent(indentLevel) + '(' + cursor.nodeType;
        if (cursor.gotoFirstChild()) {
            content += renderNode(cursor, indentLevel + 1, startRow + 1);
        }
        content += ')';
        const lines = content.split('\n');
        ranges.set(nodeIndex(cursor),
            new Range(
                new Position(startRow + 1, makeIndent(indentLevel).length),
                new Position(startRow + lines.length - 1, lines[lines.length - 1].length),
            ));
        if (cursor.gotoNextSibling()) {
            return content + renderNode(cursor, indentLevel, startRow + lines.length - 1);
        }
        cursor.gotoParent();
        return content;
    }

    const content = renderNode(cursor, 0, 0);

    return [content, (node) => ranges.get(nodeIndex(node))];
}

function nodeIndex(node: { startIndex: number, endIndex: number }): string {
    return `${node.startIndex},${node.endIndex}`;
}

function makeIndent(level: number): string {
    return '  '.repeat(level);
}
