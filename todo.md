# Prioritized
- automatically skip nodes which take the same space
- generally don't select empty nodes? (*looking at html*)
- directional movement (similar to find-node-at-selection, but instead of starting at the root node, we can start at the current-node: search forward, search backward?)
- improve javascript outwards movement
- add Python
- add HTML rules
- slurping
- barfing
- move node around (a minor mode?)

# Bugs
- AST view will crash the extension if it does not load fast enough:
    > Uncaught RuntimeError: abort(Error: Could NOT open editor for "code-strider-ast:/home/maybe/projects/ba-private/test-files/core.clj.2729.ast" because another editor opened in the meantime.).
    To reproduce: Make a few edits in very short succession: Undo does this pretty well
- Slow editing performance for large files (core.clj 8000 lines)
- Mouse selection will select the "lowest" node at the position. This is often undesired (clojure: (boolean (true)))

# More
- select multiple nodes at once
- undo complete edits
- config + hotkeys
    - Toggle extension on/off
    - Toggle AST view on/off
- Select node(s) in AST view
- add YAML
- add TypeScript
- add Kotlin
- add CSS

# Details

directional movement
key right-arrow -> select something which is right of the current selection

navigation vs change vs insert mode
navigation: move around
change: edit the selected structure in a predefined way
insert: normal text insertion

## Html

Don't select "empty" text nodes.
Don't select start and end tags.

### Do not do everything

It's hard enough to build a solution that works for one language. Yes, sure, tree walking is possible in every language, but you knew that already. The navigation has to feel smooth and useful. This will only be possible with manual -- per language -- intervention.

# Open questions

How to navigate efficiently over lots of one line statements? We do not want to navigate line-by-line.


Show ast in tree-view sidebar?

# v1.49
- Only format modified text

# v1.52

- Open Keyboard Shortcuts editor with query filter
vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'query');

- Status bar entry background color API (proposed?)
