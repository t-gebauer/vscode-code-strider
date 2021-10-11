{ pkgs ? import <nixpkgs> { } }:

let
  sources = import nix/sources.nix;
  niv-pkgs = import sources.nixpkgs { };
  niv-unstable = import sources.nixpkgs-unstable { };
  print-versions = pkgs.writeShellScriptBin "print-versions" ''
    echo nixos stable:
    ${niv-pkgs.tree-sitter}/bin/tree-sitter --version
    ${niv-pkgs.emscripten}/bin/emcc --version
    echo nixos unstable:
    ${niv-unstable.tree-sitter}/bin/tree-sitter --version
    ${niv-unstable.emscripten}/bin/emcc --version
  '';
  update-wasm = pkgs.writeShellScriptBin "update-wasm" ''
    nix-build build-wasm.nix
    rm wasm/*
    cp result/* wasm/
    chmod 644 wasm/*
  '';
  manual-test = pkgs.writeShellScriptBin "manual-test" ''
    npm run webpack \
    && npm start . -- --user-data-dir data --disable-extension
  '';
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    nodejs-12_x
    nodePackages.node-gyp

    # Code formatting
    nodePackages.prettier

    update-wasm
    manual-test
    #print-versions
  ];

  shellHook = ''
    export CODIUM_PATH=${pkgs.vscodium}
  '';
}
