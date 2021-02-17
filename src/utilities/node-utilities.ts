import { SyntaxNode } from "web-tree-sitter"

// Examples for nodes which are pure whitespace: `text` nodes in HTML and line breaks in Markdown.
export function isPureWhitespace(node: SyntaxNode) {
    return node.text.trim() === ""
}

export function nextSibling(node: SyntaxNode, forward = true) {
    let next: SyntaxNode | null = node
    do {
        next = next[forward ? "nextNamedSibling" : "previousNamedSibling"]
    } while (next && isPureWhitespace(next))
    return next
}

export function previousSibling(node: SyntaxNode) {
    return nextSibling(node, false)
}

export function nextChild(node: SyntaxNode, forward = true) {
    return node[forward ? "firstNamedChild" : "lastNamedChild"]
}

export function lastChild(node: SyntaxNode) {
    return nextChild(node, false)
}
