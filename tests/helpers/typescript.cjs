const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..', '..');

function loadModule(relativePath, mocks = {}) {
    const filename = path.join(root, relativePath);
    const context = {
        exports: {},
        require: (name) => {
            if (Object.hasOwn(mocks, name)) return mocks[name];
            if (name.startsWith('@/')) return loadModule(name.slice(2) + '.ts', mocks);
            return require(name);
        },
        console,
        URL,
        Error,
        ...mocks.globals,
    };
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(code, context, { filename });
    return context.exports;
}

function declarations(relativePath, names) {
    const filename = path.join(root, relativePath);
    const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found = new Map();
    function visit(node) {
        if (ts.isVariableDeclaration(node) && names.includes(node.name.getText(source))) {
            found.set(node.name.getText(source), `const ${node.getText(source)};`);
        } else if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) {
            found.set(node.name.text, node.getText(source).replace(/^export /, ''));
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    for (const name of names) {
        if (!found.has(name)) throw new Error(`Missing declaration: ${name}`);
    }
    return names.map((name) => found.get(name)).join('\n');
}

function evaluate(code, globals) {
    const compiled = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
    const context = vm.createContext(globals);
    vm.runInContext(compiled, context);
    return context;
}

module.exports = { loadModule, declarations, evaluate };
