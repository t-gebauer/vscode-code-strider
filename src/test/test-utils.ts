import * as vscode from 'vscode'
import { TreeSitter } from '../tree-sitter'

export namespace TestUtils {
    let treeSitter: TreeSitter | undefined

    async function initializeTS(): Promise<TreeSitter> {
        const extension: vscode.Extension<unknown> | undefined = vscode.extensions.getExtension(
            "t-gebauer.code-strider"
        )
        const treeSitter = new TreeSitter(`${extension!!.extensionPath}/wasm/`, undefined)
        await treeSitter.initialize()
        return treeSitter
    }

    export async function initializeTreeSitter(): Promise<TreeSitter> {
        treeSitter = treeSitter ?? await initializeTS()
        return treeSitter
    }
}