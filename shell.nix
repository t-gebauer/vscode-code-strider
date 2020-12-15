{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    python3
    nodejs-12_x
    nodePackages.node-gyp

    # To generate wasm files
    tree-sitter
    emscripten

    # Code formatting
    nodePackages.prettier
  ];

  shellHook = ''
    export CODIUM_PATH=${pkgs.vscodium}
    '';
}
