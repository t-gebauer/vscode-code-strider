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

// TODO: explain configuration

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Contributions

This extension contributes the languages `Fennel` and `Nix`. These are only partial definitions. Basically, only mapping their respective file suffixes to a language identifier. This allows consistent detection of all supported languages.

## Updating parsers

With **nix**, the expression `build-wasm.nix` can be used to fetch and build the latest parsers from their git repositories.

``` sh
nix-build build-wasm.nix
cp ./result/*.wasm ./wasm/
```

## Known Issues

- there is a style collision between the custom selection decoratior and the default text selection decorators:
  - line-breaks highlighted/selected in the current node
  - the default cursor is still visible (it has no meaning in the structured navigation mode)

- when switching files:
  - an error message pops up "Invalid state: no compatible editor active"
  - the first node in the file gets selected

- The extension does not initialize when changing the language mode of a file.
  You have to switch to another editor and back to initialize the parser.
### AST Viewer

For performance reasons the AST viewer does not update during insert mode.

## Release Notes

### 1.0.0

Initial release

