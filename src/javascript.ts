import * as Parser from 'web-tree-sitter';

async function initParser(): Promise<Parser> {
    await Parser.init();
    const parser = new Parser();

    const js = await Parser.Language.load('./wasm/tree-sitter-javascript.wasm');
    parser.setLanguage(js);
    return parser;
}

export async function parseJS(source: string) {
    const parser = await initParser();
    const tree = parser.parse(source);
    console.log(tree.rootNode.toString());
}