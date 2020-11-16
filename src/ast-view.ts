import { CancellationToken, Event, Position, ProviderResult, Range, TextDocumentContentProvider, TextEditorDecorationType, TextEditorRevealType, Uri, ViewColumn, window, workspace } from "vscode";
import { SyntaxNode, TreeCursor } from "web-tree-sitter";
import { EditorState } from "./editor-state";

// TODO: Dispose, I guess we should?
const nodeDecoration = window.createTextEditorDecorationType({ backgroundColor: '#333' });

export async function showAST(state: EditorState) {

    // TODO: only re-render the tree on changes
    const [content, nodeRanges] = renderTree(state);

    // Register content provider
    const scheme = 'code-strider-ast';
    const suffix = '.ast';
    const contentProvider = new class implements TextDocumentContentProvider {
        onDidChange?: Event<Uri> | undefined;
        provideTextDocumentContent(uri: Uri, _: CancellationToken): ProviderResult<string> {
            return content;
        }
    };
    // TODO: Register once, and dispose correctly
    workspace.registerTextDocumentContentProvider(scheme, contentProvider);

    // The URI does not matter if we create a new content provider each time?
    // But we add some randomness to force VS Code to update the content.
    // TODO: Use the `onDidChange` event for this?
    const uri = Uri.parse(`${scheme}:${state.editor.document.fileName}.${Math.floor(Math.random()*100000)}${suffix}`);
    const document = await workspace.openTextDocument(uri);
    const editor = await window.showTextDocument(document, { preserveFocus: true, viewColumn: ViewColumn.Beside, preview: true });

    // Highlight currently selected node
    const currentRange = nodeRanges.get(nodeIndex(state.currentNode));
    if (currentRange) {
        editor.setDecorations(nodeDecoration, [currentRange]);
        editor.revealRange(currentRange, TextEditorRevealType.InCenterIfOutsideViewport);    
    }
}

function renderTree(state: EditorState): [source: string, ranges: Map<string, Range>] {
    const ranges = new Map<string, Range>();
    const cursor = state.parseTree.walk();

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
        ranges.set(`${cursor.startIndex},${cursor.endIndex}`,
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

    return [content, ranges];
}

function nodeIndex(node: SyntaxNode): string {
    return `${node.startIndex},${node.endIndex}`;
}

function makeIndent(level: number): string {
    return '  '.repeat(level);
}
