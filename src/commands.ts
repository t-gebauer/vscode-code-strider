import { TextEditor, TextEditorDecorationType, window } from 'vscode';
import { SyntaxNode } from 'web-tree-sitter';
import { getState, State } from './activation';
import { NodeAccessorFunction, LanguageDefinition, CommandName } from './language/language-definition';
import { isLanguageSupported, getOverrideFor } from './language/language-support';
import { statusBar } from './status-bar';
import { toRange } from './utilities';

export type CommandFunction = (editor: TextEditor) => void;

function wrapCommand(actualCommand: (state: State, editor: TextEditor) => void): CommandFunction {
    return (editor: TextEditor) => {
        if (!isLanguageSupported(editor.document.languageId)) { return; }

        const state = getState(editor.document.fileName);
        actualCommand(state, editor);

        statusBar.updateNodeType(state.currentNode.type);
    };
}

function movementCommand(selectNext: NodeAccessorFunction): CommandFunction {
    return wrapCommand((state: State, editor: TextEditor) => {
        const node = state.currentNode;
        if (!node) { return; }
        const next = selectNext(node);
        if (next) {
            state.currentNode = next;
            selectNode(editor, next);
        }
    });
}

export function commandsForLanguage(languageDefinition: LanguageDefinition) {

    function withOverride(commandName: CommandName, defaultFunction: NodeAccessorFunction): NodeAccessorFunction {
        return node => {
            const overrideFun = getOverrideFor(languageDefinition, commandName, node);
            if (overrideFun) {
                return overrideFun(node);
            }
            return defaultFunction(node);
        };
    }

    const gotoParent = movementCommand(withOverride('gotoParent', node => node.parent));
    const gotoFirstChild = movementCommand(withOverride('firstChild', node => node.firstNamedChild));
    const gotoNextSibling = movementCommand(withOverride('nextSibling', node => node.nextNamedSibling));
    const gotoPreviousSibling = movementCommand(withOverride('previousSibling', node => node.previousNamedSibling));

    return { gotoParent, gotoFirstChild, gotoNextSibling, gotoPreviousSibling };
}

// TODO: dispose the decoration type?
const currentDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#555"
});

const firstChildDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#533"
});

const nextDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#338"
});

const previousDecorationType = window.createTextEditorDecorationType({
    backgroundColor: "#484"
});

function setOrResetDecorations(editor: TextEditor, decorationType: TextEditorDecorationType, node: SyntaxNode | null) {
    if (node) {
        editor.setDecorations(decorationType, [toRange(node)]);
    } else {
        editor.setDecorations(decorationType, []);
    }
}

export function selectNode(editor: TextEditor, node: SyntaxNode): void {
    //setOrResetDecorations(editor, parentDecorationType, node.parent);
    //setOrResetDecorations(editor, nextDecorationType, node.nextNamedSibling);
    //setOrResetDecorations(editor, previousDecorationType, node.previousNamedSibling);
    //setOrResetDecorations(editor, firstChildDecorationType, node.firstNamedChild);
    //editor.selection = toSelection(node);
    editor.setDecorations(currentDecorationType, [toRange(node)]);
}