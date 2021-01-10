import { SyntaxNode } from "web-tree-sitter"

// --- spatial movement functions (natural, planar)

function findNodeWithParentContainingLine(
    node: SyntaxNode,
    line: number,
    forward = true
): SyntaxNode | false {
    while (true) {
        if (!node.parent) {
            return false
        }
        if (forward ? node.parent.endPosition.row >= line : node.parent.startPosition.row <= line) {
            return node
        }
        node = node.parent
    }
}

// Nodes which are pure whitespace: `text` nodes in HTML and line breaks in Markdown.
function isPureWhitespace(node: SyntaxNode) {
    return node.text.trim() === ""
}

function nextSibling(node: SyntaxNode, forward = true) {
    let next: SyntaxNode | null = node
    do {
        next = next[forward ? "nextNamedSibling" : "previousNamedSibling"]
    } while (next && isPureWhitespace(next))
    return next
}

function nextChild(node: SyntaxNode, forward = true) {
    return node[forward ? "firstNamedChild" : "lastNamedChild"]
}

function findSiblingContainingLine(
    node: SyntaxNode,
    line: number,
    forward = true
): SyntaxNode | false {
    while (forward ? node.endPosition.row < line : node.startPosition.row > line) {
        const sibling = nextSibling(node, forward)
        if (!sibling) {
            return false
        }
        node = sibling
    }
    return node
}

function findNextSiblingOfParent(node: SyntaxNode, forward = true): SyntaxNode | false {
    while (node.parent && !nextSibling(node, forward)) {
        node = node.parent
    }
    return nextSibling(node, forward) || false
}

// Find the next node which starts on the line below|above this one.
// Will step outside of the bounds of this nodes parent if the selected node is the last child.
function nextNode(node: SyntaxNode, forward = true): SyntaxNode | undefined {
    const targetLine = forward ? node.endPosition.row + 1 : node.startPosition.row - 1
    // go up, until a parent contains the searched line
    const parent = findNodeWithParentContainingLine(node, targetLine, forward)
    if (!parent) {
        return node
    }
    node = parent
    // search in siblings and their children
    while (true) {
        const sibling = findSiblingContainingLine(node, targetLine, forward)
        if (!sibling) {
            // TODO: should only find siblings on the target line
            return findNextSiblingOfParent(node, forward) || undefined
        }
        node = sibling
        // We found a sibling containing our target line
        if (forward ? node.startPosition.row >= targetLine : node.endPosition.row <= targetLine) {
            return node
        }
        // we found a sibling containing our target line, but it (starts too early|ends too late)
        const child = nextChild(node, forward)
        if (!child) {
            return node
        }
        node = child
    }
}

// --- export ---

export function nodeAbove(node: SyntaxNode): SyntaxNode | undefined {
    return nextNode(node, false)
}

export function nodeBelow(node: SyntaxNode): SyntaxNode | undefined {
    return nextNode(node, true)
}

export function nodeLeftOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.previousNamedSibling
    if (other && other.endPosition.row === node.startPosition.row) {
        return other
    }
    return node.parent || undefined
}

export function nodeRightOf(node: SyntaxNode): SyntaxNode | undefined {
    const other = node.nextNamedSibling
    if (!other) {
        return undefined
    }
    if (other.startPosition.row === node.endPosition.row) {
        return other
    }
    return nodeRightOf(other)
}