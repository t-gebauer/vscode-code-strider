import { TextEditor } from "vscode";
import * as Parser from 'web-tree-sitter';
import { SyntaxNode } from "web-tree-sitter";

interface State {
    currentNode: SyntaxNode;
    parser: Parser;
}
const stateMap = new Map<TextEditor, State>();

export function getState(editor: TextEditor): State {
    // TODO: handle this better?
    // We can make this non-null assertion here, because we know that a parser has
    // already been initialised for any editor on editor change.
    const state = stateMap.get(editor);
    if (!state) {
        console.error('State not initialized!');
    }
    return state!!;
}

function canHandleThisLanguage(languageId: string): boolean {
    return languageId === 'javascript' || languageId === 'html';
}

function loadTreeSitterLanguage(languageId: string) {
    switch (languageId) {
        case 'javascript':
        case 'html':
        default:
            return Parser.Language.load(`./wasm/tree-sitter-${languageId}.wasm`);
    }
}

export async function handleEditorChange(textEditor: TextEditor | undefined) {
    if (!textEditor) {
        return;
    }

    console.log('Editor changed');
    console.log(textEditor?.document.languageId);
    const languageId = textEditor.document.languageId;

    if (canHandleThisLanguage(languageId)) {
        await Parser.init();

        let state = stateMap.get(textEditor);
        if (!state) {
            const parser = new Parser();
            parser.setLanguage(await loadTreeSitterLanguage(languageId));
            const tree = parser.parse(textEditor.document.getText());
            state = { parser, currentNode: tree.rootNode };
            stateMap.set(textEditor, state);
        }
    }
}