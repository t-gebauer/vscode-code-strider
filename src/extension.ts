import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { handleEditorChange } from './activation';
import { interceptTypeCommand } from './intercept-typing';

export let extensionContext: ExtensionContext;

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
	console.log('Extension "code-strider" is now active!');
	extensionContext = context;

	context.subscriptions.push(
		commands.registerTextEditorCommand('type', interceptTypeCommand)
	);

	window.onDidChangeActiveTextEditor(handleEditorChange);
	handleEditorChange(window.activeTextEditor);
}

export function deactivate() { }