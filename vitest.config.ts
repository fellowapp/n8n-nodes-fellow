import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		include: ['**/*.test.ts'],
		exclude: ['node_modules/**', 'dist/**', '.flox/**'],
		globals: true,
		// Use 'threads' pool with single thread to avoid tinypool cleanup issues
		pool: 'threads',
		poolOptions: {
			threads: {
				singleThread: true,
			},
		},
		coverage: {
			exclude: ['dist/**', 'scripts/**', '*.config.*', '.flox/**'],
		},
	},
});
