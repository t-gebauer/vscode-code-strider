/* eslint-disable @typescript-eslint/naming-convention */
import { LanguageDefinition } from "./language-support";

export const languageJavaScript: LanguageDefinition = {
    languageId: 'javascript',
    rules: [
        [{ selected: 'variable_declaration' }, { firstChild: node => node.firstNamedChild?.childForFieldName('value') }],
        [{ selected: 'function' }, { firstChild: node => node.childForFieldName('body')?.firstNamedChild }],
        [{ selected: 'function_declaration' }, { firstChild: node => node.childForFieldName('body')?.firstNamedChild }],
        [{ parent: 'statement_block' }, { gotoParent: node => node.parent?.parent }],
        [{ parent: 'variable_declarator' }, { gotoParent: node => node.parent?.parent }],
        [{ parent: 'assignment_expression' }, { gotoParent: node => node.parent?.parent }],
        [{ parent: 'arguments' }, { gotoParent: node => node.parent?.parent }],
        [{ selected: 'if_statement' }, { firstChild: node => node.childForFieldName('consequence')?.firstNamedChild }],
        [{ selected: 'expression_statement' }, {
            firstChild: node => {
                const child = node.firstNamedChild;
                if (!child) { return null; }
                else if (child.type === 'assignment_expression') {
                    return child.childForFieldName('right');
                } else if (child.type === 'call_expression') {
                    return child.childForFieldName('arguments')?.firstNamedChild;
                }
                return child;
            }
        }],
        [{ selected: 'call_expression' }, { firstChild: node => node.childForFieldName('arguments')?.firstNamedChild }],
    ]
};