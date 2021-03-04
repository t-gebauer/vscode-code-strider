Separate *unit* and *integration* tests.

Unit tests test all the code which does not depend upon the `vscode` API, and run in less than a second.
Compiling TypeScript takes longer.

Integration tests, on the other hand, have to start a (new) instance of VSCode, and are not reliable (yet?).
