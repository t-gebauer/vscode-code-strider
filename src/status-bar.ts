import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode";
import { EditorState } from "./editor-state";

export const statusBar = new class implements Disposable {

    private statusBarItem: StatusBarItem;

    constructor() {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left,
        );
        this.statusBarItem.show();
    }

    dispose() {
        this.statusBarItem.dispose();
    }

    setText(text: string) {
        this.statusBarItem.text = text;
    }
};

export function updateStatusBar(state: EditorState) {
    if (state.insertMode) {
        statusBar.setText('INSERT');
    } else {
        statusBar.setText(`STRUCT : ${state.currentNode.type}`);
    }
}