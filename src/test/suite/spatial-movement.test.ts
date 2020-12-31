import { expect } from "chai"
import * as vscode from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { nodeBelow } from "../../spatial-movement-commands"
import { TreeSitter } from "../../tree-sitter"

describe("Spatial movement", () => {
    let treeSitter: TreeSitter

    before(async () => {
        const extension: vscode.Extension<unknown> | undefined = vscode.extensions.getExtension(
            "t-gebauer.code-strider"
        )
        treeSitter = new TreeSitter(`${extension!!.extensionPath}/wasm/`, undefined)
        await treeSitter.initialize()
    })

    describe("find node below", () => {
        const source = `
export class Foo implements Bar {

  private readonly config: Config = new Config();
  foo = "test";

  bar(): void {
    return undefined;
  }

  baz = false || true;
}
`
        let className: SyntaxNode
        let returnStatement: SyntaxNode

        before(async () => {
            const tree = await treeSitter.parseText(source, "typescript")
            className = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName("name")!
            expect(className?.text).to.equal("Foo")
            const classBody = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName(
                "body"
            )
            const barDefinition = classBody?.namedChild(2)
            returnStatement = barDefinition?.childForFieldName("body")?.firstNamedChild!
            expect(returnStatement?.text).to.equal("return undefined;")
        })

        it("should go into siblings children", () => {
            const result = nodeBelow(className)
            expect(result?.text).to.equal("private readonly config: Config = new Config()")
        })

        it("should not move if last child", () => {
            const result = nodeBelow(returnStatement)
            expect(result).to.equal(returnStatement)
        })

        it("should step out of parent if forced", () => {
            const result = nodeBelow(returnStatement, true)
            expect(result?.text).to.equal("baz = false || true")
        })
    })
})
