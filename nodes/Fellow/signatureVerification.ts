import * as crypto from 'crypto';

/**
 * Verify Svix webhook signature.
 * Svix uses HMAC-SHA256 with a base64-encoded secret prefixed with "whsec_".
 */
export function verifySvixSignature(
	secret: string,
	msgId: string,
	msgTimestamp: string,
	body: string,
	signatures: string,
): boolean {
	// Extract the base64 secret (remove "whsec_" prefix)
	const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
	const secretBytes = Buffer.from(secretBase64, 'base64');

	// Build the signed content: "{msg_id}.{timestamp}.{body}"
	const signedContent = `${msgId}.${msgTimestamp}.${body}`;

	// Compute expected signature
	const expectedSignature = crypto
		.createHmac('sha256', secretBytes)
		.update(signedContent)
		.digest('base64');

	// Parse signatures from header (format: "v1,sig1 v1,sig2")
	const providedSignatures = signatures.split(' ').map((s) => {
		const parts = s.split(',');
		return parts.length === 2 ? parts[1] : '';
	});

	// Check if the first provided signature matches the expected signature
	const expectedBuffer = Buffer.from(expectedSignature);
	const providedBuffer = Buffer.from(providedSignatures[0]);

	// timingSafeEqual requires buffers of the same length
	if (expectedBuffer.length !== providedBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
