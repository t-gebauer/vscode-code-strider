import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode";

// TODO: extension should dispose this? Maybe move life cycle into main file extension.ts
export const statusBar = new class implements Disposable {

    private statusBarItem: StatusBarItem;
    private nodeType = '';
    private extensionMode = '';

    constructor() {
        this.statusBarItem = window.createStatusBarItem(
            StatusBarAlignment.Left,
        );
        this.statusBarItem.show();
    }

    dispose() {
        this.statusBarItem.dispose();
    }

    updateNodeType(type: string) {
        this.nodeType = type;
        this.setText();
    }

    updateMode(mode: string) {
        this.extensionMode = mode;
        this.setText();
    }

    private setText() {
        this.statusBarItem.text = `${this.extensionMode} : ${this.nodeType}`;
    }
};
