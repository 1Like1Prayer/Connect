const fileSystem = require('node:fs')
const path = require('node:path')
const typescript = require('typescript')
const root = path.resolve(__dirname, '..')
const files = []
function walk(directory) {
  for (const entry of fileSystem.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'copies') walk(file)
    } else if (/\.(?:ts|tsx)$/.test(file) && !file.endsWith('.d.ts')) files.push(file)
  }
}
walk(path.join(root, 'src'))
const textAttributes = new Set(['title', 'label', 'hint', 'help', 'blurb', 'description', 'placeholder', 'alt', 'aria-label', 'aria-description', 'aria-valuetext', 'aria-roledescription', 'aria-keyshortcuts', 'message', 'error', 'actionLabel'])
const dataProperties = new Set(['displayName', 'username', 'email', 'phoneNumber', 'birthDate', 'biography', 'location', 'publicAreaLabel', 'venueName', 'title', 'description', 'whatToBring', 'meetingNotes', 'authorName', 'hostName'])
const technicalProperties = new Set(['className', 'type', 'role', 'variant', 'style', 'color', 'background', 'border', 'borderColor', 'borderLeftColor', 'backgroundColor', 'width', 'height', 'display', 'position', 'gridTemplateColumns', 'timeZoneName', 'year', 'month', 'weekday', 'day', 'hour', 'minute', 'hourCycle', 'calendar', 'numberingSystem', 'fontFamily', 'fontSize', 'fontWeight', 'language', 'cache', 'method', 'Accept', 'Content-Type', 'mode', 'visibility', 'status', 'creationMode', 'costType', 'joinPolicy', 'locationVisibility', 'locationType', 'authorId', 'connectId', 'hostId', 'id', 'key', 'name', 'path', 'code'])
const technicalFunctions = new Set(['fieldError', 'text', 'issue', 'part', 'resetOccurrence', 'register', 'setValue', 'getValues', 'resetField', 'setFocus', 'setError', 'clearErrors', 'trigger', 'getElementById', 'querySelector', 'querySelectorAll', 'createElement', 'addEventListener', 'removeEventListener', 'getItem', 'setItem', 'removeItem', 'get', 'set', 'delete', 'has', 'navigate', 'getPropertyValue', 'toLocaleDateString', 'toLocaleTimeString', 'DateTimeFormat', 'RelativeTimeFormat'])
const humanWords = new Set(['Free', 'Any', 'Today', 'Tomorrow', 'Host', 'Going', 'Welcome', 'Connect', 'Profile', 'Other', 'Sports', 'Gaming', 'Social', 'Woman', 'Man', 'UTC'])
const failures = []
function nameOf(node) {
  return typescript.isIdentifier(node) || typescript.isStringLiteral(node) ? node.text : ''
}
function visibleValueAttribute(node) {
  let attribute = node
  while (attribute && !typescript.isJsxAttribute(attribute) && !typescript.isStatement(attribute)) attribute = attribute.parent
  if (!attribute || !typescript.isJsxAttribute(attribute) || !['value', 'defaultValue'].includes(attribute.name.getText())) return false
  const attributes = attribute.parent.properties
  if (!['Input', 'input', 'textarea'].includes(attribute.parent.parent.tagName?.getText())) return false
  const type = attributes.find(prop => typescript.isJsxAttribute(prop) && prop.name.getText() === 'type')?.initializer?.text
  return !['radio', 'checkbox', 'hidden'].includes(type) && (attribute.name.getText() === 'defaultValue' || attributes.some(prop => typescript.isJsxAttribute(prop) && prop.name.getText() === 'readOnly'))
}
function isTechnical(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (typescript.isTypeNode(current) || typescript.isImportDeclaration(current) || typescript.isExportDeclaration(current)) return true
    if (typescript.isExpression(current) || typescript.isStatement(current) || typescript.isJsxElement(current)) break
  }
  const parent = node.parent
  if ((typescript.isPropertyAssignment(parent) || typescript.isPropertySignature(parent) || typescript.isMethodDeclaration(parent)) && parent.name === node) return true
  if (typescript.isElementAccessExpression(parent) && parent.argumentExpression === node) return true
  for (let current = parent; current; current = current.parent) {
    if (typescript.isVariableDeclaration(current) && /(?:^|_)FIELDS$/.test(nameOf(current.name))) return true
    if (typescript.isJsxAttribute(current)) return !textAttributes.has(current.name.getText()) && !visibleValueAttribute(current)
    if (typescript.isPropertyAssignment(current)) {
      const key = nameOf(current.name)
      if (dataProperties.has(key)) return false
      if (key === 'name' && typescript.isStringLiteral(node) && /[A-Z]|\s/.test(node.text)) return false
      return technicalProperties.has(key)
    }
    if (typescript.isCallExpression(current)) {
      if (current.expression.kind === typescript.SyntaxKind.ImportKeyword) return true
      const method = typescript.isPropertyAccessExpression(current.expression) ? current.expression.name.text : typescript.isIdentifier(current.expression) ? current.expression.text : ''
      const first = current.arguments[0]
      if (first && technicalFunctions.has(method) && node.pos >= first.pos && node.end <= first.end) return true
      if (method === 'setAttribute' && first) return node === first || !textAttributes.has(first.text)
      break
    }
    if (typescript.isStatement(current) || typescript.isFunctionLike(current)) break
  }
  return false
}
function looksLikeCopy(text, node) {
  if (!text || isTechnical(node)) return false
  if (typescript.isJsxExpression(node.parent) && (typescript.isJsxElement(node.parent.parent) || typescript.isJsxFragment(node.parent.parent))) return true
  for (let current = node.parent; current && !typescript.isStatement(current); current = current.parent) if (typescript.isJsxAttribute(current) && textAttributes.has(current.name.getText())) return true
  if (visibleValueAttribute(node)) return true
  if (typescript.isJsxAttribute(node.parent)) return textAttributes.has(node.parent.name.getText())
  if (typescript.isPropertyAssignment(node.parent) && dataProperties.has(nameOf(node.parent.name))) return true
  if (/^(?:ArrowLeft|ArrowRight|ArrowUp|ArrowDown|Enter|Escape|Home|End|Tab|Space|Backspace|Delete|Key[A-Z])$/.test(text)) return false
  if (/^(?:https?:|mailto:|data:|blob:|\/|\.\/|\.\.\/)/.test(text)) return false
  if (/^#[\da-fA-F]{3,8}$/.test(text) || /^(?:rgb|hsl|var|repeat|translate|rotate)\(/.test(text)) return false
  if (/^(?:[a-z]+(?:-[a-z]+)*:)?[a-z0-9_-]+(?:\.[a-z0-9_-]+)+$/.test(text) && !text.includes('@')) return false
  if (/^(?:en|he|fr|de|es|ar|pt|zh|ja)(?:-[A-Z]{2})?$/.test(text) || /^(?:application|image|text|font)\//.test(text)) return false
  if (/^[A-Z][A-Z0-9_:-]*$/.test(text) && /[_:]/.test(text) && !humanWords.has(text)) return false
  return humanWords.has(text) || /^[A-Z]{2,8}$/.test(text) || /\b[A-Z][a-z]/.test(text) || /[a-zA-Z][\s,.;!?@]|\s[a-zA-Z]/.test(text) || /[^\x00-\x7f]/.test(text)
}
for (const file of files) {
  const source = typescript.createSourceFile(file, fileSystem.readFileSync(file, 'utf8'), typescript.ScriptTarget.Latest, true)
  function visit(node) {
    const text = typescript.isJsxText(node) ? node.text.trim()
      : typescript.isStringLiteral(node) || typescript.isNoSubstitutionTemplateLiteral(node) ? node.text
      : typescript.isTemplateExpression(node) ? [node.head.text, ...node.templateSpans.map(span => span.literal.text)].join('{value}')
      : null
    if (text && (typescript.isJsxText(node) || looksLikeCopy(text, node))) {
      const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
      failures.push(`${path.relative(root, file)}:${line}: ${JSON.stringify(text.slice(0, 130))}`)
    }
    typescript.forEachChild(node, visit)
  }
  visit(source)
}
const html = fileSystem.readFileSync(path.join(root, 'index.html'), 'utf8')
if (/<title>[^<]+<\/title>|<meta\s+name="description"\s+content="[^"]+"/i.test(html)) failures.push('index.html: document copy must come from src/copies/app/metadata.ts')
if (failures.length) {
  console.error('Move user-facing copy to src/copies:\n' + failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Copy coverage passed for ${files.length} application modules.`)
}
