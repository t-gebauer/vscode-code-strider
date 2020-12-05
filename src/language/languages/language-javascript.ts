import { defineLanguage } from "../language-definition";

// TODO: Lots of duplication between first and last child
export const javaScript = defineLanguage('javascript',
    [
        [{ selected: 'variable_declaration' }, {
            firstChild: node => node.firstNamedChild?.childForFieldName('value'),
            lastChild: node => node.lastNamedChild?.childForFieldName('value'),
        }],
        [{ selected: 'function' }, {
            firstChild: node => node.childForFieldName('body')?.firstNamedChild,
            lastChild: node => node.childForFieldName('body')?.lastNamedChild,
        }],
        [{ selected: 'function_declaration' }, {
            firstChild: node => node.childForFieldName('body')?.firstNamedChild,
            lastChild: node => node.childForFieldName('body')?.lastNamedChild,
        }],
        [{ parent: 'statement_block' }, { gotoParent: node => node.parent?.parent }],
        [{ parent: 'variable_declarator' }, { gotoParent: node => node.parent?.parent }],
        [{ parent: 'assignment_expression' }, { gotoParent: node => node.parent?.parent }],
        [{ parent: 'arguments' }, { gotoParent: node => node.parent?.parent }],
        [{ selected: 'if_statement' }, {
            firstChild: node => node.childForFieldName('consequence')?.firstNamedChild,
            lastChild: node => node.childForFieldName('consequence')?.lastNamedChild,
        }],
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
            },
            lastChild: node => {
                const child = node.lastNamedChild;
                if (!child) { return null; }
                else if (child.type === 'assignment_expression') {
                    return child.childForFieldName('right');
                } else if (child.type === 'call_expression') {
                    return child.childForFieldName('arguments')?.lastNamedChild;
                }
                return child;
            },
        }],
        [{ selected: 'call_expression' }, {
            firstChild: node => node.childForFieldName('arguments')?.firstNamedChild,
            lastChild: node => node.childForFieldName('arguments')?.lastNamedChild,
        }],
    ]
);