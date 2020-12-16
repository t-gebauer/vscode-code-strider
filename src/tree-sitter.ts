import * as fs from "fs"
import Parser = require("web-tree-sitter")
import { Tree } from "web-tree-sitter"
import { Logger } from "./logger"

export class TreeSitter {
    constructor(private readonly wasmDirPath: string, private readonly logger?: Logger) {
        this.logger?.log("WASM location: " + wasmDirPath)
    }

    async initialize() {
        this.logger?.log("Initializing Tree-sitter...")
        await Parser.init()
    }

    async parseText(text: string, languageId: string, previousTree?: Tree): Promise<Tree> {
        // TODO: should we reuse the Parser for better performance?
        // There seems to be a small fixed effort necessary for loading (or setting) the language?
        this.logger?.log("1 initializing parser instance ...")
        const parser = new Parser()
        this.logger?.log("2 setting language ...")
        parser.setLanguage(await this.loadTreeSitterLanguage(languageId))
        this.logger?.log("3 parsing text ...")
        const result = parser.parse(text, previousTree)
        this.logger?.log("4 done.")
        return result
    }

    private loadTreeSitterLanguage(languageId: string): Promise<Parser.Language> {
        // const wasmFilePath = extensionContext.asAbsolutePath(`./wasm/tree-sitter-${languageId}.wasm`)
        const wasmFilePath = this.wasmDirPath + `tree-sitter-${languageId}.wasm`
        if (!fs.existsSync(wasmFilePath)) {
            throw new Error(`Missing language file: '${wasmFilePath}'`)
        }
        return Parser.Language.load(wasmFilePath)
    }
}
