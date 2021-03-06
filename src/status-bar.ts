// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { Disposable, StatusBarAlignment, window } from "vscode"
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

    function eventHandler(state?: EditorState) {
        if (state) {
            const mode = state.insertMode ? InteractionMode.Insert : InteractionMode.Structural
            statusBarItem.text = `${modeText(mode)} : ${state.currentNode.type}`
        } else {
            statusBarItem.text = ` --- `
        }
    }

    return Disposable.from(ext.onActiveEditorStateChange(eventHandler), statusBarItem)
}
