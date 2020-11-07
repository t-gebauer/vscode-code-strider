import { SyntaxNode } from "web-tree-sitter";

export type NodeAccessorFunction = (node: SyntaxNode) => SyntaxNode | null | undefined;

export type RuleMatcher = {
    selected?: string,
    parent?: string,
};

export type CommandName = 'firstChild' | 'gotoParent' | 'nextSibling' | 'previousSibling';

export type RuleExecutor = Partial<{
    [commandName in CommandName]: NodeAccessorFunction;
}>;

export type Rule = [RuleMatcher, RuleExecutor];

export type LanguageDefinition = {
    languageId: string,
    rules: Array<Rule>
};

export function defineLanguage(languageId: string, rules?: Rule[]): LanguageDefinition {
    return { languageId, rules: rules ? rules : [] };
}