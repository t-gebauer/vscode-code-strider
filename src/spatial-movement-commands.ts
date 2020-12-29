import { EditorState } from "./editor-state"
import { EditorStateChange } from "./extension"

// --- spatial movement functions (natural, planar)

export function moveUp(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: state.currentNode.previousNamedSibling || undefined,
    }
}

export function moveDown(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: state.currentNode.nextNamedSibling || undefined,
    }
}

export function moveLeft(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: state.currentNode.parent || undefined,
    }
}

export function moveRight(state: Readonly<EditorState>): EditorStateChange {
    return {
        currentNode: state.currentNode.firstNamedChild || undefined,
    }
}
