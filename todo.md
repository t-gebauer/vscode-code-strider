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
- delete current node, including separators

# Bugs
- Mouse selection will select the "lowest" node at the position. This is often undesired (clojure: (boolean (true)))

# More
- select multiple nodes at once
- undo complete edits
- config + hotkeys
    - Toggle extension on/off
- Select node(s) in AST view
- add YAML
- add TypeScript
- add Kotlin
- add CSS
- go to first/last sibling (in the current node)
- selection: mark current node, select everything between current and last mark
- surround object with ?, brackets, quote marks, etc.

- always show start and end of selection => fold center to fit the complete selection into view

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


# Alternative implementations

Could use a `CustomEditorProvider` for either the main editor and/or the AST viewer. No idea whether that would simply be more complicated, or also improve, maybe even simplify interactions.

The AST view could also be rendered as `WebviewPanel` or `TreeView`.


# Limitations of VS Code

- It is not possible to change the cursor color. For example to hide the cursor. The only thing we can do, is move the cursor out of sight (beginning or end of document). But that also moves the selection, which can create other problems.

- It is currently not possible to intercept mouse events. We can only listen to selection change events.
This makes it impossible to bind different actions to different mouse buttons.

As an alternative, we could create modal states for different selections, to differentiate between mouse selection "select thing at cursor" (atom, variable, string) and "select containing thing" (block, body, function, class).

https://github.com/microsoft/vscode/issues/3130

Or we could do something really hacky, like registering a hover provider for the sole purpose of tracking the mouse position. Then we could bind the commands "select at cursor" "and select containing node" to hotkeys.
