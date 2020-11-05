/* eslint-disable @typescript-eslint/naming-convention */
import { LanguageDefinition } from "./language-support";

export const languageJavaScript: LanguageDefinition = {
    languageId: 'javascript',
    interactiveNodes: {
        'variable_declaration': {
            firstChild: node => node.firstNamedChild?.childForFieldName('value')
        },
        'function': {
            firstChild: node => node.childForFieldName('body')?.firstNamedChild
        },
    }
};