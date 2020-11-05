import { commands, Disposable, ExtensionContext, TextEditor, window } from 'vscode';
import { initializeParser } from './activation';
import { interceptTypeCommand } from './intercept-typing';
import { initializeLanguages } from './language-support';

export let extensionContext: ExtensionContext;

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
	console.log('Extension "code-strider" is now active!');
	extensionContext = context;

	context.subscriptions.push(
		commands.registerTextEditorCommand('type', interceptTypeCommand)
	);

	initializeLanguages();
	initializeParser();
}

export function deactivate() { }