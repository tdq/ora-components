// Transpiles ESM build scripts (scripts/*.mjs) to CommonJS so Jest can import
// their exported functions without --experimental-vm-modules.
const crypto = require('crypto');
const ts = require('typescript');

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  sourceMap: true,
  inlineSourceMap: true,
};

module.exports = {
  process(src, filename) {
    const { outputText } = ts.transpileModule(src, {
      // TypeScript always emits ESM for *.mjs; present it as *.js so CommonJS output is honoured.
      fileName: filename.replace(/\.mjs$/, '.js'),
      compilerOptions: COMPILER_OPTIONS,
    });
    return { code: outputText };
  },

  getCacheKey(src, filename) {
    return crypto
      .createHash('sha1')
      .update(src)
      .update(filename)
      .update(JSON.stringify(COMPILER_OPTIONS))
      .update(ts.version)
      .digest('hex');
  },
};
