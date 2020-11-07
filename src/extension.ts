import { commands, ExtensionContext, workspace } from 'vscode';
import { registerEditorChangeEvent, withState } from './activation';
import { exitInsertMode } from './commands';
import { handleDocumentChange, initializeParser } from './document-parser';
import { interceptTypeCommand } from './intercept-typing';
import { initializeLanguages } from './language/language-support';
import { statusBar } from './status-bar';

export let extensionContext: ExtensionContext;

// this method is called when your extension is activated
export async function activate(context: ExtensionContext) {
	console.log('Extension "code-strider" is now active!');
	extensionContext = context;

	initializeLanguages();
	await initializeParser();

	context.subscriptions.push(
		statusBar,
		commands.registerTextEditorCommand('type', interceptTypeCommand),
		commands.registerTextEditorCommand('code-strider:exit-insert-mode', withState(exitInsertMode)),
		registerEditorChangeEvent(),
		workspace.onDidChangeTextDocument(handleDocumentChange),
	);

}

export function deactivate() { }
