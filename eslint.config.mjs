import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintPluginUnusedImports from 'eslint-plugin-unused-imports'; // add this line
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
	{
		plugins: {
			prettier: eslintPluginPrettier,
			'unused-imports': eslintPluginUnusedImports,
		},
		rules: {
			'prettier/prettier': [
				'error',
				{
					endOfLine: 'auto',
					semi: true,
					singleQuote: true,
					trailingComma: 'es5',
					printWidth: 100,
					tabWidth: 4,
					useTabs: true,
				},
			],
		},
	},

	{
		files: ['**/*.ts', '**/*.vue', '**/*.js'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unused-vars': 'off',

			'vue/multi-word-component-names': 'off',
			'vue/html-self-closing': 'off',

			'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'error',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],

			'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
			'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
		},
	},
	{
		files: ['**/types/**/*.ts'],
		rules: {
			'no-unused-vars': 'off',
		},
	}
);
