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
in
pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    nodejs-12_x
    nodePackages.node-gyp

    # Code formatting
    nodePackages.prettier

    #print-versions
  ];

  shellHook = ''
    export CODIUM_PATH=${pkgs.vscodium}
  '';
}
