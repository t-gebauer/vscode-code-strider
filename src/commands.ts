import { EditorState } from './editor-state';
import { NodeAccessorFunction, LanguageDefinition, CommandName } from './language/language-definition';
import { getOverrideFor } from './language/language-support';

export type CommandFunction = (editor: EditorState) => void;

function movementCommand(selectNext: NodeAccessorFunction): CommandFunction {
    return (state: EditorState) => {
        const node = state.currentNode;
        if (!node) { return; }
        const next = selectNext(node);
        if (next) {
            state.currentNode = next;
        }
    };
}

export function commandsForLanguage(languageDefinition: LanguageDefinition) {

    function withOverride(commandName: CommandName, defaultFunction: NodeAccessorFunction): NodeAccessorFunction {
        return node => {
            const overrideFun = getOverrideFor(languageDefinition, commandName, node);
            if (overrideFun) {
                return overrideFun(node);
            }
            return defaultFunction(node);
        };
    }

    const gotoParent = movementCommand(withOverride('gotoParent', node => node.parent));
    const gotoFirstChild = movementCommand(withOverride('firstChild', node => node.firstNamedChild));
    const gotoNextSibling = movementCommand(withOverride('nextSibling', node => node.nextNamedSibling));
    const gotoPreviousSibling = movementCommand(withOverride('previousSibling', node => node.previousNamedSibling));

    return { gotoParent, gotoFirstChild, gotoNextSibling, gotoPreviousSibling };
}
