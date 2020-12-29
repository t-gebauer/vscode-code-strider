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

  # We just merge all these derivations into one.
  # Could we use the trivial builder `symlinkJoin` for this?
in runCommandLocal "tree-sitter-wasm-builds-combined" {
  clojure = (grammar "clojure" "https://github.com/sogaiu/tree-sitter-clojure");
  fennel = (grammar "fennel" "https://github.com/travonted/tree-sitter-fennel");
  html = officialGrammar "html";
  javascript = officialGrammar "javascript";
  python = officialGrammar "python";
  typescript = mkTreeSitterGrammar {
    id = "typescript";
    src = typescriptRepo;
    # There are multiple grammars this repository: TypeScript and JSX.
    preBuild = "cd typescript";
  };
} ''
  mkdir $out
  cp $clojure/*.wasm $out/
  cp $fennel/*.wasm $out/
  cp $html/*.wasm $out/
  cp $javascript/*.wasm $out/
  cp $python/*.wasm $out/
  cp $typescript/*.wasm $out/
''
