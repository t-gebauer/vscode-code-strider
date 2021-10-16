// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import * as fs from "fs"
import Parser = require("web-tree-sitter")
import { Tree } from "web-tree-sitter"
import { Logger } from "./logger"
import { Languages } from "./language-support"

export class TreeSitter {
    private parsers = new Map<string, Parser>()

    constructor(private readonly wasmDirPath: string, private readonly logger?: Logger) {
        this.logger?.log("WASM location: " + wasmDirPath)
        this.checkWasmFiles()
    }

    async initialize() {
        this.logger?.log("Initializing Tree-sitter...")
        await Parser.init()
    }

    async parseText(text: string, languageId: string, editedTree?: Tree): Promise<Tree> {
        this.logger?.log("1 initializing parser ...")
        const parser = this.parsers.get(languageId) ?? (await this.initializeNewParser(languageId))
        this.logger?.log("2 parsing text ...")
        const result = parser.parse(text, editedTree)
        this.logger?.log("3 done.")
        return result
    }

    parseTextSync(text: string, languageId: string, editedTree?: Tree): Tree {
        const parser = this.parsers.get(languageId)
        if (!parser) {
            throw Error(`Invalid state: language not yet initialized! (${languageId})`)
        }
        return parser.parse(text, editedTree)
    }

    async initializeNewParser(languageId: string): Promise<Parser> {
        const { grammarId } = Languages.get(languageId)
        this.logger?.log(
            `-- initializing new parser instance for '${languageId}' with grammar '${grammarId}'`
        )
        const parser = new Parser()
        parser.setLanguage(await Parser.Language.load(this.wasmFilePath(grammarId)))
        this.parsers.set(languageId, parser)
        return parser
    }

    private wasmFilePath(grammarId: string): string {
        return `${this.wasmDirPath}tree-sitter-${grammarId}.wasm`
    }

    private checkWasmFiles() {
        Languages.list().forEach((language) => {
            const wasmFilePath = this.wasmFilePath(language.grammarId)
            if (!fs.existsSync(wasmFilePath)) {
                throw new Error(`Missing parser: '${wasmFilePath}'`)
            }
        })
    }
}
