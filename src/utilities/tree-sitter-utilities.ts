import Parser = require("web-tree-sitter")
import { extensionContext } from "../extension"
import * as fs from "fs"
import { ProgressLocation, window } from "vscode"

export function loadTreeSitterLanguage(languageId: string): Promise<Parser.Language> {
    const wasmFilePath = extensionContext.asAbsolutePath(`./wasm/tree-sitter-${languageId}.wasm`)
    if (!fs.existsSync(wasmFilePath)) {
        throw new Error(`Missing language file: '${wasmFilePath}'`)
    }
    return Parser.Language.load(wasmFilePath)
}

export async function initializeParser() {
    // This is so fast on my machine, that it is hardly noticeable.
    await window.withProgress(
        // Theoretically, displays a loading indicator in the status bar.
        { location: ProgressLocation.Window, title: "Initializing Parser..." },
        () => Parser.init()
    )
}
