import { SyntaxNode } from "web-tree-sitter"
import { EditActions } from "./interop"

export function transposeNext(node: SyntaxNode): EditActions {
    const next = node.nextNamedSibling
    if (!next) {
        return {}
    }
    const startNode = node
    const endNode = next
    // Assumption: A node which has a sibling also has a parent.
    const parent = startNode.parent!!
    const textInBetween = parent.text.substring(
        startNode.endIndex - parent.startIndex,
        endNode.startIndex - parent.startIndex
    )
    const combinedText = endNode.text + textInBetween + startNode.text
    const edit = {
        range: { startPosition: startNode.startPosition, endPosition: endNode.endPosition },
        text: combinedText,
    }
    const textBefore = endNode.text + textInBetween
    const textBeforeLines = textBefore.split("\n")
    const combinedTextLines = combinedText.split("\n")
    const select = {
        startPosition: {
            row: startNode.startPosition.row + textBeforeLines.length - 1,
            column:
                textBeforeLines.length === 1
                    ? startNode.startPosition.column + textBefore.length
                    : textBeforeLines[textBeforeLines.length - 1].length,
        },
        endPosition: {
            row: endNode.endPosition.row,
            column:
                combinedTextLines.length === 1
                    ? endNode.endPosition.column
                    : combinedTextLines[combinedTextLines.length - 1].length,
        },
    }
    return { edit, select }
}

export function transposePrevious(node: SyntaxNode): EditActions {
    const previous = node.previousNamedSibling
    if (!previous) {
        return {}
    }
    const { edit } = transposeNext(previous)
    const nodeLines = node.text.split("\n")
    const select = {
        startPosition: previous.startPosition,
        endPosition: {
            row: previous.startPosition.row + nodeLines.length - 1,
            column:
                nodeLines.length === 1
                    ? previous.startPosition.column + node.text.length
                    : nodeLines[nodeLines.length - 1].length,
        },
    }
    return { edit, select }
}
