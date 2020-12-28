with import <nixpkgs> {};
let
  mkTreeSitterGrammar = {id, src}: runCommand
    "tree-sitter-${id}-latest"
    { inherit src; }
    ''
      mkdir home
      export HOME=home

      cp -r $src/* .
      PATH=$PATH:${pkgs.emscripten}/bin

      ${pkgs.tree-sitter}/bin/tree-sitter build-wasm

      mkdir $out
      cp *.wasm $out/
    '';

  grammar = id: url: mkTreeSitterGrammar {
    inherit id;
    # fetch latest commit from GitHub (impure!)
    src = builtins.fetchGit {
      inherit url;
      ref = "master";
    };
  };

  officialGrammar = id: grammar id "https://github.com/tree-sitter/tree-sitter-${id}";

in
# We just merge all these derivations into one.
# Could we use the trivial builder `symlinkJoin` for this?
runCommandLocal "tree-sitter-wasm-builds-combined" {
    clojure = (grammar "clojure" https://github.com/sogaiu/tree-sitter-clojure);
    fennel = (grammar "fennel" https://github.com/travonted/tree-sitter-fennel);
    html = officialGrammar "html";
    javascript = officialGrammar "javascript";
    python = officialGrammar "python";
} ''
    mkdir $out
    cp $clojure/*.wasm $out/
    cp $fennel/*.wasm $out/
    cp $html/*.wasm $out/
    cp $javascript/*.wasm $out/
    cp $python/*.wasm $out/
  ''
