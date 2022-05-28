"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require('util');
const node_1 = require("vscode-languageserver/node");
const vscode_uri_1 = require("vscode-uri");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const jest_editor_support_1 = require("jest-editor-support");
const init = () => {
    const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
    const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
    documents.onDidChangeContent(event => {
        validateTextDocument(event.document, connection);
    });
    documents.onDidOpen(event => {
        validateTextDocument(event.document, connection);
    });
    documents.onDidSave(event => {
        validateTextDocument(event.document, connection);
    });
    documents.listen(connection);
    connection.listen();
};
const validateTextDocument = async (textDocument, connection) => {
    const path = vscode_uri_1.URI.parse(textDocument.uri).path;
    const isSpecFile = /\.spec\.|\.test\.g/.test(textDocument.uri);
    // @ts-ignore runner does not need args
    const runner = new jest_editor_support_1.Runner({
        jestCommandLine: `jest ${path}`
    });
    const diagnostics = [];
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    if (!isSpecFile) {
        // TODO related tests should be run here instead
        // jestCommandLine: `jest ${isSpecFile ? '' : '--findRelatedTests' } ${path}`
        return;
    }
    runner.on('executableJSON', (jestTotalResults) => {
        console.log('got total results', util.inspect(jestTotalResults, false, null));
        jestTotalResults.testResults.forEach(testResult => {
            testResult.assertionResults.forEach(assertionResult => {
                if (assertionResult.failureMessages.length === 0) {
                    return;
                }
                // @ts-ignore location does not exist on assertionResult?
                const { column, line } = assertionResult?.location || {};
                diagnostics.push({
                    severity: node_1.DiagnosticSeverity.Error,
                    range: {
                        start: {
                            character: column,
                            line
                        },
                        end: {
                            character: 100,
                            line
                        },
                    },
                    message: assertionResult.failureMessages.join(),
                    source: 'jest'
                });
            });
            connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
        });
        runner.closeProcess();
    });
    runner.on('executableOutput', () => {
        runner.closeProcess();
    });
    runner.on('terminalError', () => {
        runner.closeProcess();
    });
    runner.start();
};
exports.default = init;
//# sourceMappingURL=server.js.map