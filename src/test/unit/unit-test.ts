// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { expect } from "chai"
import { SyntaxNode } from "web-tree-sitter"
import { EditorState } from "../../editor-state"
import { EditorStateChange } from "../../extension"
import { TreeSitter } from "../../tree-sitter"
import { toSelection } from "../../utilities/conversion-utilities"
import { findNodeAtSelection } from "../../utilities/tree-utilities"
import { TestTreeSitter } from "../test-utils"

export namespace UnitTest {
    type LanguageId = "javascript"

    let treeSitter: TreeSitter

    export async function setup(...languages: LanguageId[]) {
        if (!treeSitter) {
            treeSitter = await TestTreeSitter.initializeTreeSitter()
        }
        await Promise.all(languages.map((languageId) => treeSitter.initializeNewParser(languageId)))
    }

    /** extract from a string `code` the position of a selected part marked by exactly two `|` characters. */
    function extractSelection(code: string) {
        const splits = code.split("|")
        expect(splits).to.have.length(3)
        const [before, selected, after] = splits
        const linesBefore = before.split("\n")
        const lengthOfLastLineBefore = linesBefore[linesBefore.length - 1].length
        const linesSelected = selected.split("\n")
        const lengthOfLastLineSelected = linesSelected[linesSelected.length - 1].length
        return {
            startPosition: {
                row: linesBefore.length - 1,
                column: lengthOfLastLineBefore,
            },
            endPosition: {
                row: linesBefore.length + linesSelected.length - 2,
                column:
                    linesSelected.length === 1
                        ? lengthOfLastLineBefore + lengthOfLastLineSelected
                        : lengthOfLastLineSelected,
            },
            text: before + selected + after,
            selected,
        }
    }

    export function test(languageId: LanguageId, initialCode: string) {
        const initalState = extractSelection(initialCode)
        const parseTree = treeSitter.parseTextSync(initalState.text, languageId)
        let currentNode: SyntaxNode = findNodeAtSelection(parseTree, toSelection(initalState))
        let expectCount = 1

        // Maybe chain this more elegantly?
        const x = {
            andExpect: (newText: string) => {
                const expectedState = extractSelection(newText)
                expect({
                    startPosition: currentNode.startPosition,
                    endPosition: currentNode.endPosition,
                    selected: currentNode.text,
                }).to.deep.equal(
                    {
                        startPosition: expectedState.startPosition,
                        endPosition: expectedState.endPosition,
                        selected: expectedState.selected,
                    },
                    `(at expect #${expectCount})`
                )
                expectCount = expectCount + 1
                return x
            },
            edit: (editFunction: (state: EditorState, ...more: any[]) => EditorStateChange) => {
                const stateChange = editFunction({ currentNode } as EditorState)
                currentNode = stateChange.currentNode || currentNode
                return x
            },
            select: (selectFunction: (node: SyntaxNode) => SyntaxNode | undefined) => {
                currentNode = selectFunction(currentNode) || currentNode
                return x
            },
        }
        return x
    }
}
