import { TextEditor } from "vscode";
import { initEditor, parseJS } from "./javascript";

export function handleEditorChange(textEditor: TextEditor | undefined) {
    console.log('Editor changed');
    console.log(textEditor?.document.languageId);

    if (textEditor?.document.languageId === 'javascript') {
        console.log('its JS!');

        initEditor(textEditor);
        parseJS(textEditor.document.getText());
    }
}