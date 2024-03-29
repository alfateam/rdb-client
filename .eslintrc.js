module.exports = {
	"env": {
		"node": true,
		"browser": true,
		"es6": true
	},
	"extends": [
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:jest/recommended"
	],
	"parserOptions": {
		"sourceType": "module",
		"ecmaVersion": 2018
	},
	"ignorePatterns": ["*esm.js", "*.ts"],
	"rules": {
		"@typescript-eslint/no-var-requires": 0,
		"indent": ["error", "tab"],
		"semi": ["error", "always"],
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
	"plugins": ["jest", "@typescript-eslint"]
};