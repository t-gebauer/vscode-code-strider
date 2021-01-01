import { expect } from "chai"
import * as vscode from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { nodeAbove, nodeBelow, nodeLeftOf } from "../../spatial-movement-commands"
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

    const source = `
export class Foo implements Bar {

  private readonly config: Config = new Config();
  foo = "test";

  bar(arg1: number, arg2: string | null): void {
    return undefined;
  }

  baz = false || true;
}
`
    let className: SyntaxNode
    let barDefinition: SyntaxNode
    let returnStatement: SyntaxNode

    before(async () => {
        const tree = await treeSitter.parseText(source, "typescript")
        className = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName("name")!
        expect(className?.text).to.equal("Foo")
        const classBody = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName("body")
        barDefinition = classBody?.namedChild(2)!
        expect(barDefinition?.text).to.match(/^bar\(arg1: /)
        returnStatement = barDefinition?.childForFieldName("body")?.firstNamedChild!
        expect(returnStatement?.text).to.equal("return undefined;")
    })

    describe("find node below", () => {
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

    describe("find node above", () => {
        it('should not move if first child', () => {
            const result = nodeAbove(returnStatement)
            expect(result).to.equal(returnStatement)
        })

        it("should step out of parent if forced", () => {
            const result = nodeAbove(returnStatement, true)
            expect(result?.text).to.equal(`: void`)
        })
    })

    describe("find node left", () => {
        it('should select parent when nothing else is left', () => {
            const result = nodeLeftOf(className)
            expect(result?.text).to.match(/^class Foo/)
        })

        xit('should stay inside parent block', () => {
            // TODO: is it not correct to select the parent?
            const result = nodeLeftOf(barDefinition)
            expect(result?.text).to.match(/^bar\(arg1: number,/)
        })

        xit("should not move if already first parameter", () => {
            // TODO: is it not correct to select the parent?
            const firstBarParameter = barDefinition.childForFieldName('parameters')?.firstNamedChild!
            expect(firstBarParameter?.text).to.equal('arg1: number')
            const result = nodeLeftOf(firstBarParameter)
            expect(result).to.equal(firstBarParameter)
        })

        it("should move inside parameter list", () => {
            const secondBarParameter = barDefinition.childForFieldName('parameters')?.firstNamedChild?.nextNamedSibling!
            expect(secondBarParameter?.text).to.equal('arg2: string | null')
            const result = nodeLeftOf(secondBarParameter)
            expect(result?.text).to.equal('arg1: number')
        })
    })
})
