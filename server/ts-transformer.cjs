const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    if (sourcePath.endsWith('.ts') || sourcePath.endsWith('.tsx')) {
      const result = ts.transpileModule(sourceText, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
        fileName: sourcePath,
      });
      return { code: result.outputText };
    }
    return { code: sourceText };
  },
};
