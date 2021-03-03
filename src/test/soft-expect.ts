// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { expect } from "chai"
import { proxy, flush } from "@alfonso-presa/soft-assert"

export const softExpect = proxy(expect)

afterEach(flush) // assert all soft assertions
