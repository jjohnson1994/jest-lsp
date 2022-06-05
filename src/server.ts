const util = require('util');

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  Connection,
  InitializeParams,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';

import { URI } from "vscode-uri";

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { JestTotalResults, Runner } from 'jest-editor-support';

const init = () => {
  const connection = createConnection(ProposedFeatures.all);
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

  connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    const hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );

    const hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const hasDiagnosticRelatedInformationCapability = !!(
      capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    return {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
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

const validateTextDocument = async (textDocument: TextDocument, connection: Connection): Promise<void> => {
  const path = URI.parse(textDocument.uri).path;
  const isSpecFile = /\.spec\.|\.test\.g/.test(textDocument.uri);

  console.log('validating');

  // @ts-ignore runner does not need args
  const runner = new Runner({
    jestCommandLine: `jest ${path}`
  });

  const diagnostics: Diagnostic[] = [];

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });

  if (!isSpecFile) {
    // TODO related tests should be run here instead
    // jestCommandLine: `jest ${isSpecFile ? '' : '--findRelatedTests' } ${path}`
    return;
  }

  runner.on('executableJSON', (jestTotalResults: JestTotalResults) => {
    console.log('got total results', util.inspect(jestTotalResults, false, null));

    jestTotalResults.testResults.forEach(testResult => {
      testResult.assertionResults.forEach(assertionResult => {
        if (assertionResult.failureMessages.length === 0) {
          return;
        }

        // @ts-ignore location does not exist on assertionResult?
        const { column, line } = assertionResult?.location || {};

        diagnostics.push({
          severity: DiagnosticSeverity.Error,
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
    console.log('executableOutput')
    runner.closeProcess();
  });

  runner.on('terminalError', () => {
    console.log('terminalError')
    runner.closeProcess();
  });

  runner.on('processClose', () => {
    console.log('processClose')
  })

  runner.on('processExit', () => {
    console.log('processExit')
  })

  runner.on('executableStdErr', (error) => {
    console.log('executableStdErr', error.toString())
  })

  runner.start();
};

export default init;
