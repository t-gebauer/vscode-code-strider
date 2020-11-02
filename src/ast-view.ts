import { CancellationToken, Event, ProviderResult, TextDocumentContentProvider, Uri, ViewColumn, window, workspace } from "vscode";
import { getState } from "./activation";

export async function showAST(fileName: string) {
    const scheme = 'code-strider-ast';
    const suffix = '.ast';
    const contentProvider = new class implements TextDocumentContentProvider {
        onDidChange?: Event<Uri> | undefined;
        provideTextDocumentContent(uri: Uri, token: CancellationToken): ProviderResult<string> {
            const fileName = uri.path.substr(0, uri.path.length - suffix.length);
            const state = getState(fileName);
            return formatAST(state.tree.rootNode.toString());
        }
    };
    // TODO: Register once, and dispose correctly
    workspace.registerTextDocumentContentProvider(scheme, contentProvider);

    const uri = Uri.parse(`${scheme}:${fileName}${suffix}`);
    const document = await workspace.openTextDocument(uri);
    await window.showTextDocument(document, {preserveFocus: true, viewColumn: ViewColumn.Beside, preview: true});
}

function formatAST(ast: string): string {
    const indentNum = 2;
    let indentation = 0;
    let output = '';
    for (let index = 0; index < ast.length; index++) {
        const char = ast[index];
        output += char;
        if (char === '(') {
            indentation++;
        } else if (char === ')') {
            indentation--;
        } else if (char === ' ') {
            if (!(ast[index - 1] === ':')) {
                output += '\n' + ' '.repeat(indentation * indentNum);
            } 
        }
    }
    return output;
}