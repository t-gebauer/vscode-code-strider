import { TextEditor } from "vscode";
import { parseJS } from "./javascript";

export function handleEditorChange(textEditor: TextEditor | undefined) {
    console.log('Editor changed');
    console.log(textEditor?.document.languageId);

    if (textEditor?.document.languageId === 'javascript') {
        console.log('its JS!');

        parseJS(textEditor.document.getText());
    }
}