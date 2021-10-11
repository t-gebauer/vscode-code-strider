#! /usr/bin/env nix-build

# Uses [niv](https://github.com/nmattia/niv) to manage sources.
# Add a new grammar from GitHub:
#    niv add tree-sitter/tree-sitter-c
# Update a grammar:
#    niv update tree-sitter-c

let
  sources = import nix/sources.nix;
  pkgs = import sources.nixpkgs { };
  unstable = import sources.nixpkgs-unstable { };

  mkTreeSitterGrammar = id: src: { preBuild ? "" }:
    pkgs.runCommand "tree-sitter-${id}-wasm" { inherit src; } ''
      mkdir $out
      mkdir home
      export HOME=$PWD/home

      cp -r $src/* .
      chmod -R 777 .

      test -e LICENSE && cp LICENSE $out/tree-sitter-${id}.LICENSE
      test -e LICENSE.md && cp LICENSE.md $out/tree-sitter-${id}.LICENSE.md
      test -e COPYING.txt && cp COPYING.txt $out/tree-sitter-${id}.COPYING.txt

      ${preBuild}

      PATH=$PATH:${unstable.emscripten}/bin
      ${pkgs.tree-sitter}/bin/tree-sitter build-wasm

      cp *.wasm $out/
    '';

  grammar = id: src:
    mkTreeSitterGrammar id src { };

in
pkgs.symlinkJoin {
  name = "tree-sitter-wasm-builds-combined";
  paths = with sources; [
    (grammar "bash" tree-sitter-bash)
    (grammar "c" tree-sitter-c)
    (grammar "clojure" tree-sitter-clojure)
    (grammar "css" tree-sitter-css)
    (grammar "fennel" tree-sitter-fennel)
    (grammar "go" tree-sitter-go)
    (grammar "haskell" tree-sitter-haskell)
    (grammar "html" tree-sitter-html)
    (grammar "java" tree-sitter-java)
    (grammar "javascript" tree-sitter-javascript)
    (grammar "json" tree-sitter-json)
    (grammar "lua" tree-sitter-lua)
    (grammar "markdown" tree-sitter-markdown)
    (grammar "nix" tree-sitter-nix)
    (mkTreeSitterGrammar "ocaml" tree-sitter-ocaml
      # contains multiple grammars: ocaml (.ml) ; interface (.mli)
      { preBuild = "cd ocaml"; })
    (grammar "php" tree-sitter-php)
    (grammar "python" tree-sitter-python)
    (grammar "scss" tree-sitter-scss)
    (grammar "toml" tree-sitter-toml)
    (mkTreeSitterGrammar "typescript" tree-sitter-typescript
      # contains multiple grammars: TypeScript and JSX
      { preBuild = "cd typescript"; })
    (grammar "yaml" tree-sitter-yaml)
  ];
}
