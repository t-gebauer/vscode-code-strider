# code-strider README

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

// TODO: add animations?

## Requirements

No dependencies. This extension uses *wasm* builds of `tree-sitter`, thus no native dependencies are required.

## Extension Settings

// TODO: explan configuration

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Contributions

This extension contributes the language `Fennel`, but that only means, that files ending in `.fnl` are recognized with the languageId `fennel`. While this would not be strictly necessary to recognized such files, this makes it consistent with how all other languages are handled, which are all recognized by VS Code by default.

## Updating parsers
With **nix**, the expression `build-wasm.nix` can be used to fetch and build the latest parsers from their git repositories.

``` sh
nix-build build-wasm.nix
cp ./result/*.wasm ./wasm
```

## Known Issues

Some :)

## Release Notes

### 1.0.0

Initial release

