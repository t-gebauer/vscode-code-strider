# Prioritized for v1.0

- (all?) language agnostic editing commands

# Bugs

- Mouse selection will select the "lowest" node at the position. This is often undesired (clojure: (boolean (true))); delimiters should not be selected
- Do not register edits which do not actually change anything. (e.g. the content is already deleted).

# Next

- Documentation: language agnostic edit ommands:
    - transpose: reordering

- Implement simple language agnostic editing commands
    - replace: overwrite node (paste)
    - splice: remove delimiters around
    - delete (cut): greedy delete already exists, but is not good enough yet; and `cut` should behave similarly
- Fetch grammars more specifically (verify checksums) for reproducability
- GitHub pipeline to test and package the extension (`.vsix`)

# More ideas

- Instead of moving separators, could we replace the complete list node instead and insert new ones?
  (would require language knowledge)
- Why do we store the current node? Can we instead infer it from the current selection?
  Cache selection-node mappings?
- how to "insert inside"?
- language specific shortcuts for blocks: Versor: head, body, tail
- nested language snippets
- repository/code layout: differentiate between vscode-extension specific (commands, events) and tree-sitter specific code (algorithms for tree and node traversal, etc)
- "greedy delete" needs to be more greedy when no named siblings are around
- prevent "reveal range" from reaching the top of the editor (add some extra lines?)
- implement "precise jump" to any descendant node
    - to any thing inside the node? (e.g. words inside a paragraph)
- key:x "select the first node starting on this line"?
- select multiple nodes at once (maybe just two, and everything between?)
  - mark a node with [m] and then select everything the marked node and the current position?
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
- improve "raise" for complex languages (e.g. TypeScript)
- add Kotlin (grammar exists, but wasm-build is slow)
- re-add Fennel grammar once the author decides on a license
- go to first/last sibling (in the current node) (note: this is already possible with one more key: "parent->first-child" or "parent->last-child")
- surround object with ? (brackets, quote marks, etc.)
- always show start and end of selection => fold center to fit the complete selection into view
- or just fold everything :)
- highlight errors reported by tree-sitter? (which would definitely need a configuration option to turn it off)
- use the keys "pos1/home" and "end" to go to parents and children?
- force the user to fix errors before leaving insert mode? (How would that work if the file already has errors prior to opening?)

- (always) show node numbers in the gutter (like line numbers)
  - jump to node by number (duplicated feature, conflict with "precise jump"?)

- everything else that VIM can do:
  - marks
  - go to line / beginning / end of file
  - split / merge line
  - ...

- shortcuts during insert mode
  - jump to beginning/end of node next and previous nodes

- investigate hacky tree-sitter use: can we find nodes by editing the tree and then asking the tree, where the changes are? (Searching is currently slower than incremantal parsing)

# Rejected ideas (for now)

- Toggle extension on/off: Why? VS Code can already enable and disable the extension (globally, or per workspace).
  Use "insert mode" instead. It already disables all commands and enables normal selection.
  Better add an option to toggle specific languages.

# Open questions

How to navigate efficiently over lots of one line statements? We do not want to navigate line-by-line. Precise jump?

# Alternative implementations

Could use a `CustomEditorProvider` for either the main editor and/or the AST viewer. Could simply be more complicated, but on the other hand also improve, maybe even simplify interactions.

The AST view could also be rendered as `WebviewPanel` or `TreeView`. This could allow easy implementation of bi-directional selection.

# Limitations of VS Code

- It is not possible to change the cursor color. For example, to hide the cursor, the only thing we can do, is move the cursor out of sight (beginning or end of document). But that also moves the selection, which can create other problems.

- It is currently not possible to intercept mouse events. We can only listen to selection change events.
This makes it impossible to bind different actions to different mouse buttons.

As an alternative, we could create modal states for different selections, to differentiate between mouse selection "select thing at cursor" (atom, variable, string) and "select containing thing" (block, body, function, class).

https://github.com/microsoft/vscode/issues/3130

Or, we could do something really hacky, like registering a hover provider for the sole purpose of tracking the mouse position. Then we could bind the commands "select at cursor" "and select containing node" to hotkeys.
