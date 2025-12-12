import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file in the package root
// After compilation, __dirname is dist/nodes/Fellow, so go up 3 levels to reach package root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Fellow API Configuration
 *
 * Environment Variables:
 * - FELLOW_API_URL: Override the API base URL (e.g., for staging/dev environments)
 * - FELLOW_SKIP_SSL_VALIDATION: Set to 'true' to skip SSL cert validation (dev only)
 */

/**
 * Constructs the Fellow API base URL from the subdomain.
 * Can be overridden via FELLOW_API_URL environment variable.
 */
export function getFellowApiBaseUrl(subdomain: string): string {
	if (process.env.FELLOW_API_URL) {
		return process.env.FELLOW_API_URL;
	}
	return `https://${subdomain}.fellow.app/api/v1`;
}

/**
 * Check if SSL certificate validation should be skipped.
 * Set FELLOW_SKIP_SSL_VALIDATION=true for development with self-signed certs.
 */
export function shouldSkipSslValidation(): boolean {
	return process.env.FELLOW_SKIP_SSL_VALIDATION === 'true';
}
