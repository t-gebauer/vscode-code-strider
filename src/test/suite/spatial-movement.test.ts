import { expect } from "chai"
import { SyntaxNode } from "web-tree-sitter"
import { nodeAbove, nodeBelow, nodeLeftOf, nodeRightOf } from "../../spatial-movement-commands"
import { TreeSitter } from "../../tree-sitter"
import { TestUtils } from "../test-utils"

describe("Spatial movement", () => {
    let treeSitter: TreeSitter

    before(async () => {
        treeSitter = await TestUtils.initializeTreeSitter()
    })

    describe("TypeScript", () => {
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
            const classBody = tree.rootNode.firstNamedChild?.firstNamedChild?.childForFieldName(
                "body"
            )
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
            it("should select parent when nothing else is left", () => {
                const result = nodeLeftOf(className)
                expect(result?.text).to.match(/^class Foo/)
            })

            xit("should stay inside parent block", () => {
                // TODO: is it not correct to select the parent?
                const result = nodeLeftOf(barDefinition)
                expect(result?.text).to.match(/^bar\(arg1: number,/)
            })

            xit("should not move if already first parameter", () => {
                // TODO: is it not correct to select the parent?
                const firstBarParameter = barDefinition.childForFieldName("parameters")
                    ?.firstNamedChild!
                expect(firstBarParameter?.text).to.equal("arg1: number")
                const result = nodeLeftOf(firstBarParameter)
                expect(result).to.equal(firstBarParameter)
            })

            it("should move inside parameter list", () => {
                const secondBarParameter = barDefinition.childForFieldName("parameters")
                    ?.firstNamedChild?.nextNamedSibling!
                expect(secondBarParameter?.text).to.equal("arg2: string | null")
                const result = nodeLeftOf(secondBarParameter)
                expect(result?.text).to.equal("arg1: number")
            })
        })

        describe("find node right", () => {
            it("should select parent when nothing else is there", () => {
                const result = nodeRightOf(className)
                expect(result?.text).to.match(/^implements Bar$/)
            })

            it("should stay inside parent block", () => {
                const result = nodeRightOf(barDefinition)
                expect(result).to.equal(undefined)
            })

            it("should move inside parameter list", () => {
                const firstBarParameter = barDefinition.childForFieldName("parameters")
                    ?.firstNamedChild!
                expect(firstBarParameter?.text).to.equal("arg1: number")
                const result = nodeRightOf(firstBarParameter)
                expect(result?.text).to.equal("arg2: string | null")
            })

            it("should not move when already last parameter", () => {
                const secondBarParameter = barDefinition.childForFieldName("parameters")
                    ?.firstNamedChild?.nextNamedSibling!
                expect(secondBarParameter?.text).to.equal("arg2: string | null")
                const result = nodeRightOf(secondBarParameter)
                expect(result).to.equal(undefined)
            })
        })
    })

    describe("Markdown", () => {
        const source = trimMargin(`
        |# Title
        |
        |Some text with soft line breaks
        |more text in the same paragraph.
        |
        |Another paragraph: (two spaces here)  
        |With a hard line break.
        |
        |- list item
        |- list
        |    - nested list item
        |    - second nested item
        |`)
        let titleNode: SyntaxNode

        before(async () => {
            const tree = await treeSitter.parseText(source, "markdown")
            titleNode = tree.rootNode.firstNamedChild!
            expect(titleNode?.text).to.equal("# Title")
        })

        it("should move up and down all items", () => {
            let node: SyntaxNode = titleNode
            const texts = [
                "# Title",
                "Some text with soft line breaks\nmore text in the same paragraph.",
                "Another paragraph: (two spaces here)  \nWith a hard line break.",
                "- list item\n- list\n    - nested list item\n    - second nested item",
            ]
            texts.forEach((expectedText) => {
                expect(node?.text).to.equal(expectedText)
                node = nodeBelow(node) ?? node
            })
            texts.reverse().forEach((expectedText) => {
                expect(node?.text).to.equal(expectedText)
                node = nodeAbove(node) ?? node
            })
        })

        it("should not select line breaks (empty named nodes) inside paragraph", () => {
            const paragraph = nodeBelow(titleNode)
            expect(paragraph?.text).to.match(/^Some text with soft .../)
            const firstChild = paragraph?.firstNamedChild
            expect(firstChild?.text).to.equal("Some text with soft line breaks")
            const nextNode = nodeBelow(firstChild!)
            expect(nextNode?.text).to.equal("more text in the same paragraph.")
            expect(nodeAbove(nextNode!)?.text).to.equal(firstChild?.text)
        })
    })
})

function trimMargin(text: string): string {
    return text
        .split("\n")
        .map((line) => line.substr(line.indexOf("|") + 1 || 0))
        .join("\n")
}
