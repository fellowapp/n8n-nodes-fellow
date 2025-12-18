import globals from 'globals';
import tseslint from '@typescript-eslint/parser';
import n8nPlugin from 'eslint-plugin-n8n-nodes-base';
// Note: You might need to install @typescript-eslint/eslint-plugin if not already a dependency
// import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
	// Global ignores
	{
		ignores: [
			'**/node_modules/**',
			'**/dist/**',
			// Consider if you still need to ignore .eslintrc.js equivalents
			// "eslint.config.js",
			// "eslint.config.prepublish.js",
			'**/*.js', // Ignoring JS files as per original config
			'**/apiConfig.ts', // Generated at build time
			'**/apiConfig.d.ts', // Type declarations for generated file
		],
	},

	// Base configuration for TS files (applies to nodes and credentials)
	{
		files: ['nodes/**/*.ts', 'credentials/**/*.ts'],
		languageOptions: {
			parser: tseslint,
			parserOptions: {
				project: ['./tsconfig.json'],
				sourceType: 'module',
				ecmaVersion: 'latest', // Or specific version like 2022
			},
			globals: {
				...globals.node, // Add node globals
				...globals.es2021, // Or latest supported ES version globals
			},
		},
		// If you were implicitly using rules from @typescript-eslint/eslint-plugin via extends,
		// you might need to explicitly add the plugin and configure rules:
		// plugins: {
		//   '@typescript-eslint': tsPlugin,
		// },
		// rules: {
		//   // Add relevant @typescript-eslint rules here if needed
		// }
	},

	// Specific config for package.json
	{
		files: ['package.json'],
		plugins: {
			'n8n-nodes-base': n8nPlugin,
		},
		// Assumes the 'community' config is available via the plugin object
		// If not, you'll need to replicate its rules manually or use FlatCompat
		// rules: { ...n8nPlugin.configs.community.rules }, // Example if available
		// It seems the plugin exports configs directly based on your old setup.
		// Need to verify how the plugin exposes its configs for flat config.
		// This might require FlatCompat or manual rule setting.
		// Applying the specific rule override from the old config:
		rules: {
			// This rule will be overridden to 'error' in prepublish if that script is added back
			'n8n-nodes-base/community-package-json-name-still-default': 'off',
		},
		languageOptions: {
			// JSON files might need specific parser options if linting content
			// parserOptions: { ... }
			// Or often, rules applied to package.json don't need parsing
		},
	},

	// Specific config for credentials
	{
		files: ['credentials/**/*.ts'],
		plugins: {
			'n8n-nodes-base': n8nPlugin,
		},
		// Similarly, assumes 'credentials' config is available or needs FlatCompat/manual rules
		// rules: { ...n8nPlugin.configs.credentials.rules }, // Example
		rules: {
			'n8n-nodes-base/cred-class-field-documentation-url-missing': 'off',
			'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
		},
	},

	// Specific config for nodes
	{
		files: ['nodes/**/*.ts'],
		plugins: {
			'n8n-nodes-base': n8nPlugin,
		},
		// Similarly, assumes 'nodes' config is available or needs FlatCompat/manual rules
		// rules: { ...n8nPlugin.configs.nodes.rules }, // Example
		rules: {
			'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
			'n8n-nodes-base/node-resource-description-filename-against-convention': 'off',
			'n8n-nodes-base/node-param-fixed-collection-type-unsorted-items': 'off',
		},
	},
];
