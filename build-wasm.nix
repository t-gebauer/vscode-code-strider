with import <nixpkgs> { };
let
  mkTreeSitterGrammar = { id, src, preBuild ? "" }:
    runCommand "tree-sitter-${id}-latest" { inherit src; } ''
      mkdir home
      export HOME=$PWD/home

      cp -r $src/* .
      chmod -R 777 .

      ${preBuild}

      PATH=$PATH:${pkgs.emscripten}/bin
      ${pkgs.tree-sitter}/bin/tree-sitter build-wasm

      mkdir $out
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
    (grammar "clojure" "https://github.com/sogaiu/tree-sitter-clojure")
    (grammar "fennel" "https://github.com/travonted/tree-sitter-fennel")
    (officialGrammar "html")
    (officialGrammar "javascript")
    (officialGrammar "python")
    (mkTreeSitterGrammar {
      id = "typescript";
      src = typescriptRepo;
      # there are multiple grammars this repository: TypeScript and JSX
      preBuild = "cd typescript";
    })
  ];
}
