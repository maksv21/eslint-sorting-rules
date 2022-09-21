const { isMultiline } = require('./helpers');

const sortAttributesFn = (currentText, prevText) => {
  const isPrevMultiline = isMultiline(prevText);
  const isCurrentMultiline = isMultiline(currentText);

  if (isPrevMultiline && isCurrentMultiline) {
    const prevLines = prevText.match(/\n/g).length;
    const currentLines = currentText.match(/\n/g).length;

    if (prevLines > currentLines) return -1;

    if (prevLines === currentLines) return currentText.length - prevText.length;
    return 0;
  }

  if (isPrevMultiline && !isCurrentMultiline) return -1;

  if (!isCurrentMultiline && !isPrevMultiline) {
    return prevText.length > currentText.length ? -1 : 0;
  }

  return 0;
};

module.exports = {
  meta: {
    docs: {
      description: 'Sort JSX attributes by length.',
      recommended: 'warn',
    },
    messages: {
      incorrectOrder: 'The attributes should be sorted by length.',
    },
    type: 'layout',
    schema: [],
    fixable: 'code',
  },
  create(context) {
    return {
      JSXOpeningElement: (node) => {
        const getText = (elem) => context.getSourceCode().getText(elem);

        if (!isMultiline(getText(node))) return;

        const attributes = node.attributes.filter(
          ({ type }) => type === 'JSXAttribute'
        );

        if (attributes.length < 2) return;

        const attributesText = attributes.map((node) => getText(node));

        const failedIndex = attributesText.findIndex(
          (text, index) =>
            index && sortAttributesFn(text, attributesText[index - 1]) < 0
        );

        if (
          attributesText.find(
            (text, index) =>
              index && sortAttributesFn(text, attributesText[index - 1]) < 0
          )
        ) {
          const sortedText = attributesText.sort(sortAttributesFn);

          context.report({
            loc: {
              start: attributes[0].loc.start,
              end: attributes.at(-1).loc.end,
            },
            messageId: 'incorrectOrder',
            fix(fixer) {
              return attributes.map((node, index) =>
                fixer.replaceText(node, sortedText[index])
              );
            },
          });
        }
      },
    };
  },
};
