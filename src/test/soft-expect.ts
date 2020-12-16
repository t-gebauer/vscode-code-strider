import { expect } from "chai"
import { proxy, flush } from "@alfonso-presa/soft-assert"

export const softExpect = proxy(expect)

afterEach(flush) // assert all soft assertions
