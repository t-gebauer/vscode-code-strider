import { ProgressLocation, TextDocument, TextDocumentChangeEvent, window } from "vscode";
import Parser = require("web-tree-sitter");
import { invalidateEditorStatesForDocument } from "./activation";
import { toPoint } from "./utilities/conversion-utilities";
import { loadTreeSitterLanguage } from "./utilities/tree-sitter-utilities";

export async function initializeParser() {
    // This is so fast on my machine, that it is hardly noticeable.
    await window.withProgress(
        // Theoretically, displays a loading indicator in the status bar.
        { location: ProgressLocation.Window, title: 'Initializing Parser...' },
        () => Parser.init()
    );
}

// State per open file (parse tree caching, incremental parsing)
const parseTrees = new Map<TextDocument, Parser.Tree>();

// TODO: onchange callback?
export async function parseDocument(document: TextDocument): Promise<Parser.Tree> {
    const existingTree = parseTrees.get(document);
    if (existingTree) { return existingTree; }

    const languageId = document.languageId;

    const parser = new Parser();
    parser.setLanguage(await loadTreeSitterLanguage(languageId));
    const tree = parser.parse(document.getText());
    parseTrees.set(document, tree);
    return tree;
}

export async function handleDocumentChange(event: TextDocumentChangeEvent) {
    const { document, contentChanges } = event;

    if (contentChanges.length === 0) { return; }

    const tree = parseTrees.get(document);
    if (!tree) { return; }

    // TODO: Does the tree editing really work?
    // Can we test the speed? Is this really faster than parsing from scratch?
    contentChanges.forEach(change => {
        const newLines = change.text.split('\n'); // TODO: different end-of-line sequences?

        // TODO: test it
        const edit = {
            startIndex: change.rangeOffset,
            oldEndIndex: change.rangeOffset + change.rangeLength,
            newEndIndex: change.rangeOffset + change.text.length,
            startPosition: toPoint(change.range.start),
            oldEndPosition: toPoint(change.range.end),
            newEndPosition: {
                row: change.range.start.line + newLines.length - 1,
                column: newLines.length > 1 ? newLines[newLines.length - 1].length : change.range.start.character + change.text.length
            },
        };
        tree.edit(edit);
    });

    const parser = new Parser();
    parser.setLanguage(await loadTreeSitterLanguage(document.languageId));
    const newTree = parser.parse(document.getText(), tree);

    parseTrees.set(document, newTree);
    invalidateEditorStatesForDocument(document, newTree);
}