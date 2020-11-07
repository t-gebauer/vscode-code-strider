import { Position, Range, Selection } from "vscode";
import { SyntaxNode } from "web-tree-sitter";
import Parser = require("web-tree-sitter");
import { extensionContext } from "./extension";
import * as fs from 'fs';

export function toPoint(position: Position): Parser.Point {
    return { row: position.line, column: position.character };
}

export function toPosition(point: Parser.Point) {
    return new Position(point.row, point.column);
}

export function toSelection(node: SyntaxNode): Selection {
    return new Selection(
        toPosition(node.startPosition),
        toPosition(node.endPosition)
    );
}

export function toRange(node: SyntaxNode): Range {
    return toSelection(node);
}

export function loadTreeSitterLanguage(languageId: string): Promise<Parser.Language> {
    const wasmFilePath = extensionContext.asAbsolutePath(`./wasm/tree-sitter-${languageId}.wasm`);
    if (!fs.existsSync(wasmFilePath)) {
        throw new Error(`Missing language file: '${wasmFilePath}'`);
    }
    return Parser.Language.load(wasmFilePath);
}