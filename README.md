# Code-strider

## Features

This extension provides a structured navigation and editing mode.

This interface is modal. You can either navigate around the code or insert text but not both at the same time. The navigational mode is active by default.

All keybindings are configurable. The defaults are heavily influenced by Vim.


To exit insert-mode, simply press [Escape] (`exit-insert-mode`).

### Navigate complex code structures with ease

Use the arrow keys or the HJKL keys (default) to easily move over source code fragments.
These are bound to the smart movement commands `move-up`, `move-down`, `move-left`, `move-right`, which will try to move to code-structures in the desired direction.

The commands `follow-structure` [f] and `follow-structure-last` [Shift+f] should be used to navigate further *inside* of a selected node.

<!-- TODO: add animations -->

If any movement operaton did not select your wished for node, you can return to previously selected nodes by using `back-to-previous-selection` [b]. (Note: this undo-stack is cleared on file-change or any file modifications)

#### Direct tree navigation

It is also possible to move directly on the Tree-sitter AST with the `tree-move-...` commands.

### Perform syntax aware editing operations

#### Inserting text

- `insert-before` [i] Insert directly *before* the current node
- `insert-after` [a] Insert directly *after* the current node
- `insert-below` [o] Start inserting text on a line *below* the currently selected node
- `insert-above` [Shift-o] Start inserting text on a line *above* the currently selected node
- `delete-insert` [c] Change the currently selected node by deleting its text and entering insert-mode.

#### Deleting nodes

- `greedy-delete` (default binding: [Backspace])
  Delete the currently targeted structure and everything around it up until the next named node.

![greedy-delete GIF](images/greedy-delete.gif)

For convinience the default VS Code `undo` command is bound to [u].

### Inspect the abstract syntax tree (AST)

Try the AST viewer if you are curious about the abstract syntax tree of your code.
Activate it by opening the command palette [F1] and selecting the `Toggle AST viewer` command.

> Note: The AST viewer does not update during insert-mode.

## Requirements

No dependencies. This extension uses the *WASM* builds of [Tree-sitter](https://github.com/tree-sitter/tree-sitter), thus no native dependencies are required.

In the future I might try to integrate native tree-sitter again, but that is currently quite complicated. The extension would need to be compiled with the exact same version of VS Code where it will be used.

## Extension Settings

Currently, there are no configurable settings.

## Contributions

This extension contributes the languages `Fennel` and `Nix`. These are only partial definitions. Basically, only mapping their respective file suffixes to a language identifier. This allows consistent detection of all supported languages.

### Custom commands

You can create custom key bindings which are only effective during Code-strider navigation or insert-mode. The following contexts can be used in a key bindings `when` expression:

- `code-strider:is-editor-supported` indicates whether this extension is active in the currently active text editor (the language is supported).
- `code-strider:is-insert-mode` indicates whether text insertion is active

For example, all default key bindings active during the structured-navigation mode use this expression:

```json
  "when": "editorTextFocus && code-strider:is-editor-supported && !code-strider:is-insert-mode"
```

## Updating parsers

With [nix](https://nixos.org/), the expression `build-wasm.nix` can be used to fetch and build all the latest parsers from their git repositories.

```sh
nix-build build-wasm.nix
cp ./result/*.wasm ./wasm/
```

## Known Issues

- there is a style collision between the custom selection decorator and the default text selection decorators:
  - line-breaks highlighted/selected in the current node
  - the default cursor is still visible (it has no meaning in the structured navigation mode)

- The extension does not (re-)initialize when changing the language mode of a file.
  It is necessary to switch to another editor and back to detect the language change.
