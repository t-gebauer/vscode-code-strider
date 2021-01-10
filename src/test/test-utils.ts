import * as vscode from "vscode"
import { EditorState } from "../editor-state"
import { TreeSitter } from "../tree-sitter"

export namespace TestTreeSitter {
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
        treeSitter = treeSitter ?? (await initializeTS())
        return treeSitter
    }
}

function waitUntil(condition: () => boolean, timeout = 1000, step = 50): Promise<void> {
    if (condition()) return Promise.resolve()
    let waitedTime = 0
    return new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
            waitedTime += step
            if (condition()) {
                resolve()
                clearInterval(interval)
            } else if (waitedTime > timeout) {
                reject(`Wait timeout of '${timeout}'ms exceeded!`)
            }
        }, step)
    })
}

export async function waitUntilExtensionReady(): Promise<EditorState> {
    // wait until the extension is activated
    const extension = vscode.extensions.getExtension("t-gebauer.code-strider")
    await waitUntil(() => extension?.isActive ?? false)
    // wait until state is initialized
    const state: EditorState | undefined = await vscode.commands.executeCommand(
        "code-strider:_ready"
    )
    if (!state) throw Error("Invalid state. _ready should never return `undefined`")
    return state
}

export function executeCommand(command: string) {
    return vscode.commands.executeCommand(`code-strider:${command}`)
}
