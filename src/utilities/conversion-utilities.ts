import { Position, Range, Selection } from "vscode"
import Parser = require("web-tree-sitter")

export function toPoint(position: Position): Parser.Point {
    return { row: position.line, column: position.character }
}

export function toPosition(point: Parser.Point) {
    return new Position(point.row, point.column)
}

export function toSelection(node: Parser.Range): Selection {
    return new Selection(toPosition(node.startPosition), toPosition(node.endPosition))
}

export function toRange(node: Parser.Range): Range {
    return toSelection(node)
}
