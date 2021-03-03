// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { ThemeColor } from "vscode"

// A list of all colors used anywhere in this extension
// Reference: https://code.visualstudio.com/api/references/theme-color
export namespace Colors {
    export const selectionBackground = new ThemeColor("editor.selectionBackground")
    export const inactiveSelectionBackground = new ThemeColor("editor.inactiveSelectionBackground")
}
