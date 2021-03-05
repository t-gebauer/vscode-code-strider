// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import {
    slurpForwardHtml,
    slurpBackwardHtml,
    splice,
    transposeNext,
    transposePrevious,
    barfForwardHtml,
    barfBackwardHtml,
} from "../../lib/edit-operations"
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

describe("Splice", () => {
    before(async () => {
        await UnitTest.setup("javascript")
    })

    it("should do nothing without children", () => {
        UnitTest.test("javascript", `const x = |42|;`)
            .edit(splice) //
            .andExpect(`const x = |42|;`)
    })

    it("should lift all children", () => {
        UnitTest.test("javascript", `['abc', |[1, 42.0, '333']|, (a * b), [3, 4]];`)
            .edit(splice)
            .andExpect(`['abc', |1|, 42.0, '333', (a * b), [3, 4]];`)
    })
})

describe("Slurp and barf", () => {
    before(async () => {
        await UnitTest.setup("html")
    })

    it("should do nothing without next sibling", () => {
        UnitTest.test("html", `<p>This</p> |<div><a>test</a></div>|`)
            .edit(slurpForwardHtml)
            .andExpect(`<p>This</p> |<div><a>test</a></div>|`)
    })

    it("should slurp the next paragraph and reverse barf", () => {
        const before = `
        |<div context="true"> <p1> </p1>
        </div>|
        <p2> </p2>
        `
        const after = `
        |<div context="true"> <p1> </p1>
        <p2> </p2>
        </div>|
        `
        UnitTest.test("html", before)
            .edit(slurpForwardHtml)
            .andExpect(after)
            .edit(barfForwardHtml)
            .andExpect(before)
    })

    it("should slurp the previous paragraph and reverse barf", () => {
        const before = `
        <p2> </p2>
        |<div context="true"> <p1> </p1>
        </div>|
        `
        const after = `
        |<div context="true">
        <p2> </p2> <p1> </p1>
        </div>|
        `
        UnitTest.test("html", before)
            .edit(slurpBackwardHtml)
            .andExpect(after)
            .edit(barfBackwardHtml)
            .andExpect(before)
    })
})
