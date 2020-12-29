import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"

// --- spatial movement functions (natural, planar)

function nodeAbove(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.previousNamedSibling
    if (other && other.endPosition.row < node.startPosition.row) {
        return other
    }
    return node.parent || undefined
}

function nodeBelow(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.nextNamedSibling
    if (other && other.startPosition.row > node.endPosition.row) {
        return other
    }
    return node.parent || undefined
}

function nodeLeftOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.previousNamedSibling
    if (other && other.endPosition.row === node.startPosition.row) {
        return other
    }
    return node.parent || undefined
}

function nodeRightOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.nextNamedSibling
    if (other && other.startPosition.row === node.endPosition.row) {
        return other
    }
    return node.parent || undefined
}

export function moveUp(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeAbove(state.currentNode),
    }
}

export function moveDown(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeBelow(state.currentNode),
    }
}

export function moveLeft(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeLeftOf(state.currentNode),
    }
}

export function moveRight(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeRightOf(state.currentNode),
    }
}
