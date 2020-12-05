import { Selection } from "vscode";
import { SyntaxNode, Tree } from "web-tree-sitter";
import { toRange } from "./conversion-utilities";

export function findNodeAtSelection(tree: Tree, selection: Selection): SyntaxNode {
    // Start at the top. Walk down until the we find the last node which completely contains the selection.
    const cursor = tree.walk();

    // TODO: Improvement: If whitespace is selected between nodes:
    //       Select the node before the space instead of the parent?

    // For all nodes
    while (true) {
        // We know that this node complety contains the selection.
        // Does one of the child nodes completely contain the selection?
        if (!cursor.gotoFirstChild()) {
            return cursor.currentNode();
        };
        // For all children
        while (true) {
            if (cursor.nodeIsNamed && toRange(cursor).contains(selection)) {
                break;
            }
            if (!cursor.gotoNextSibling()) {                
                // None of the siblings contain the complete selection
                cursor.gotoParent();
                return cursor.currentNode();
            }
        }
    }
}