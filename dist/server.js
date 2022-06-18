"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const { dirname } = require("path");
const node_1 = require("vscode-languageserver/node");
const vscode_uri_1 = require("vscode-uri");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const jest_editor_support_1 = require("jest-editor-support");
const init = () => {
    const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
    const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
    connection.onInitialize((params) => {
        const capabilities = params.capabilities;
        // Does the client support the `workspace/configuration` request?
        // If not, we fall back using global settings.
        const hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
        const hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
        const hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument &&
            capabilities.textDocument.publishDiagnostics &&
            capabilities.textDocument.publishDiagnostics.relatedInformation);
        return {
            capabilities: {
                textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
                // Tell the client that this server supports code completion.
                completionProvider: {
                    resolveProvider: true
                }
            }
        };
    });
    connection.onDidChangeConfiguration(() => {
        console.log('configuration changed');
    });
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
    const cwd = dirname(path);
    const isSpecFile = /\.(spec|test)\.(j|t)s/g.test(textDocument.uri);
    const diagnostics = [];
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
    if (!isSpecFile) {
        // TODO related tests should be run here instead
        // jestCommandLine: `jest ${isSpecFile ? '' : '--findRelatedTests' } ${path}`
        return;
    }
    const jestRunnerConfig = {
        jestCommandLine: `${cwd}/node_modules/.bin/jest ${path}`,
        pathToJest: `${cwd}/node_modules/.bin/jest`
    };
    // @ts-ignore runner does not need args
    const runner = new jest_editor_support_1.Runner(jestRunnerConfig);
    runner.on('executableJSON', (jestTotalResults) => {
        console.log('got total results', (0, util_1.inspect)(jestTotalResults, false, null));
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
        console.log('executableOutput');
        runner.closeProcess();
    });
    runner.on('terminalError', () => {
        console.log('terminalError');
        runner.closeProcess();
    });
    runner.on('processClose', () => {
        console.log('processClose');
    });
    runner.on('processExit', () => {
        console.log('processExit');
    });
    runner.on('executableStdErr', (error) => {
        console.log('executableStdErr', error.toString());
    });
    runner.start();
};
exports.default = init;
//# sourceMappingURL=server.js.map