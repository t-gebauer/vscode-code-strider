with import <nixpkgs> {};
let
  mkTreeSitterGrammar = {id, src}: stdenv.mkDerivation {
    inherit src;
    name = "tree-sitter-${id}-latest";
    buildInputs = [ emscripten tree-sitter ];
    configurePhase = ''
      mkdir home
      export HOME=home
    '';
    buildPhase = ''
      ${pkgs.tree-sitter}/bin/tree-sitter build-wasm
    '';
    installPhase = ''
      mkdir $out
      cp *.wasm $out/
    '';
  };

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
