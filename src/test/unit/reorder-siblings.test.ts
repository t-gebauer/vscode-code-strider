// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { nodeLeftOf, nodeRightOf } from "../../spatial-movement"
import { UnitTest } from "./unit-test"

// FIXME: these are not tests for "reordering..." (because those functions do not exist yet)
describe("Reordering of siblings", () => {
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
