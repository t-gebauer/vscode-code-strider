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
        const source = `(defn nothing [do-nothing]
  (do-nothing true))

(def a-keyword :foo)`
        const sourceLines = source.split("\n")
        let tree: Tree

        suiteSetup(async () => {
            tree = await treeSitter.parseText(source, "clojure")
        })

        test("node at start", () => {
            const nodeAtStart = treeUtils.findNodeAtSelection(tree, selection(0, 0))
            assert.strictEqual(nodeAtStart.type, "list_lit")
            assert.strictEqual(nodeAtStart.parent?.type, "source")
            assert.deepStrictEqual(nodeAtStart.startPosition, { row: 0, column: 0 })
            assert.deepStrictEqual(nodeAtStart.endPosition, {
                row: 1,
                column: sourceLines[1].length,
            })
        })

        test("node at end", () => {
            const nodeAtEnd = treeUtils.findNodeAtSelection(
                tree,
                selection(3, sourceLines[3].length)
            )
            assert.strictEqual(nodeAtEnd.type, "list_lit")
            assert.strictEqual(nodeAtEnd.parent?.type, "source")
            assert.deepStrictEqual(nodeAtEnd.startPosition, { row: 3, column: 0 })
            assert.deepStrictEqual(nodeAtEnd.endPosition, { row: 3, column: sourceLines[3].length })
        })

        test("boolean in inside", () => {
            const booleanNode = treeUtils.findNodeAtSelection(tree, selection(1, 16))
            assert.strictEqual(booleanNode.type, "bool_lit")
            assert.strictEqual(booleanNode.parent?.type, "list_lit")
            assert.deepStrictEqual(booleanNode.startPosition, { row: 1, column: 14 })
            assert.deepStrictEqual(booleanNode.endPosition, { row: 1, column: 18 })
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
