import Parser = require("web-tree-sitter")
import { extensionContext } from "../extension"
import * as fs from "fs"

export function loadTreeSitterLanguage(languageId: string): Promise<Parser.Language> {
    const wasmFilePath = extensionContext.asAbsolutePath(`./wasm/tree-sitter-${languageId}.wasm`)
    if (!fs.existsSync(wasmFilePath)) {
        throw new Error(`Missing language file: '${wasmFilePath}'`)
    }
    return Parser.Language.load(wasmFilePath)
}
