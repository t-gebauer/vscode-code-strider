# code-strider README

## Features

### Navigate complex code structures with ease

### Perform syntax aware editing operations

- `code-strider:greedy-delete` (default binding: [Backspace])
  Delete the currently targeted structure and everything around it up until the next named node.

![greedy-delete GIF](images/greedy-delete.gif)
<!-- TODO: add animations -->

## Requirements

No dependencies. This extension uses *wasm* builds of `tree-sitter`, thus no native dependencies are required.

In the future I might try to integrate native tree-sitter again, but that is currently quite complicated. The extension would need to be compiled with the exact same version of VS Code where it will be used.

## Extension Settings

Currently, there are no configurable settings.

## Contributions

This extension contributes the languages `Fennel` and `Nix`. These are only partial definitions. Basically, only mapping their respective file suffixes to a language identifier. This allows consistent detection of all supported languages.

## Updating parsers

With **nix**, the expression `build-wasm.nix` can be used to fetch and build the latest parsers from their git repositories.

``` sh
nix-build build-wasm.nix
cp ./result/*.wasm ./wasm/
```

## Known Issues

- there is a style collision between the custom selection decorator and the default text selection decorators:
  - line-breaks highlighted/selected in the current node
  - the default cursor is still visible (it has no meaning in the structured navigation mode)

- The extension does not (re-)initialize when changing the language mode of a file.
  It is necessary to switch to another editor and back to detect the language change.

- Control-click (go to definition) does not seem work in the structured selection mode.
  Either a keyboard hotkey, or go to insert mode first.

### AST Viewer

For performance reasons the AST viewer does not update during insert mode.

## Release Notes

### 1.0.0

Initial release

