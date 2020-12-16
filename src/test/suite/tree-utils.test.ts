import * as vscode from "vscode"
import * as treeUtils from "../../utilities/tree-utilities"
import { Position, Selection } from "vscode"
import { SyntaxNode, Tree } from "web-tree-sitter"
import Parser = require("web-tree-sitter")
import { TreeSitter } from "../../tree-sitter"
import { expect } from "chai"
import { proxy, flush } from "@alfonso-presa/soft-assert"

const softExpect = proxy(expect)
teardown(flush) // assert all soft assertions

suite("Tree Utils", () => {
    let treeSitter: TreeSitter

    suiteSetup(async () => {
        const extension: vscode.Extension<unknown> | undefined = vscode.extensions.getExtension(
            "ttt.code-strider"
        )
        treeSitter = new TreeSitter(`${extension!!.extensionPath}/wasm/`, undefined)
        await treeSitter.initialize()
    })

    suite("Find node in selection", async () => {
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

        suiteSetup(async () => {
            tree = await treeSitter.parseText(source, "javascript")
        })

        test("node at start", () => {
            const node = treeUtils.findNodeAtSelection(tree, selection(1, 0))
            softExpect(node.type).to.equal("lexical_declaration")
            softExpect(node.parent?.type).to.equal("program")
            softExpect(node.startPosition).to.deep.equal({ row: 1, column: 0 })
            softExpect(node.endPosition).to.deep.equal({ row: 1, column: sourceLines[1].length })
        })

        test("node at end", () => {
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

        test("boolean in inside", () => {
            const booleanNode = treeUtils.findNodeAtSelection(tree, selection(4, 12))
            softExpect(booleanNode.type).to.equal("true")
            softExpect(booleanNode.parent?.type).to.equal( "arguments")
            softExpect(booleanNode.startPosition).to.deep.equal( { row: 4, column: 10 })
            softExpect(booleanNode.endPosition).to.deep.equal( { row: 4, column: 14 })
        })

        test("whitespace selection", () => {
            const node = treeUtils.findNodeAtSelection(tree, selection(7, 0))
            // TODO not implemented yet
            // softExpect(node.type).to.equal( "variable_declaration")
            // softExpect(node.startPosition).to.deep.equal( { row: 1, column: 14 })
            // softExpect(node.endPosition).to.deep.equal( { row: 1, column: 18 })
        })
    })
})

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
