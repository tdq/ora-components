module.exports = {
    process(sourceText, sourcePath, options) {
        return {
            code: `module.exports = ${JSON.stringify(sourceText)};`,
        };
    },
};
// If Jest is running in ESM mode, we might need a different approach,
// but let's try module.exports first as it's more widely supported for transformers.
