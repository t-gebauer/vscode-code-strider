// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { Position, Range, Selection } from "vscode"
import Parser = require("web-tree-sitter")
import { SimpleRange } from "./lib/node-utilities"

export function toPoint(position: Position): Parser.Point {
    return { row: position.line, column: position.character }
}

export function toPosition(point: Parser.Point) {
    return new Position(point.row, point.column)
}

export function toSelection(node: {
    startPosition: Parser.Point
    endPosition: Parser.Point
}): Selection {
    return new Selection(toPosition(node.startPosition), toPosition(node.endPosition))
}

export function toRange(node: Parser.Range): Range {
    return toSelection(node)
}

export function toSimpleRange(thing: Range): SimpleRange {
    return {
        startPosition: toPoint(thing.start),
        endPosition: toPoint(thing.end)
    }
}
