import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['**/*.test.ts'],
		exclude: ['node_modules/**', 'dist/**', '.flox/**'],
		globals: true,
		coverage: {
			exclude: ['dist/**', 'scripts/**', '*.config.*', '.flox/**'],
		},
	},
});
