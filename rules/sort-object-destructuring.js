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
      description: 'Sort Object Destructuring properties by length.',
      recommended: 'warn',
    },
    messages: {
      incorrectOrder: 'Object Destructuring properties should be sorted by length.',
    },
    type: 'layout',
    schema: [],
    fixable: 'code',
  },
  create(context) {
    return {
      ObjectPattern: (node) => {
        const getText = (elem) => context.getSourceCode().getText(elem);
        if (!isMultiline(getText(node))) return;

        const items = node.properties.filter(({ type }) => type === 'Property');

        if (items.length < 2) return;

        const itemsText = items.map((node) => getText(node));

        const failedIndex = itemsText.findIndex(
          (text, index, arr) =>
            index && sortAttributesFn(text, arr[index - 1]) < 0
        );

        if (failedIndex > -1) {
          const sortedText = itemsText.sort(sortAttributesFn);

          context.report({
            loc: {
              start: items[failedIndex - 1].loc.start,
              end: items.at(-1).loc.end,
            },
            messageId: 'incorrectOrder',
            fix(fixer) {
              return items.map((node, index) =>
                fixer.replaceText(node, sortedText[index])
              );
            },
          });
        }
      },
    };
  },
};
