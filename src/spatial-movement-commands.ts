// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"
import { nodeAbove, nodeBelow, nodeLeftOf, nodeRightOf } from "./lib/spatial-movement"

export function moveUp(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeAbove(state.currentNode),
    }
}

export function moveDown(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeBelow(state.currentNode),
    }
}

export function moveLeft(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeLeftOf(state.currentNode),
    }
}

export function moveRight(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: nodeRightOf(state.currentNode),
    }
}
