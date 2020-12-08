const Parser = require("tree-sitter")
const JavaScript = require("tree-sitter-javascript")

const parser = new Parser()
parser.setLanguage(JavaScript)

const sourceCode = "let x = 1; console.log(x);"
const tree = parser.parse(sourceCode)

console.log(tree.rootNode.toString())
