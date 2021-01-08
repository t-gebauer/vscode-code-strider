# code-strider README

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

// TODO: add animations?

## Requirements

### Hardware / Slight performance impact

Don't try to use this extension if your computer is already struggling with your existing VS Code extensions. Other than that, tree-sitter incremental parsing is actually quite fast.

In the future I might try to integrate native tree-sitter again, but that is currently quite complicated. The extension would need to be compiled with the exact same version of VS Code where it will be used.

### Software

No dependencies. This extension uses *wasm* builds of `tree-sitter`, thus no native dependencies are required.

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

