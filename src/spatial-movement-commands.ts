import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"
import { nodeAbove, nodeBelow, nodeLeftOf, nodeRightOf } from "./spatial-movement"


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
