// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { expect } from "chai"
import { Position, Selection } from "vscode"
import { Tree } from "web-tree-sitter"
import * as treeUtils from "../../utilities/tree-utilities"
import { TestTreeSitter } from "../test-utils"

describe("Tree Utils", () => {
    context("Find node in selection", async () => {
        const source = `
const foo = require("foo")

const x = {
  ... bar(true),
  z: '100'
}

function bar(arg = false) {
  console.log(arg || "default");

  if (typeof arg === "string") {
    return arg ? arg && "something" : "nothing"
  }
  return { a: 0, b: 1}
}
`
        const sourceLines = source.split("\n")
        let tree: Tree

        before(async () => {
            const treeSitter = await TestTreeSitter.initializeTreeSitter()
            tree = await treeSitter.parseText(source, "javascript")
        })

        it("node at start", () => {
            const node = treeUtils.findNodeAtSelection(tree, selection(1, 0))
            expect(node).to.deep.nested.include({
                type: "lexical_declaration",
                "parent.type": "program",
                startPosition: { row: 1, column: 0 },
                endPosition: { row: 1, column: sourceLines[1].length },
            })
        })

        it("node at end", () => {
            const node = treeUtils.findNodeAtSelection(
                tree,
                selection(sourceLines.length - 2, sourceLines[sourceLines.length - 2].length)
            )
            expect(node).to.deep.nested.include({
                type: "statement_block",
                "parent.type": "function_declaration",
                startPosition: { row: 8, column: 26 },
                endPosition: {
                    row: sourceLines.length - 2,
                    column: sourceLines[sourceLines.length - 2].length,
                },
            })
        })

        it("boolean in inside", () => {
            const node = treeUtils.findNodeAtSelection(tree, selection(4, 12))
            expect(node).to.deep.nested.include({
                type: "true",
                "parent.type": "arguments",
                startPosition: { row: 4, column: 10 },
                endPosition: { row: 4, column: 14 },
            })
        })
    })

    context("Find node before cursor", () => {
        const source = `
if (something !== true) {
  return undefined;
}

const x =          "weirdly formatted string"      ;
        `
        let tree: Tree
        before(async () => {
            const treeSitter = await TestTreeSitter.initializeTreeSitter()
            tree = await treeSitter.parseText(source, "javascript")
        })

        it("whitespace - same line, after", () => {
            const node = treeUtils.findNodeBeforeCursor(tree, position(3, 5))
            expect(node).to.deep.nested.include({
                type: "if_statement",
                startPosition: { row: 1, column: 0 },
                endPosition: { row: 3, column: 1 },
            })
        })

        it("whitespace - same line, before", () => {
            const node = treeUtils.findNodeBeforeCursor(tree, position(2, 1))
            expect(node).to.deep.nested.include({
                type: "return_statement",
                startPosition: { row: 2, column: 2 },
                endPosition: { row: 2, column: 19 },
            })
        })
    })
})

function position(line: number, char: number) {
    return new Position(line, char)
}

function selection(
    startLine: number,
    startChar: number,
    endLine?: number,
    endChar?: number
): Selection {
    return new Selection(
        new Position(startLine, startChar),
        new Position(endLine ?? startLine, endChar ?? startChar)
    )
}
