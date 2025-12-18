/**
 * Fellow API Configuration
 *
 * This configuration is generated at build time by scripts/generateConfig.js
 * Different builds (prod/staging) will have different API endpoints compiled in.
 */

import {
	FELLOW_API_BASE_URL_PATTERN,
	FELLOW_SKIP_SSL_VALIDATION,
	FELLOW_ENVIRONMENT,
} from './apiConfig';

/**
 * Validates that a subdomain contains only safe characters (alphanumeric and hyphens).
 * Prevents URL injection via characters like /, @, #, etc.
 * Validation is skipped for dev environment.
 */
function isValidSubdomain(subdomain: string): boolean {
	if (FELLOW_ENVIRONMENT === 'dev') return true;
	return Boolean(subdomain) && /^[a-zA-Z0-9-]+$/.test(subdomain);
}

/**
 * Constructs the Fellow API base URL from the subdomain.
 * Uses the build-time configured URL pattern from apiConfig.ts.
 */
export function getFellowApiBaseUrl(subdomain: string): string {
	if (!isValidSubdomain(subdomain)) {
		throw new Error(
			`Invalid subdomain: "${subdomain}". Subdomain must contain only alphanumeric characters and hyphens.`,
		);
	}
	return FELLOW_API_BASE_URL_PATTERN.replace('{subdomain}', subdomain);
}

/**
 * Check if SSL certificate validation should be skipped.
 * Configured at build time via scripts/generateConfig.js.
 */
export function shouldSkipSslValidation(): boolean {
	return FELLOW_SKIP_SSL_VALIDATION;
}
