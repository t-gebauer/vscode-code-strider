# Code-strider

Universal structural navigation and editing.

---

The goal of this extension is to enable structural navigation and editing regardless of language.

Inspired by the Lisp editing modes
[Lispy](https://github.com/abo-abo/lispy),
[Paredit](http://mumble.net/~campbell/emacs/paredit/paredit.html)
and [Interlisp SEdit](https://interlisp.org/).

Code-strider is powered by [Tree-sitter](https://github.com/tree-sitter/tree-sitter), a parser generator for fast, incremental, error-resistant parsers, and a community of Tree-sitter grammar authors and maintainers.

## Status

Prototype. Expect buggy behavior. However, all the features in this README should work as advertised.

## Features

This editing interface is **modal**. You can either navigate around the code or insert text; but not both at the same time. The navigational mode is active by default.

All keybindings are configurable. The defaults are influenced by Vim.

### Navigate complex code structures with ease

Use the arrow keys to easily move over source code fragments.
These are bound to the smart movement commands `move-up`, `move-down`, `move-left`, `move-right`, which will try to move to code-structures in the desired direction.

The commands `follow-structure` [f] and `follow-structure-last` [Shift+f] should preferably be used to navigate further *inside* a selected node.

To select the parent of the currently selected node use `move-parent` [g]. 

If any movement operation did not select your wished for node, you can return to previously selected nodes by using `back-to-previous-selection` [b]. (Note: this undo-stack is cleared when changing or modifying the file.)

#### Direct tree navigation

It is possible to move directly on the Tree-sitter AST with the `tree-move-...` commands.
The commands `parent, next, previous, first child` are by default bound to `alt` + `h j k l` respectively.

### Perform syntax aware editing operations

#### Inserting text

- `insert-before` [i] Insert directly *before* the current node
- `insert-after` [a] Insert directly *after* the current node
- `insert-below` [o] Start inserting text on a line *below* the currently selected node
- `insert-above` [Shift-o] Start inserting text on a line *above* the currently selected node
- `delete-insert` [c] Change the currently selected node by deleting its text and entering insert-mode.

To exit insert-mode, simply press [Escape] (`exit-insert-mode`).

For convenience the default VS Code `undo` command is bound to [u].

#### Deleting nodes

- `greedy-delete` (default binding: [Backspace])
  Delete the currently targeted structure and everything around it up until the next named node.

![greedy-delete GIF](images/greedy-delete.gif)

#### Slurping and barfing

- `slurp-backward` [7] Include the previous sibling as first child
- `slurp-forward` [8] Include the next sibling as last child
- `barf-backward` [Shift-7] Extract the first child as previous sibling
- `barf-forward` [Shift-8] Extract the last child as next sibling

Currently, only useful in HTML.
While it is possible to use the commands in any language, the results are most definitely not what you would expect.
The algorithms for slurping and barfing are currently tuned for use on HTML code.

Theoretically, slurping and barfing are inverse operations, but in the current implementation line breaks are removed by the `slurping` and not restored by `barfing`.

![slurping-and-barfing GIF](images/slurping-and-barfing.gif)

(The formatting changes are not intentional and should be fixed.)

### Supported languages

        Bash
        C
        Clojure
        CSS
        Fennel
        Go
        Haskell
        HTML
        Java
        JavaScript
        JSON
        Kotlin
        Lua
        Markdown
        Nix
        OCaml
        PHP
        Python
        SCSS
        TypeScript
        YAML

More to come. The goal is to support all languages supported by [Tree-sitter](https://github.com/tree-sitter/tree-sitter). So all of them :)

### Inspect the abstract syntax tree (AST)

Try the AST viewer if you are curious about the abstract syntax tree of your code.
Activate it by opening the command palette [F1] and selecting the `Toggle AST viewer` command.

> Note: The AST viewer does not update during insert-mode.

## Requirements

No dependencies. This extension bundles the *WASM* builds of [Tree-sitter](https://github.com/tree-sitter/tree-sitter), thus, no native dependencies are required.

In the future I might try to integrate native tree-sitter again, but that is currently quite complicated. The extension would need to be compiled with the exact same version of VS Code where it will be used.

## Extension Settings

Currently, there are no configurable settings.

## Contributions

This extension contributes the language `Nix`. These are only partial definitions. Basically only mapping their respective file suffixes to a language identifier. This allows consistent detection of all supported languages independent of any other extensions.

### Custom commands

You can create custom key bindings which are only active during either Code-strider navigation or insert-mode. The following contexts can be used in a key binding's `when` expression:

- `code-strider:is-editor-supported` indicates whether this extension is active in the currently active text editor (this is true if the language is supported).
- `code-strider:is-insert-mode` indicates whether text insertion is active.

For example, all default key bindings active during the structured-navigation mode use this expression:

```json
  "when": "editorTextFocus && code-strider:is-editor-supported && !code-strider:is-insert-mode"
```

## Known Issues

- The extension does not (re-)initialize when changing the language mode of a file.
  It is necessary to switch to another editor and back to detect the language change.

- If you move the AST viewer manually (e.g. by dragging it into another editor group), the selections will no longer update.
  Workaround: Change the editor layout instead.
  For example, use `View: Two rows editor layout` **after** opening the AST viewer to move it to the bottom row.

- The extension will crash if a file is deleted during parsing.
  Workaround: reload VS Code (Action: `Developer: Reload Window`)

- This extension is not cat-proof, yet. For example: Holding the [delete] key in structural navigation mode might block the extension host process.
  Workaround: reload VS Code (Action: `Developer: Reload Window`)

# Development

Requirements: NodeJS (12)

    npm install

For testing and running, either use the npm commands from the `scripts` section in `package.json`
or use the launch configs in VS Code (`.vscode`).

Run tests: `npm test`  
Compile (fast): `npm run webpack`  
Compile (optimized): `npm run webpack-prod`  
Automatically recompile on file changes: `npm run watch`  
Start VS Code and load the extension: `npm start`  

The `start` script has `codium` hard-coded. Replace it if you want to use VS Code, or use it directly:

    code --extensionDevelopmentPath $(pwd)

The path parameter has to be absolute, so use `$(pwd)` instead of `.`.  
Make sure to compile first (`npm run webpack`) before starting with `npm start`.

# Credits

Tree-sitter: The MIT License (MIT)  Copyright (c) 2018 Max Brunsfeld  

This extension bundles several Tree-sitter grammmars, which can be found in the `wasm` directory with their respective licenses.
Their sources are documented in the `build-wasm.nix` script.

# License

Copyright 2021 Timo Gebauer

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

See `COPYING` for a copy of the GNU General Public License.
Or <https://www.gnu.org/licenses/>.
