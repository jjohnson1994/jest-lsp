# Jest LSP

A language server for the Jest Testing Framework.

Tests are run on file: open, change and save. Currently only .spec and .test files will trigger a test run.

## Functionality

- Diagnostics: just about
- Code Completion: wip
- Code Actions: wip
- Auto Complete: wip

## Installing
Install Jest LSP globally using any package manager
### NPM
```
npm i -g jest-lsp
```
### Yarn
```
yarn global add jest-lsp
```
### PNPM
```
pnpm add -g jest-lsp
```

## Usage
Jest LSP should work with any language server client, but there are some examples here.
### Coc.nvim
Add the following to coc-settings.json (:CocSettings)
``` json
"languageserver": {
  "jest": {
    "module": Path to jest-lsp (i.e. output of `which jest-lsp`),
    "args": ["--node-ipc"],
    "filetypes": [
      "typescript",
      "javascript",
      "typescriptreact",
      "javascriptreact"
    ],
    "trace.server": "verbose"
  }
},
```
