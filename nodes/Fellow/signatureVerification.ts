import * as crypto from 'crypto';

// Maximum age of a webhook in seconds (5 minutes) to prevent replay attacks
const WEBHOOK_TOLERANCE_SECONDS = 300;

/**
 * Verify Svix webhook signature and timestamp.
 * Svix uses HMAC-SHA256 with a base64-encoded secret prefixed with "whsec_".
 * Rejects webhooks older than 5 minutes to prevent replay attacks.
 */
export function verifySvixSignature(
	secret: string,
	msgId: string,
	msgTimestamp: string,
	body: string,
	signatures: string,
): boolean {
	// Validate timestamp to prevent replay attacks
	const timestampSeconds = parseInt(msgTimestamp, 10);
	if (isNaN(timestampSeconds)) {
		return false;
	}

	const currentTimeSeconds = Math.floor(Date.now() / 1000);
	const timeDifference = currentTimeSeconds - timestampSeconds;

	// Reject if timestamp is too old (replay attack) or too far in the future
	if (timeDifference > WEBHOOK_TOLERANCE_SECONDS || timeDifference < -WEBHOOK_TOLERANCE_SECONDS) {
		return false;
	}

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

	// Decode base64 signatures to compare actual cryptographic bytes
	// Using 'base64' encoding is critical - without it, Buffer.from() defaults to UTF-8
	// which would compare the string representation instead of the decoded signature bytes
	const expectedBuffer = Buffer.from(expectedSignature, 'base64');
	const providedBuffer = Buffer.from(providedSignatures[0], 'base64');

	// timingSafeEqual requires buffers of the same length
	if (expectedBuffer.length !== providedBuffer.length) {
		return false;
	}

	return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
