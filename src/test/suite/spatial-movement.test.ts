import { expect } from "chai"
import * as vscode from "vscode"
import { SyntaxNode } from "web-tree-sitter"
import { nodeAbove, nodeBelow, nodeLeftOf, nodeRightOf } from "../../spatial-movement-commands"
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
    let bazAssignement: SyntaxNode

    before(async () => {
        const tree = await treeSitter.parseText(source, "typescript")
        className = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName("name")!
        expect(className?.text).to.equal("Foo")
        const classBody = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName("body")
        barDefinition = classBody?.namedChild(2)!
        expect(barDefinition?.text).to.match(/^bar\(arg1: /)
        returnStatement = barDefinition?.childForFieldName("body")?.firstNamedChild!
        expect(returnStatement?.text).to.equal("return undefined;")
        bazAssignement = classBody?.namedChild(3)!
        expect(bazAssignement?.text).to.equal("baz = false || true")
    })

    describe("find node below", () => {
        it("should go into siblings children", () => {
            const result = nodeBelow(className)
            expect(result?.text).to.equal("private readonly config: Config = new Config()")
        })

        it("should step out of parent if last child and a parent has further siblings", () => {
            const result = nodeBelow(returnStatement)
            expect(result?.text).to.equal("baz = false || true")
        })

        it("should not move if last child and no parent has further siblings", () => {
            const result = nodeBelow(bazAssignement)
            expect(result).to.equal(undefined)
        })

        // TODO: "below" and "above" should jump between functions in this code:
		// server.start().then(function () {
		// 	log.info('Pact Mock Server running on port: ' + server.options.port);
		// 	// Remove current server from starting servers array
		// 	startingServers = startingServers.filter(x => x !== server.options.port);
		// }, function (err) {
		// 	log.error('Error while trying to run karma-pact: ' + err);
		// });
    })

    describe("find node above", () => {
        it("should step out of parent if first child and parent has further siblings", () => {
            const result = nodeAbove(returnStatement)
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

    describe("find node right", () => {
        it('should select parent when nothing else is there', () => {
            const result = nodeRightOf(className)
            expect(result?.text).to.match(/^implements Bar$/)
        })

        xit('should stay inside parent block', () => {
            // TODO
            const result = nodeRightOf(barDefinition)
            expect(result).to.equal(barDefinition)
        })

        it("should move inside parameter list", () => {
            const firstBarParameter = barDefinition.childForFieldName('parameters')?.firstNamedChild!
            expect(firstBarParameter?.text).to.equal('arg1: number')
            const result = nodeRightOf(firstBarParameter)
            expect(result?.text).to.equal('arg2: string | null')
        })

        xit("should not move when already last parameter", () => {
            // TODO
            const secondBarParameter = barDefinition.childForFieldName('parameters')?.firstNamedChild?.nextNamedSibling!
            expect(secondBarParameter?.text).to.equal('arg2: string | null')
            const result = nodeRightOf(secondBarParameter)
            expect(result).to.equal(secondBarParameter)
        })
    })
})
