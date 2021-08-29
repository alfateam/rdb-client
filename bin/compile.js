let ts = require("typescript");
let path = require('path');

function compile(fileNames, options) {
    var program = ts.createProgram(fileNames, options);
    var emitResult = program.emit();
    var allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    allDiagnostics.forEach(function (diagnostic) {
        if (diagnostic.file) {
            var _a = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start), line = _a.line, character = _a.character;
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message);
        }
        else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });
    return emitResult.emitSkipped ? 1 : 0;
}

const defaultOptions = {
    noEmitOnError: false,
    noImplicitAny: true,
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true, 
    outDir: 'build'
}
module.exports = function (file, options = {}) {
    options = { ...defaultOptions, ...options};
    if (compile([file], options) === 0)
        return path.join(options.outDir, '/index.js');
};
