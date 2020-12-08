import { defineLanguage } from "../language-definition";

export const python = defineLanguage('python',
    [
        [{ selected: 'function_definition' }, {
            // Doesnt work? why?
            firstChild: node => node.childForFieldName('body')?.firstNamedChild,
            lastChild: node => node.childForFieldName('body')?.lastNamedChild,
        }],
    ]
);