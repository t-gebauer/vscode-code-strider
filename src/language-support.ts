import { SyntaxNode } from "web-tree-sitter";
import { languageJavaScript } from "./language-javascript";

export type InteractiveNodeDefinition = {
    firstChild?: (node: SyntaxNode) => SyntaxNode | null | undefined;
    gotoParent?: (node: SyntaxNode) => SyntaxNode | null | undefined;
};

export type LanguageDefinition = {
    languageId: string,
    interactiveNodes: {
        [nodeType: string]: InteractiveNodeDefinition
    }
};

const languages = new Map<string, LanguageDefinition>();

export function initializeLanguages() {
    const languageDefinitions: LanguageDefinition[] = [
        languageJavaScript
    ];
    languageDefinitions.forEach(def => {
        languages.set(def.languageId, def);
    });
}


export function getLanguageDefinition(languageId: string): LanguageDefinition {
    const def = languages.get(languageId);
    if (!def) { throw new Error(`Language not found! ${languageId}`); }
    return def;
}
