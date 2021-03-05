// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { transposeNext, transposePrevious } from "../../lib/edit-operations"
import { nodeLeftOf, nodeRightOf } from "../../lib/spatial-movement"
import { UnitTest } from "../unit-test"

describe("Spatial movement", () => {
    before(async () => {
        await UnitTest.setup("javascript")
    })

    it("should move to the right in JavaScript array", () => {
        UnitTest.test("javascript", `[|1|, 2, 3]`)
            .select(nodeRightOf)
            .andExpect("[1, |2|, 3]")
            .select(nodeRightOf)
            .andExpect("[1, 2, |3|]")
    })

    it("should move to the left in JavaScript array", () => {
        UnitTest.test("javascript", `[1, 2, |3|]`)
            .select(nodeLeftOf)
            .andExpect("[1, |2|, 3]")
            .select(nodeLeftOf)
            .andExpect("[|1|, 2, 3]")
    })
})

describe("Reordering of siblings", () => {
    before(async () => {
        await UnitTest.setup("javascript")
    })

    it("should not transpose without a next sibling", () => {
        UnitTest.test("javascript", `[1, |foo|]`).edit(transposeNext).andExpect(`[1, |foo|]`)
    })

    it("should transpose with next sibling in array", () => {
        UnitTest.test("javascript", `[|1|, 'abc', (a * b)]`)
            .edit(transposeNext)
            .andExpect(`['abc', |1|, (a * b)]`)
            .edit(transposeNext)
            .andExpect(`['abc', (a * b), |1|]`)
    })

    it("should transpose with previous sibling in array", () => {
        UnitTest.test("javascript", `['abc', (a * b), |1|]`)
            .edit(transposePrevious)
            .andExpect(`['abc', |1|, (a * b)]`)
            .edit(transposePrevious)
            .andExpect(`[|1|, 'abc', (a * b)]`)
    })

    it("should transpose over multiline sibling", () => {
        const before = `{
            |"id": "nix"|,
            "extensions": [
                ".nix"
            ],
          }`
        const after = `{
            "extensions": [
                ".nix"
            ],
            |"id": "nix"|,
          }`
        UnitTest.test("javascript", before)
            .edit(transposeNext) //
            .andExpect(after)
    })
})
