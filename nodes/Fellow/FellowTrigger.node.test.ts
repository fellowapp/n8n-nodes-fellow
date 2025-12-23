import * as crypto from 'crypto';
import { describe, expect, it } from 'vitest';
import { verifySvixSignature } from './signatureVerification';

describe('FellowTrigger - Svix Signature Verification', () => {
	const generateValidSignature = (
		secret: string,
		msgId: string,
		timestamp: string,
		body: string,
	): string => {
		const secretBase64 = secret.startsWith('whsec_') ? secret.slice(6) : secret;
		const secretBytes = Buffer.from(secretBase64, 'base64');
		const signedContent = `${msgId}.${timestamp}.${body}`;
		const signature = crypto
			.createHmac('sha256', secretBytes)
			.update(signedContent)
			.digest('base64');
		return `v1,${signature}`;
	};

	describe('valid signatures', () => {
		it('accepts valid signature with whsec_ prefix', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'ai_note.generated', data: { note_id: '123' } });
			const signature = generateValidSignature(secret, msgId, timestamp, body);

			const result = verifySvixSignature(secret, msgId, timestamp, body, signature);

			expect(result).toBe(true);
		});

		it('accepts valid signature without whsec_ prefix', () => {
			const secret = Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'ai_note.generated', data: { note_id: '123' } });
			const signature = generateValidSignature(secret, msgId, timestamp, body);

			const result = verifySvixSignature(secret, msgId, timestamp, body, signature);

			expect(result).toBe(true);
		});

		it('accepts valid signature with complex body', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_complex_123';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({
				type: 'action_item.assigned',
				data: {
					action_item_id: 'abc-123',
					assignee: 'user@example.com',
					title: 'Test action with "quotes" and special chars: àéïôù',
					nested: {
						deep: {
							value: true,
						},
					},
				},
			});
			const signature = generateValidSignature(secret, msgId, timestamp, body);

			const result = verifySvixSignature(secret, msgId, timestamp, body, signature);

			expect(result).toBe(true);
		});

		it('accepts signature with multiple signatures in header (uses first)', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'test' });
			const validSignature = generateValidSignature(secret, msgId, timestamp, body);
			const multiSignature = `${validSignature} v1,fake_second_signature`;

			const result = verifySvixSignature(secret, msgId, timestamp, body, multiSignature);

			expect(result).toBe(true);
		});
	});

	describe('invalid signatures', () => {
		it('rejects signature with wrong secret', () => {
			const correctSecret = 'whsec_' + Buffer.from('correct-secret').toString('base64');
			const wrongSecret = 'whsec_' + Buffer.from('wrong-secret').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(wrongSecret, msgId, timestamp, body);

			const result = verifySvixSignature(correctSecret, msgId, timestamp, body, signature);

			expect(result).toBe(false);
		});

		it('rejects signature with tampered body', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const originalBody = JSON.stringify({ type: 'test', value: 'original' });
			const tamperedBody = JSON.stringify({ type: 'test', value: 'tampered' });
			const signature = generateValidSignature(secret, msgId, timestamp, originalBody);

			const result = verifySvixSignature(secret, msgId, timestamp, tamperedBody, signature);

			expect(result).toBe(false);
		});

		it('rejects signature with wrong message ID', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const correctMsgId = 'msg_12345';
			const wrongMsgId = 'msg_67890';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, correctMsgId, timestamp, body);

			const result = verifySvixSignature(secret, wrongMsgId, timestamp, body, signature);

			expect(result).toBe(false);
		});

		it('rejects signature with wrong timestamp', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const correctTimestamp = Math.floor(Date.now() / 1000).toString();
			const wrongTimestamp = (Math.floor(Date.now() / 1000) + 100).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, correctTimestamp, body);

			const result = verifySvixSignature(secret, msgId, wrongTimestamp, body, signature);

			expect(result).toBe(false);
		});

		it('rejects completely invalid signature format', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'test' });
			const invalidSignature = 'v1,not_a_valid_base64_signature!@#$';

			const result = verifySvixSignature(secret, msgId, timestamp, body, invalidSignature);

			expect(result).toBe(false);
		});

		it('rejects empty signature', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'test' });

			const result = verifySvixSignature(secret, msgId, timestamp, body, 'v1,');

			expect(result).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('handles empty body string', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = '';
			const signature = generateValidSignature(secret, msgId, timestamp, body);

			const result = verifySvixSignature(secret, msgId, timestamp, body, signature);

			expect(result).toBe(true);
		});

		it('handles body with unicode characters', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const timestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ emoji: '🎉', chinese: '你好', arabic: 'مرحبا' });
			const signature = generateValidSignature(secret, msgId, timestamp, body);

			const result = verifySvixSignature(secret, msgId, timestamp, body, signature);

			expect(result).toBe(true);
		});

		it('handles very long body payload', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const currentTimestamp = Math.floor(Date.now() / 1000).toString();
			const largeData = Array(1000)
				.fill(null)
				.map((_, i) => ({ id: i, value: `item_${i}` }));
			const body = JSON.stringify({ type: 'bulk_operation', data: largeData });
			const signature = generateValidSignature(secret, msgId, currentTimestamp, body);

			const result = verifySvixSignature(secret, msgId, currentTimestamp, body, signature);

			expect(result).toBe(true);
		});
	});

	describe('timestamp validation (replay attack prevention)', () => {
		it('accepts webhooks with current timestamp', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const currentTimestamp = Math.floor(Date.now() / 1000).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, currentTimestamp, body);

			const result = verifySvixSignature(secret, msgId, currentTimestamp, body, signature);

			expect(result).toBe(true);
		});

		it('accepts webhooks within 5 minute tolerance window', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const fourMinutesAgo = (Math.floor(Date.now() / 1000) - 240).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, fourMinutesAgo, body);

			const result = verifySvixSignature(secret, msgId, fourMinutesAgo, body, signature);

			expect(result).toBe(true);
		});

		it('rejects webhooks older than 5 minutes (replay attack)', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const sixMinutesAgo = (Math.floor(Date.now() / 1000) - 360).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, sixMinutesAgo, body);

			const result = verifySvixSignature(secret, msgId, sixMinutesAgo, body, signature);

			expect(result).toBe(false);
		});

		it('rejects webhooks with timestamp too far in the future', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const sixMinutesInFuture = (Math.floor(Date.now() / 1000) + 360).toString();
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, sixMinutesInFuture, body);

			const result = verifySvixSignature(secret, msgId, sixMinutesInFuture, body, signature);

			expect(result).toBe(false);
		});

		it('rejects webhooks with invalid timestamp format', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const invalidTimestamp = 'not-a-number';
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, invalidTimestamp, body);

			const result = verifySvixSignature(secret, msgId, invalidTimestamp, body, signature);

			expect(result).toBe(false);
		});

		it('rejects webhooks with empty timestamp', () => {
			const secret = 'whsec_' + Buffer.from('test-secret-key').toString('base64');
			const msgId = 'msg_12345';
			const emptyTimestamp = '';
			const body = JSON.stringify({ type: 'test' });
			const signature = generateValidSignature(secret, msgId, emptyTimestamp, body);

			const result = verifySvixSignature(secret, msgId, emptyTimestamp, body, signature);

			expect(result).toBe(false);
		});
	});
});
