# Prioritized for v1.0
- slurping
- barfing
- move node around (a minor mode?)
- different commands: first child/last child and follow flow
  "follow flow" should go inside AND to the next line while, first child probably stays on the line
- Define "blocks" per language?

# Bugs
- parse tree gets out of sync after some edits?
- Mouse selection will select the "lowest" node at the position. This is often undesired (clojure: (boolean (true)))

# More ideas
- implement "raise"
- implement "ace jump" to nth-child
- "delete" should delete lines if there is nothing else on the line (maybe a different delete command?)
- key:x "select node starting on line"?
- select multiple nodes at once (maybe just two, and everything between?)
- formatting
  - format node
  - indent node
  - add line above/below
- multi-cursors
  - add cursors before/behind all child nodes (or all selected nodes)
- undo complete edits (ideavim still doesn't do that, do they have a good reason?)
- config + hotkeys
  - add an option to disable specific languages
- Select node(s) in AST view
- add Kotlin (grammar exists, but wasm-build is slow)
- go to first/last sibling (in the current node) (note: this is already possible with one more key: "parent->first-child" or "parent->last-child")
- selection: mark current node, select everything between current and last mark
- surround object with ? (brackets, quote marks, etc.)
- always show start and end of selection => fold center to fit the complete selection into view
- remove not-really-needed testing library: soft-assert?
- highlight errors
- use the keys "pos1/home" and "end" to go to parents and children?
- force the user to fix errors before leaving insert mode (how would that work if the file already has errors prior to opening?)

- (always) should node numbers in the gutter (like line numbers)
  - jump to node by number

- everything else that VIM can do:
  - marks
  - go to line / beginning / end of file
  - split / merge line

- ace jump everywhere
  - direct child nodes
  - any child nodes
  - inside a node and insert

- shortcuts during insert mode
  - jump to beginning/end of node next and previous nodes

# Rejected ideas (for now)
- Toggle extension on/off: Why? VS Code can already enable and disable the extension (globally, per workspace).
  Use "insert mode" instead. It already disables all commands and enables normal selection.
  Better add an option to toggle specific languages.

# Details

directional movement
key right-arrow -> select something which is right of the current selection

navigation vs change vs insert mode
navigation: move around
change: edit the selected structure in a predefined way
insert: normal text insertion

### Do not do everything

It's hard enough to build a solution that works for one language. Yes, sure, tree walking is possible in every language, but you knew that already. The navigation has to feel smooth and useful. This will only be possible with manual -- per language -- intervention.

# Open questions

How to navigate efficiently over lots of one line statements? We do not want to navigate line-by-line. Ace jump?

# Interesting VS Code changelogs
## v1.49

- Only format modified text

## v1.52

- Open Keyboard Shortcuts editor with query filter
vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', 'query');

- Status bar entry background color API (proposed?)


# Alternative implementations

Could use a `CustomEditorProvider` for either the main editor and/or the AST viewer. Could simply be more complicated, but on the other hand also improve, maybe even simplify interactions.

The AST view could also be rendered as `WebviewPanel` or `TreeView`. This could allow easy implementation of bi-directional selection.

# Limitations of VS Code

- It is not possible to change the cursor color. For example to hide the cursor. The only thing we can do, is move the cursor out of sight (beginning or end of document). But that also moves the selection, which can create other problems.

- It is currently not possible to intercept mouse events. We can only listen to selection change events.
This makes it impossible to bind different actions to different mouse buttons.

As an alternative, we could create modal states for different selections, to differentiate between mouse selection "select thing at cursor" (atom, variable, string) and "select containing thing" (block, body, function, class).

https://github.com/microsoft/vscode/issues/3130

Or we could do something really hacky, like registering a hover provider for the sole purpose of tracking the mouse position. Then we could bind the commands "select at cursor" "and select containing node" to hotkeys.
