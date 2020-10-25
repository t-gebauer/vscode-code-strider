// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { handleEditorChange } from './activation';
import { nextSibling, previousSibling, gotoParent, gotoFirstChild } from './javascript';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "code-strider" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('code-strider.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from code-strider!');
	});

	context.subscriptions.push(disposable);

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('code-strider.firstChild', (editor) => {
			//vscode.window.showInformationMessage('command: firstChild');
			gotoFirstChild(editor);
		}));
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('code-strider.gotoParent', (editor) => {
			//vscode.window.showInformationMessage('command: gotoParent');
			gotoParent(editor);
		}));
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('code-strider.nextSibling', (editor) => {
			//vscode.window.showInformationMessage('command: nextSibling');
			nextSibling(editor);
		}));
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand('code-strider.previousSibling', (editor) => {
			//vscode.window.showInformationMessage('command: previousSibling');
			previousSibling(editor);
		}));

	vscode.window.onDidChangeActiveTextEditor(handleEditorChange);
	handleEditorChange(vscode.window.activeTextEditor);
}

// this method is caled when your extension is deactivated
export function deactivate() { }
