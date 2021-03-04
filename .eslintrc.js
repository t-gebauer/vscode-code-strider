// No, eslint does not understand ES6.
module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 6,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint"],
    rules: {
        // This is the default naming-convention config ...
        // (https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md)
        "@typescript-eslint/naming-convention": [
            "warn",
            {
                selector: "default",
                format: ["camelCase"],
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: "variable",
                format: ["camelCase", "UPPER_CASE"],
                leadingUnderscore: "allow",
                trailingUnderscore: "allow",
            },
            {
                selector: "typeLike",
                format: ["PascalCase"],
            },
            // ... with a PascalCase exception for enum members.
            {
                selector: "enumMember",
                format: ["camelCase", "PascalCase"],
            },
        ],
        "@typescript-eslint/semi": "off",
        curly: "off",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "off",
    },
}
