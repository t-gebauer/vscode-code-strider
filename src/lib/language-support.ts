// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { defineLanguage, LanguageDefinition } from "./language-definition"

// All supported languages must be listed here. A minimal definition simply declares that the language is supported.
// The language ids have to match VS Codes internal language ids.
// Additionally, an activation event should be registered in `package.json`.
// For each language a tree-sitter parser language definition has to be present in `<project-root>/wasm`, matching the pattern `tree-sitter-<language-id>.wasm`.
// These are usually generated by the Tree-sitter CLI: `tree-sitter build-wasm`.
const languages: Map<string, LanguageDefinition> = new Map(
    [
        defineLanguage("c"),
        defineLanguage("clojure"),
        defineLanguage("css"),
        defineLanguage("fennel"),
        defineLanguage("html"),
        defineLanguage("java"),
        defineLanguage("javascript"),
        defineLanguage("json"),
        // VSCode maps some json files to "jsonc" - JSON with comments.
        // The normal "json" grammar should suffice. Even though the
        // comments are labeled as ERROR.
        defineLanguage("jsonc", "json"),
        defineLanguage("markdown"),
        defineLanguage("nix"),
        // TODO: create a real (simple) grammar for text: words, paragraphs?
        // defineLanguage("plaintext", "markdown"),
        defineLanguage("python"),
        defineLanguage("scss"),
        defineLanguage("typescript"),
    ].map((def: LanguageDefinition) => [def.id, def])
)

export namespace Languages {
    export function list(): LanguageDefinition[] {
        return new Array(...languages.values())
    }

    export function isSupported(languageId: string): boolean {
        return languages.has(languageId)
    }

    export function get(languageId: string): LanguageDefinition {
        const def = languages.get(languageId)
        if (!def) {
            throw new Error(`Missing language definition: ${languageId}`)
        }
        return def
    }
}
