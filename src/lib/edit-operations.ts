import { Point, SyntaxNode } from "web-tree-sitter"
import { EditActions, SimpleRange } from "./interop"

/** Technically the same as a Point, but conceptually different? */
type RelPoint = Point

function _add(point: Point, other: RelPoint): Point {
    return {
        row: point.row + other.row,
        column: other.row === 0 ? point.column + other.column : other.column,
    }
}

function add(point: Point, ...others: RelPoint[]): Point {
    return others.reduce(_add, point)
}

function subtract(point: Point, other: Point): RelPoint {
    return {
        row: point.row - other.row,
        column: point.row === other.row ? point.column - other.column : point.column,
    }
}

function relativeOffset(range: SimpleRange): RelPoint {
    return subtract(range.endPosition, range.startPosition)
}

/** This only works if both nodes have the same parent and the firstNode is before the secondNode. */
function editBetweenSiblings(firstNode: SyntaxNode, secondNode: SyntaxNode) {
    const parent = firstNode.parent!! // A node which has a sibling also has a parent.
    const textInBetween = parent.text.substring(
        firstNode.endIndex - parent.startIndex,
        secondNode.startIndex - parent.startIndex
    )
    const combinedText = secondNode.text + textInBetween + firstNode.text
    return {
        range: { startPosition: firstNode.startPosition, endPosition: secondNode.endPosition },
        text: combinedText,
    }
}

export function transposeNext(node: SyntaxNode): EditActions {
    const next = node.nextNamedSibling
    if (!next) {
        return {}
    }
    const edit = editBetweenSiblings(node, next)

    const separatorRelative = subtract(next.startPosition, node.endPosition)
    const newStart = add(node.startPosition, relativeOffset(next), separatorRelative)
    const select = {
        startPosition: newStart,
        endPosition: add(newStart, relativeOffset(node)),
    }
    return { edit, select }
}

export function transposePrevious(node: SyntaxNode): EditActions {
    const previous = node.previousNamedSibling
    if (!previous) {
        return {}
    }
    const edit = editBetweenSiblings(previous, node)
    const select = {
        startPosition: previous.startPosition,
        endPosition: add(previous.startPosition, relativeOffset(node)),
    }
    return { edit, select }
}

/**
 * Raises all *named* children; will not work for XML-like languages.
 */
export function splice(node: SyntaxNode): EditActions {
    const firstChild = node.firstNamedChild
    const lastChild = node.lastNamedChild
    if (!firstChild || !lastChild) {
        return {}
    }
    return {
        edit: {
            range: node,
            text: node.text.substring(
                firstChild.startIndex - node.startIndex,
                lastChild.endIndex - node.startIndex
            ),
        },
        select: {
            startPosition: node.startPosition,
            endPosition: add(node.startPosition, relativeOffset(firstChild)),
        },
    }
}
