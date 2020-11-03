import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { handleEditorChange } from './activation';
import { movementCommand } from './commands';

export let extensionContext: ExtensionContext;

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
	console.log('Extension "code-strider" is now active!');
	extensionContext = context;

	const registerCommand = function(id: string, handlerFunction: (editor: TextEditor) => void): Disposable {
		return commands.registerTextEditorCommand('code-strider.' + id, handlerFunction);
	};
	context.subscriptions.push(
		registerCommand('first-child', movementCommand((node) => node.firstNamedChild)),
		registerCommand('parent', movementCommand((node) => node.parent)),
		registerCommand('next-sibling', movementCommand((node) => node.nextNamedSibling)),
		registerCommand('previous-sibling', movementCommand((node) => node.previousNamedSibling)),
	);

	window.onDidChangeActiveTextEditor(handleEditorChange);
	handleEditorChange(window.activeTextEditor);
}

export function deactivate() { }
