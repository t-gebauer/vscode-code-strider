import { Disposable, StatusBarAlignment, StatusBarItem, window } from "vscode"
import { EditorState } from "./editor-state"
import { Extension, InteractionMode } from "./extension"

function modeText(mode: InteractionMode): string {
    switch (mode) {
        case InteractionMode.Insert:
            return "INSERT"
        case InteractionMode.Structural:
            return "STRUCT"
    }
}

export function registerStatusBar(ext: Extension): Disposable {
    const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left)
    statusBarItem.show()

    function update(mode: InteractionMode, currentNodeType: string) {
        statusBarItem.text = `${modeText(mode)} : ${currentNodeType}`
    }

    function eventHandler(state: EditorState) {
        update(
            state.insertMode ? InteractionMode.Insert : InteractionMode.Structural,
            state.currentNode.type
        )
    }

    return Disposable.from(
        ext.onActiveEditorChange(eventHandler),
        ext.onActiveEditorModeChange(eventHandler),
        ext.onActiveEditorNodeSelectionChange(eventHandler),
        statusBarItem
    )
}
