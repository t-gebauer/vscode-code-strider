import { SyntaxNode } from "web-tree-sitter";
import { languageJavaScript } from "./language-javascript";


export type NodeAccessorFunction = (node: SyntaxNode) => SyntaxNode | null | undefined;

export type Matcher = {
    selected?: string,
    parent?: string,
};

export type CommandName = 'firstChild' | 'gotoParent' | 'nextSibling' | 'previousSibling';

export type Executor = Partial<{
    [commandName in CommandName]: NodeAccessorFunction;
}>;

export type Rule = [Matcher, Executor];

export type LanguageDefinition = {
    languageId: string,
    rules: Array<Rule>
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


export function getOverrideFor(languageDefinition: LanguageDefinition, command: keyof Executor, node: SyntaxNode): NodeAccessorFunction | undefined {
    const firstMatchingRule = languageDefinition.rules.find(([matcher, executor]) => {
        // TODO: Don't match if `undefined === undefined` ...
        return executor[command] !== undefined &&
            (matcher.selected === node.type ||
                matcher.parent === node.parent?.type);
    });
    if (firstMatchingRule) {
        const [_, executor] = firstMatchingRule;
        return executor[command];
    }
    return undefined;
}