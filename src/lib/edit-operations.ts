import { Point, SyntaxNode } from "web-tree-sitter"
import { EditActions, SimpleRange } from "./interop"
import { nextChild, nextSibling } from "./node-utilities"

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

function toPoint(text: string): Point {
    const lines = text.split("\n")
    return {
        row: lines.length - 1,
        column: lines[lines.length - 1].length,
    }
}

/** Places the last child behind the next sibling */
export function slurpForwardHtml(node: SyntaxNode): EditActions {
    const next = nextSibling(node)
    const lastChild = nextChild(node, false)
    if (!next || !lastChild) {
        return {}
    }
    const parent = node.parent!! // A node with a sibling also has a parent.
    const textInBetween = parent.text.substring(
        lastChild.endIndex - parent.startIndex,
        next.startIndex - parent.startIndex
    )
    return {
        edit: {
            range: {
                startPosition: lastChild.startPosition,
                endPosition: next.endPosition,
            },
            text: next.text + textInBetween + lastChild.text,
        },
        select: {
            startPosition: node.startPosition,
            endPosition: add(node.endPosition, relativeOffset(next), toPoint(textInBetween)),
        },
    }
}

export function slurpBackwardHtml(node: SyntaxNode): EditActions {
    const previous = nextSibling(node, false)
    const firstChild = nextChild(node)
    if (!previous || !firstChild) {
        return {}
    }
    const parent = node.parent!! // A node with a sibling also has a parent.
    const textInBetween = parent.text.substring(
        previous.endIndex - parent.startIndex,
        firstChild.startIndex - parent.startIndex
    )
    return {
        edit: {
            range: {
                startPosition: previous.startPosition,
                endPosition: firstChild.endPosition,
            },
            text: firstChild.text + textInBetween + previous.text,
        },
        select: {
            startPosition: previous.startPosition,
            endPosition: add(
                previous.startPosition,
                toPoint(textInBetween),
                relativeOffset(previous)
            ),
        },
    }
}

export function barfForwardHtml(node: SyntaxNode): EditActions {
    const child = nextChild(node, false)
    if (!child) return {}
    const sibling = nextSibling(child, false)
    if (!sibling) return {}
    const textInBetween = node.text.substring(
        sibling.endIndex - node.startIndex,
        child.startIndex - node.startIndex
    )
    return {
        edit: {
            range: {
                startPosition: sibling.startPosition,
                endPosition: node.endPosition,
            },
            text: child.text + textInBetween + sibling.text,
        },
        select: {
            startPosition: node.startPosition,
            endPosition: add(sibling.startPosition, relativeOffset(child)),
        },
    }
}

export function barfBackwardHtml(node: SyntaxNode): EditActions {
    const child = nextChild(node)
    if (!child) return {}
    const sibling = nextSibling(child)
    if (!sibling) return {}
    const textInBetween = node.text.substring(
        child.endIndex - node.startIndex,
        sibling.startIndex - node.startIndex
    )
    const remainingText = node.text.substring(sibling.endIndex - node.startIndex)
    const startPosition = add(node.startPosition, relativeOffset(sibling), toPoint(textInBetween))
    return {
        edit: {
            range: {
                startPosition: node.startPosition,
                endPosition: sibling.endPosition,
            },
            text: sibling.text + textInBetween + child.text,
        },
        select: {
            startPosition,
            endPosition: add(startPosition, relativeOffset(child), toPoint(remainingText)),
        },
    }
}
