const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rootDir = path.resolve(__dirname, '../apps/api-core/src/modules');

function mapType(typeText) {
  const t = typeText.trim();
  if (t === 'string' || t === 'String') return 'String';
  if (t === 'number' || t === 'Number') return 'Number';
  if (t === 'boolean' || t === 'Boolean') return 'Boolean';
  if (t === 'Date') return 'Date';
  if (t === 'Types.ObjectId' || t === 'mongoose.Types.ObjectId' || t === 'Schema.Types.ObjectId') return 'Types.ObjectId';
  if (t === 'Record<string, unknown>' || t === 'Record<string, any>' || t === 'object' || t === 'Object' || t === 'any') return 'Object';
  if (t === 'string[]' || t === 'Array<string>') return '[String]';
  if (t === 'number[]' || t === 'Array<number>') return '[Number]';
  if (t === 'boolean[]' || t === 'Array<boolean>') return '[Boolean]';
  if (t === 'Date[]' || t === 'Array<Date>') return '[Date]';
  if (t === 'Types.ObjectId[]' || t === 'Array<Types.ObjectId>' || t === 'mongoose.Types.ObjectId[]' || t === 'Schema.Types.ObjectId[]') return '[Types.ObjectId]';
  // string literal union enum
  if (/^(\s*['"][^'"]*['"]\s*\|\s*)+\s*['"][^'"]*['"]\s*$/.test(t)) return 'String';
  return null;
}

function createPropTypeExpression(typeStr) {
  if (typeStr.startsWith('[') && typeStr.endsWith(']')) {
    const inner = typeStr.slice(1, -1);
    return ts.factory.createArrayLiteralExpression([createPropTypeExpression(inner)]);
  }
  if (typeStr === 'Types.ObjectId') {
    return ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('Types'), ts.factory.createIdentifier('ObjectId'));
  }
  return ts.factory.createIdentifier(typeStr);
}

function hasTypeProperty(objectLiteral) {
  return objectLiteral.properties.some(p => {
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'type') return true;
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === 'type') return true;
    return false;
  });
}

function processFile(filePath) {
  const sourceText = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true);
  const changes = [];

  function visit(node) {
    if (ts.isPropertyDeclaration(node) && node.type) {
      const decorators = ts.canHaveDecorators(node) ? ts.getDecorators(node) : undefined;
      if (decorators) {
        for (const decorator of decorators) {
          if (!ts.isCallExpression(decorator.expression)) continue;
          const call = decorator.expression;
          if (!ts.isIdentifier(call.expression) || call.expression.text !== 'Prop') continue;

          const typeText = node.type.getText(sourceFile);
          const propType = mapType(typeText);
          if (!propType) continue;

          if (call.arguments.length === 0) {
            // @Prop() -> @Prop({ type: Type })
            const start = call.expression.getEnd();
            const end = call.getEnd();
            changes.push({ start, end, text: `({ type: ${propType} })` });
          } else if (call.arguments.length === 1 && ts.isObjectLiteralExpression(call.arguments[0])) {
            const obj = call.arguments[0];
            if (hasTypeProperty(obj)) continue;
            const newProps = [
              ts.factory.createPropertyAssignment('type', createPropTypeExpression(propType)),
              ...obj.properties
            ];
            const newObj = ts.factory.createObjectLiteralExpression(newProps, true);
            const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
            const newObjText = printer.printNode(ts.EmitHint.Unspecified, newObj, sourceFile);
            changes.push({ start: obj.getStart(), end: obj.getEnd(), text: newObjText });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (changes.length === 0) return;
  changes.sort((a, b) => b.start - a.start);
  let newText = sourceText;
  for (const { start, end, text } of changes) {
    newText = newText.substring(0, start) + text + newText.substring(end);
  }
  fs.writeFileSync(filePath, newText, 'utf8');
  console.log(`Updated ${filePath} (${changes.length} changes)`);
}

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.schema.ts')) {
      processFile(fullPath);
    }
  }
}

walkDir(rootDir);
console.log('Done');
