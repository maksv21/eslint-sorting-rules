const fs = require('fs');
const path = require('path');
const { isMultiline } = require('./helpers');

const staticImports = ['react', 'react-native'];

const getImportBefore = (context, currentImportRangeStart) => {
  if (currentImportRangeStart === 0) return null;

  let lastRange = currentImportRangeStart;
  let prevImport = null;
  let continueLoop = true;

  while (continueLoop) {
    if (lastRange === 0) {
      continueLoop = false;
    } else {
      const prevNode = context.getNodeByRangeIndex(lastRange - 1);

      if (prevNode && prevNode.type === 'ImportDeclaration') {
        prevImport = prevNode;
        continueLoop = false;
      } else if (prevNode?.type === 'Program') {
        lastRange -= 1;
      } else if (prevNode) {
        lastRange = prevNode.range[0];
      } else {
        continueLoop = false;
      }
    }
  }

  return prevImport ?? null;
};

const exitTests = [
  function isDifferentGroups(currentImport, prevImport) {
    return currentImport.group !== prevImport.group;
  },

  function isPrevStatic(currentImport, prevImport) {
    return (
      staticImports.includes(prevImport.node.source.value) &&
      !staticImports.includes(currentImport.node.source.value)
    );
  },
];

const errorTests = [
  function areBothStatic(currentImport, prevImport) {
    const currentValue = currentImport.node.source.value;
    const prevValue = prevImport.node.source.value;

    return (
      staticImports.indexOf(currentValue) < staticImports.indexOf(prevValue)
    );
  },

  function isPrevNotStatic(currentImport, prevImport) {
    return (
      staticImports.includes(currentImport.node.source.value) &&
      !staticImports.includes(prevImport.node.source.value)
    );
  },

  function isPrevMultiline(currentImport, prevImport) {
    return !currentImport.multiline && prevImport.multiline;
  },

  function isPrevLonger(currentImport, prevImport) {
    if (currentImport.multiline && prevImport.multiline) {
      return (
        prevImport.node.specifiers.length > currentImport.node.specifiers.length
      );
    } else if (!currentImport.multiline && !prevImport.multiline) {
      return prevImport.text.length > currentImport.text.length;
    }

    return false;
  },
];

class ModuleImport {
  #baseDirectory = 'src';
  #extensions = ['.ts', '.tsx'];
  #categories = {
    module: 'module',
    absolute: 'absolute',
    relative: 'relative',
  };

  constructor(context, node) {
    this.node = node;
    this.group = this.#getImportGroup();
    this.text = context.getSourceCode().getText(node);
    this.multiline = isMultiline(this.text);
  }

  #getImportGroup() {
    const importPath = this.node.source.value;

    if (importPath[0] === '.') {
      return this.#categories.relative;
    }

    if (
      // empty line for checking directory
      ['', ...this.#extensions].some((ext) =>
        fs.existsSync(path.join(this.#baseDirectory, importPath + ext))
      )
    ) {
      return this.#categories.absolute;
    }

    return this.#categories.module;
  }
}

module.exports = {
  meta: {
    docs: {
      description: 'Sort imports by length.',
      recommended: 'warn',
    },
    messages: {
      incorrectOrder: 'The import should be before the previous one.',
    },
    type: 'layout',
    schema: [],
    fixable: 'code',
  },
  create(context) {
    return {
      ImportDeclaration: (node) => {
        const prevImportNode = getImportBefore(context, node.range[0]);

        if (!prevImportNode) return;

        const currentImport = new ModuleImport(context, node);
        const prevImport = new ModuleImport(context, prevImportNode);

        if (exitTests.some((test) => test(currentImport, prevImport))) return;

        if (errorTests.some((test) => test(currentImport, prevImport))) {
          context.report({
            node: node,
            messageId: 'incorrectOrder',
            *fix(fixer) {
              yield fixer.replaceText(currentImport.node, prevImport.text);
              yield fixer.replaceText(prevImport.node, currentImport.text);
            },
          });
        }
      },
    };
  },
};
