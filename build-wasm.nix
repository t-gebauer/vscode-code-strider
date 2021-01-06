with import <nixpkgs> { };
let
  mkTreeSitterGrammar = { id, src, preBuild ? "" }:
    runCommand "tree-sitter-${id}-latest" { inherit src; } ''
      mkdir $out
      mkdir home
      export HOME=$PWD/home

      cp -r $src/* .
      chmod -R 777 .

      test -e LICENSE && cp LICENSE $out/tree-sitter-${id}.LICENSE
      test -e COPYING.txt && cp COPYING.txt $out/tree-sitter-${id}.COPYING.txt

      ${preBuild}

      PATH=$PATH:${pkgs.emscripten}/bin
      ${pkgs.tree-sitter}/bin/tree-sitter build-wasm

      cp *.wasm $out/
    '';

  grammar = id: url:
    mkTreeSitterGrammar {
      inherit id;
      # fetch latest commit from GitHub (impure!)
      src = builtins.fetchGit {
        inherit url;
        ref = "master";
      };
    };

  officialGrammar = id:
    grammar id "https://github.com/tree-sitter/tree-sitter-${id}";

  typescriptRepo = builtins.fetchGit {
    url = "https://github.com/tree-sitter/tree-sitter-typescript";
    ref = "master";
  };

in symlinkJoin {
  name = "tree-sitter-wasm-builds-combined";
  paths = [
    (officialGrammar "c")
    (officialGrammar "css")
    (officialGrammar "html")
    (officialGrammar "java")
    (officialGrammar "javascript")
    (officialGrammar "json")
    (officialGrammar "python")
    (grammar "clojure" "https://github.com/sogaiu/tree-sitter-clojure")
    (grammar "fennel" "https://github.com/travonted/tree-sitter-fennel")
    (grammar "markdown" "https://github.com/ikatyang/tree-sitter-markdown")
    (grammar "nix" "https://github.com/cstrahan/tree-sitter-nix")
    (grammar "scss" "https://github.com/serenadeai/tree-sitter-scss")
    # (grammar "yaml" "https://github.com/ikatyang/tree-sitter-yaml") TODO: build fails
    (mkTreeSitterGrammar {
      id = "typescript";
      src = typescriptRepo;
      # there are multiple grammars this repository: TypeScript and JSX
      preBuild = "cd typescript";
    })
  ];
}
