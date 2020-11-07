import { SyntaxNode } from "web-tree-sitter";
import { defineLanguage, RuleExecutor, LanguageDefinition, NodeAccessorFunction, Rule } from "./language-definition";
import { javaScript } from "./languages/language-javascript";

const languages = new Map<string, LanguageDefinition>();

export function initializeLanguages() {
    const languageDefinitions: LanguageDefinition[] = [
        javaScript,
        defineLanguage('html')
    ];
    languageDefinitions.forEach(def => {
        languages.set(def.languageId, def);
    });
}

export function isLanguageSupported(languageId: string): boolean {
    return languages.get(languageId) !== undefined;
}

export function getLanguageDefinition(languageId: string): LanguageDefinition {
    const def = languages.get(languageId);
    if (!def) { throw new Error(`Missing language definition: ${languageId}`); }
    return def;
}

export function getOverrideFor(languageDefinition: LanguageDefinition, command: keyof RuleExecutor, node: SyntaxNode): NodeAccessorFunction | undefined {
    const firstMatchingRule = languageDefinition.rules.find(([matcher, executor]) => {
        return executor[command] &&
            (!matcher.selected || (matcher.selected === node.type)) &&
            (!matcher.parent || (matcher.parent === node.parent?.type));
    });
    if (firstMatchingRule) {
        const [_, executor] = firstMatchingRule;
        return executor[command];
    }
    return undefined;
}