import * as assert from "assert"
import * as vscode from "vscode"
import * as treeUtils from "../../utilities/tree-utilities"
import { Position, Selection } from "vscode"
import { SyntaxNode, Tree } from "web-tree-sitter"
import Parser = require("web-tree-sitter")
import { TreeSitter } from "../../tree-sitter"
import { ConsoleOutLogger, Logger } from "../../logger"

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
            const nodeAtStart = treeUtils.findNodeAtSelection(tree, selection(1, 0))
            assert.strictEqual(nodeAtStart.type, "lexical_declaration")
            assert.strictEqual(nodeAtStart.parent?.type, "program")
            assert.deepStrictEqual(nodeAtStart.startPosition, { row: 1, column: 0 })
            assert.deepStrictEqual(nodeAtStart.endPosition, {
                row: 1,
                column: sourceLines[1].length,
            })
        })

        test("node at end", () => {
            const nodeAtEnd = treeUtils.findNodeAtSelection(
                tree,
                selection(sourceLines.length - 2, sourceLines[sourceLines.length - 2].length)
            )
            assert.strictEqual(nodeAtEnd.type, "statement_block")
            assert.strictEqual(nodeAtEnd.parent?.type, "function_declaration")
            assert.deepStrictEqual(nodeAtEnd.startPosition, { row: 8, column: 26 })
            assert.deepStrictEqual(nodeAtEnd.endPosition, {
                row: sourceLines.length - 2,
                column: sourceLines[sourceLines.length - 2].length,
            })
        })

        test("boolean in inside", () => {
            const booleanNode = treeUtils.findNodeAtSelection(tree, selection(4, 12))
            assert.strictEqual(booleanNode.type, "true")
            assert.strictEqual(booleanNode.parent?.type, "arguments")
            assert.deepStrictEqual(booleanNode.startPosition, { row: 4, column: 10 })
            assert.deepStrictEqual(booleanNode.endPosition, { row: 4, column: 14 })
        })

        test("whitespace selection", () => {
            const node = treeUtils.findNodeAtSelection(tree, selection(7, 0))
            // TODO not implemented yet
            // assert.strictEqual(node.type, "variable_declaration")
            // assert.deepStrictEqual(node.startPosition, { row: 1, column: 14 })
            // assert.deepStrictEqual(node.endPosition, { row: 1, column: 18 })
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
