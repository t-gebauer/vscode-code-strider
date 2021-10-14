# Change Log

All notable changes to the Code-strider extension will be documented in this file.

The format is roughly based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Features

- Support more languages: Bash, Go, Haskell, Kotlin, Lua, OCaml, PHP, TOML, YAML

### Maintenance / Build tools

- Pin grammar dependencies (managed with `nix` and `niv`)
- Update `web-tree-sitter` to 0.19.4, `tree-sitter-cli` to 0.19.3, `emscripten` to 2.0.27
- Replace `webpack` with `esbuild`

## [0.3.0]

- Improved slurping and barfing (still only HTML)
- New edit command: transpose siblings
- New edit command: splice

## [0.2.0] - 2021-02-26

- First public release
