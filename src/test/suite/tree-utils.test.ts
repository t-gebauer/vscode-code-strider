import * as assert from "assert"
import * as vscode from "vscode"
import * as treeUtils from "../../utilities/tree-utilities"
import { Position, Selection } from "vscode"
import { SyntaxNode, Tree } from "web-tree-sitter"
import Parser = require("web-tree-sitter")
import { TreeSitter } from "../../tree-sitter"

suite("Tree Utils", () => {
    let treeSitter: TreeSitter

    suiteSetup(async () => {
        const extension: vscode.Extension<unknown> | undefined = vscode.extensions.getExtension('ttt.code-strider')
        treeSitter = new TreeSitter(`${extension!!.extensionPath}/wasm/`)
        await treeSitter.initialize()
    })

    test("Find node in selection", async () => {
        const tree = await treeSitter.parseText("(defn nothing [])", "clojure")
        const node = treeUtils.findNodeAtSelection(tree, selection(1, 1))
        assert.equal(node.type, "foo")
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
