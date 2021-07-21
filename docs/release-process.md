Step-by-step checklist to create a release

0. Execute all tests: `npm test`
1. Update `version` field in `package.json`.
2. Run `npm install` to update the `package.json` as well
3. Update the `CHANGELOG.md`
4. Package the extension: `npm run package-vsix`
5. Install and test it (manually): `codium --install-extension code-strider-0.0.0.vsix`
6. Commit the changes with message `release 0.0.0` and push them to GitHub
7. Create a release on GitHub: https://github.com/t-gebauer/vscode-code-strider/releases/new
   Tag: v0.0.0
   Copy the relevant lines from the `CHANGELOG.md` into the body
   Attach the packaged vsix
8. Bump the version, e.g. `0.1.0-dev`, commit, push...

