module.exports = {
    "env": {
        "node": true,
        "es6": true,
        "jest/globals": true
    },
    "extends": [
        "eslint:recommended"
    ],
    "parserOptions": {
        "sourceType": "module",
        "ecmaVersion": 2018
    },
    "ignorePatterns": ["*esm.js"],
    "rules": {
        "indent": ["error", "tab"],
        "linebreak-style": ["error", "unix"],
        "quotes": ["error", "single"],
        "semi": ["error", "always"],
        "space-before-function-paren": ["error", "never"],
        "no-console": "off",
        "no-debugger": "off",
        "no-trailing-spaces": "error",
        "no-underscore-dangle": 0,
        "no-unused-vars": [2, { "args": "after-used", "ignoreRestSiblings": true }],
        "space-before-function-paren": ["error", {
            "anonymous": "never",
            "named": "never",
            "asyncArrow": "always"
        }],
        "jest/no-disabled-tests": "warn",
        "jest/no-focused-tests": "error",
        "jest/no-identical-title": "error",
        "jest/prefer-to-have-length": "warn",
        "jest/valid-expect": "error"
    },
    "plugins": ["jest"]
}