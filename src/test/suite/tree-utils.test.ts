// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { Position, Selection } from "vscode"
import { Tree } from "web-tree-sitter"
import * as treeUtils from "../../utilities/tree-utilities"
import { softExpect } from "../soft-expect"
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
            softExpect(node.type).to.equal("lexical_declaration")
            softExpect(node.parent?.type).to.equal("program")
            softExpect(node.startPosition).to.deep.equal({ row: 1, column: 0 })
            softExpect(node.endPosition).to.deep.equal({ row: 1, column: sourceLines[1].length })
        })

        it("node at end", () => {
            const node = treeUtils.findNodeAtSelection(
                tree,
                selection(sourceLines.length - 2, sourceLines[sourceLines.length - 2].length)
            )
            softExpect(node.type).to.equal("statement_block")
            softExpect(node.parent?.type).to.equal("function_declaration")
            softExpect(node.startPosition).to.deep.equal({ row: 8, column: 26 })
            softExpect(node.endPosition).to.deep.equal({
                row: sourceLines.length - 2,
                column: sourceLines[sourceLines.length - 2].length,
            })
        })

        it("boolean in inside", () => {
            const node = treeUtils.findNodeAtSelection(tree, selection(4, 12))
            softExpect(node.type).to.equal("true")
            softExpect(node.parent?.type).to.equal("arguments")
            softExpect(node.startPosition).to.deep.equal({ row: 4, column: 10 })
            softExpect(node.endPosition).to.deep.equal({ row: 4, column: 14 })
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
            softExpect(node.type).to.equal("if_statement")
            softExpect(node.startPosition, "node start").to.deep.equal({ row: 1, column: 0 })
            softExpect(node.endPosition, "node end").to.deep.equal({ row: 3, column: 1 })
        })

        it("whitespace - same line, before", () => {
            const node = treeUtils.findNodeBeforeCursor(tree, position(2, 1))
            softExpect(node.type).to.equal("return_statement")
            softExpect(node.startPosition, "node start").to.deep.equal({ row: 2, column: 2 })
            softExpect(node.endPosition, "node end").to.deep.equal({ row: 2, column: 19 })
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
