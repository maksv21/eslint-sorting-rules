module.exports = {
  meta: {
    docs: {
      description: 'Sort named imports by length.',
      recommended: 'warn',
    },
    messages: {
      incorrectOrder: 'The named imports should be sorted by length.',
    },
    type: 'layout',
    schema: [],
    fixable: 'code',
  },
  create(context) {
    return {
      ImportDeclaration: (node) => {
        const getText = (node) => context.getSourceCode().getText(node);

        if (!getText(node).includes('\n')) return;

        const namedImports = node.specifiers.filter(
          ({ type }) => type === 'ImportSpecifier'
        );

        if (namedImports.length < 2) return;

        const importsText = namedImports.map((node) => getText(node));

        if (
          importsText.some(
            (text, index, arr) => index && arr[index - 1].length > text.length
          )
        ) {
          const sortedImportsText = importsText.sort(
            (a, b) => a.length - b.length
          );

          context.report({
            loc: {
              start: namedImports[0].loc.start,
              end: namedImports.at(-1).loc.end,
            },
            messageId: 'incorrectOrder',
            fix(fixer) {
              return namedImports.map((node, index) =>
                fixer.replaceText(node, sortedImportsText[index])
              );
            },
          });
        }
      },
    };
  },
};
