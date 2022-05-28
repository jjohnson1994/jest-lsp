const util = require('util');

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  Connection,
} from 'vscode-languageserver/node';

import { URI } from "vscode-uri";

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { JestTotalResults, Runner } from 'jest-editor-support';

const init = () => {
  const connection = createConnection(ProposedFeatures.all);
  const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

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
    runner.closeProcess();
  });

  runner.on('terminalError', () => {
    runner.closeProcess();
  });

  runner.start();
};

export default init;
