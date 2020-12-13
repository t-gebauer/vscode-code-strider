import { extensionContext, logger } from "../extension"
import * as fs from "fs"
import { ProgressLocation, window } from "vscode"
import Parser = require("web-tree-sitter")
import { Tree } from "web-tree-sitter"

function loadTreeSitterLanguage(languageId: string): Promise<Parser.Language> {
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

export namespace TreeSitter {
    export async function parseText(text: string, languageId: string, previousTree?: Tree): Promise<Tree> {
        // TODO: should we reuse the Parser for better performance?
        logger.debug('1 initializing parser')
        const parser = new Parser()
        logger.debug('2 setting language')
        parser.setLanguage(await loadTreeSitterLanguage(languageId))
        logger.debug('3 parsing text')
        const result = parser.parse(text, previousTree)
        logger.debug('4 done')
        return result
    }
}
