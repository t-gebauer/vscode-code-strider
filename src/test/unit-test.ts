// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { expect } from "chai"
import { SyntaxNode, Tree } from "web-tree-sitter"
import { EditFunction, SimpleRange } from "../lib/interop"
import { TreeSitter } from "../lib/tree-sitter"
import { composeTreeEdit, findNodeAtSelection } from "../lib/tree-utilities"
import { TestTreeSitter } from "./test-utils"

/** Simulates the behavior of a real text editor, so that we can test selection and editing commands in isolation. */
export namespace UnitTest {
    type LanguageId = "javascript" | "html"

    let treeSitter: TreeSitter

    export async function setup(...languages: LanguageId[]) {
        if (!treeSitter) {
            treeSitter = await TestTreeSitter.initializeTreeSitter()
        }
        await Promise.all(languages.map((languageId) => treeSitter.initializeNewParser(languageId)))
    }

    export function test(languageId: LanguageId, initialCode: string) {
        const initalState = extractSelection(initialCode)
        let parseTree: Tree = treeSitter.parseTextSync(initalState.text, languageId)
        let currentNode: SyntaxNode = findNodeAtSelection(parseTree, initalState)
        let expectCount = 1

        // Maybe chain this more elegantly?
        const x = {
            andExpect: (newText: string) => {
                const expectedState = extractSelection(newText)
                expect({
                    startPosition: currentNode.startPosition,
                    endPosition: currentNode.endPosition,
                    selected: currentNode.text,
                    text: parseTree.rootNode.text,
                    _text: markSelection(
                        parseTree.rootNode.text,
                        currentNode.startIndex,
                        currentNode.endIndex
                    ),
                }).to.deep.equal(
                    {
                        startPosition: expectedState.startPosition,
                        endPosition: expectedState.endPosition,
                        selected: expectedState.selected,
                        text: expectedState.text,
                        _text: newText,
                    },
                    `(expectation #${expectCount})`
                )
                expectCount = expectCount + 1
                return x
            },
            edit: (editFunction: EditFunction) => {
                const { edit, select } = editFunction(currentNode)
                if (edit) {
                    const oldText = parseTree.rootNode.text
                    const { offset, length } = rangeOffsetAndLength(oldText, edit.range)
                    const newText = replaceText(oldText, offset, length, edit.text)
                    parseTree.edit(composeTreeEdit(edit.range, offset, length, edit.text))
                    parseTree = treeSitter.parseTextSync(newText, languageId, parseTree)
                }
                if (select) {
                    currentNode = findNodeAtSelection(parseTree, select)
                }
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

const selectionMarkCharacter = "|"

/** extract from a string `code` the position of a selected part marked by exactly two `|` characters. */
function extractSelection(code: string) {
    const splits = code.split(selectionMarkCharacter)
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

/** insert the selectionMarkCharacter into a string */
function markSelection(code: string, startIndex: number, endIndex: number) {
    return (
        code.substring(0, startIndex) +
        selectionMarkCharacter +
        code.substring(startIndex, endIndex) +
        selectionMarkCharacter +
        code.substring(endIndex)
    )
}

/**
 * An editor (like vscode) already knowns these offsets.
 * Tree-sitter only stores a tree and does not have a simple way to calculate offsets from positions and vice versa (yet).
 * https://github.com/tree-sitter/tree-sitter/issues/210
 * https://github.com/tree-sitter/tree-sitter/issues/412
 */
function rangeOffsetAndLength(text: string, range: SimpleRange) {
    let row = 0
    let column = 0
    let startIndex = 0
    let endIndex = 0
    for (let i = 0; i < text.length; i++) {
        if (row === range.startPosition.row && column === range.startPosition.column) {
            startIndex = i
        }
        if (row === range.endPosition.row && column === range.endPosition.column) {
            endIndex = i
        }
        column++
        if (text[i] === "\n") {
            row++
            column = 0
        }
    }
    return {
        offset: startIndex,
        length: endIndex - startIndex,
    }
}

function replaceText(oldText: string, offset: number, length: number, replacementText: string): string {
    return oldText.substring(0, offset) + replacementText + oldText.substring(offset + length)
}
