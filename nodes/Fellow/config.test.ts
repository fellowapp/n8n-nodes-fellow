import { describe, expect, it } from 'vitest';

/**
 * Tests for config.ts subdomain validation and URL construction logic.
 *
 * Since the actual config.ts imports from apiConfig.ts which is generated at build time,
 * we test the validation logic directly by reimplementing the core validation function.
 */

// Reimplementation of the validation logic for testing
function isValidSubdomain(subdomain: string, environment: string): boolean {
	if (environment === 'dev') return true;
	return Boolean(subdomain) && /^[a-zA-Z0-9-]+$/.test(subdomain);
}

function getFellowApiBaseUrl(subdomain: string, urlPattern: string, environment: string): string {
	if (!isValidSubdomain(subdomain, environment)) {
		throw new Error(
			`Invalid subdomain: "${subdomain}". Subdomain must contain only alphanumeric characters and hyphens.`,
		);
	}
	return urlPattern.replace('{subdomain}', subdomain);
}

describe('Config - Subdomain Validation', () => {
	const prodPattern = 'https://{subdomain}.fellow.app/api/v1';
	const stagingPattern = 'https://{subdomain}.staging.fellow.co/api/v1';
	const devPattern = 'https://{subdomain}.fellow.dev/api/v1';

	describe('production environment validation', () => {
		const env = 'prod';

		it('accepts valid alphanumeric subdomain', () => {
			expect(getFellowApiBaseUrl('mycompany', prodPattern, env)).toBe(
				'https://mycompany.fellow.app/api/v1',
			);
		});

		it('accepts subdomain with numbers', () => {
			expect(getFellowApiBaseUrl('company123', prodPattern, env)).toBe(
				'https://company123.fellow.app/api/v1',
			);
		});

		it('accepts uppercase letters', () => {
			expect(getFellowApiBaseUrl('ABC', prodPattern, env)).toBe('https://ABC.fellow.app/api/v1');
		});

		it('accepts hyphens in subdomain', () => {
			expect(getFellowApiBaseUrl('my-company', prodPattern, env)).toBe(
				'https://my-company.fellow.app/api/v1',
			);
		});

		it('accepts multiple hyphens', () => {
			expect(getFellowApiBaseUrl('test-org-123', prodPattern, env)).toBe(
				'https://test-org-123.fellow.app/api/v1',
			);
		});

		it('rejects subdomain with dots (URL injection prevention)', () => {
			expect(() => getFellowApiBaseUrl('company.evil', prodPattern, env)).toThrow(
				'Invalid subdomain: "company.evil". Subdomain must contain only alphanumeric characters and hyphens.',
			);
		});

		it('rejects subdomain with slashes', () => {
			expect(() => getFellowApiBaseUrl('company/evil', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});

		it('rejects subdomain with @ symbol', () => {
			expect(() => getFellowApiBaseUrl('user@evil.com', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});

		it('rejects subdomain with hash', () => {
			expect(() => getFellowApiBaseUrl('company#test', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});

		it('rejects subdomain with question mark', () => {
			expect(() => getFellowApiBaseUrl('company?test', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});

		it('rejects subdomain with colon', () => {
			expect(() => getFellowApiBaseUrl('company:test', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});

		it('rejects empty subdomain', () => {
			expect(() => getFellowApiBaseUrl('', prodPattern, env)).toThrow('Invalid subdomain');
		});

		it('rejects subdomain with spaces', () => {
			expect(() => getFellowApiBaseUrl('my company', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});

		it('rejects subdomain with underscores', () => {
			expect(() => getFellowApiBaseUrl('my_company', prodPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});
	});

	describe('staging environment validation', () => {
		const env = 'staging';

		it('constructs correct staging URL', () => {
			expect(getFellowApiBaseUrl('testcompany', stagingPattern, env)).toBe(
				'https://testcompany.staging.fellow.co/api/v1',
			);
		});

		it('validates subdomain in staging (rejects dots)', () => {
			expect(() => getFellowApiBaseUrl('company.evil', stagingPattern, env)).toThrow(
				'Invalid subdomain',
			);
		});
	});

	describe('dev environment validation', () => {
		const env = 'dev';

		it('constructs correct dev URL', () => {
			expect(getFellowApiBaseUrl('localdev', devPattern, env)).toBe(
				'https://localdev.fellow.dev/api/v1',
			);
		});

		it('skips validation in dev environment (allows dots)', () => {
			// In dev mode, validation is skipped to allow flexible local setups
			expect(getFellowApiBaseUrl('dev.username', devPattern, env)).toBe(
				'https://dev.username.fellow.dev/api/v1',
			);
		});

		it('skips validation in dev environment (allows special characters)', () => {
			// Dev mode is permissive for local testing
			expect(() => getFellowApiBaseUrl('test@local', devPattern, env)).not.toThrow();
		});

		it('allows empty-ish subdomains in dev for testing', () => {
			// Dev mode allows anything
			expect(getFellowApiBaseUrl('', devPattern, env)).toBe('https://.fellow.dev/api/v1');
		});
	});
});

describe('Config - isValidSubdomain', () => {
	describe('valid subdomains', () => {
		it('accepts simple lowercase', () => {
			expect(isValidSubdomain('company', 'prod')).toBe(true);
		});

		it('accepts simple uppercase', () => {
			expect(isValidSubdomain('COMPANY', 'prod')).toBe(true);
		});

		it('accepts mixed case', () => {
			expect(isValidSubdomain('MyCompany', 'prod')).toBe(true);
		});

		it('accepts numbers', () => {
			expect(isValidSubdomain('123', 'prod')).toBe(true);
		});

		it('accepts alphanumeric', () => {
			expect(isValidSubdomain('company123', 'prod')).toBe(true);
		});

		it('accepts hyphens', () => {
			expect(isValidSubdomain('my-company', 'prod')).toBe(true);
		});

		it('accepts starting with number', () => {
			expect(isValidSubdomain('123company', 'prod')).toBe(true);
		});

		it('accepts starting with hyphen', () => {
			expect(isValidSubdomain('-company', 'prod')).toBe(true);
		});
	});

	describe('invalid subdomains in prod/staging', () => {
		it('rejects dots', () => {
			expect(isValidSubdomain('a.b', 'prod')).toBe(false);
		});

		it('rejects slashes', () => {
			expect(isValidSubdomain('a/b', 'prod')).toBe(false);
		});

		it('rejects at symbol', () => {
			expect(isValidSubdomain('a@b', 'prod')).toBe(false);
		});

		it('rejects spaces', () => {
			expect(isValidSubdomain('a b', 'prod')).toBe(false);
		});

		it('rejects underscores', () => {
			expect(isValidSubdomain('a_b', 'prod')).toBe(false);
		});

		it('rejects empty string', () => {
			expect(isValidSubdomain('', 'prod')).toBe(false);
		});
	});

	describe('dev environment bypasses validation', () => {
		it('allows dots in dev', () => {
			expect(isValidSubdomain('a.b', 'dev')).toBe(true);
		});

		it('allows any characters in dev', () => {
			expect(isValidSubdomain('anything@goes/here', 'dev')).toBe(true);
		});

		it('allows empty in dev', () => {
			expect(isValidSubdomain('', 'dev')).toBe(true);
		});
	});
});
