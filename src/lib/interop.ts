import { Point, SyntaxNode } from "web-tree-sitter"

/** A Tree-sitter `Range`, but without `startIndex` and `endIndex`. */
export type SimpleRange = { startPosition: Point; endPosition: Point }

export interface EditActions {
    newNode?: SyntaxNode
    edit?: { range: SimpleRange; text: string }
    select?: SimpleRange
}

export type EditFunction = (node: SyntaxNode) => EditActions
