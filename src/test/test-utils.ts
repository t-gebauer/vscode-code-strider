// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { TreeSitter } from "../lib/tree-sitter"

export namespace TestTreeSitter {
    let treeSitter: TreeSitter | undefined

    async function initializeTS(): Promise<TreeSitter> {
        const treeSitter = new TreeSitter(`./wasm/`, undefined)
        await treeSitter.initialize()
        return treeSitter
    }

    export async function initializeTreeSitter(): Promise<TreeSitter> {
        treeSitter = treeSitter ?? (await initializeTS())
        return treeSitter
    }
}
