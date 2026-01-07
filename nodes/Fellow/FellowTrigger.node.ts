import {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
} from 'n8n-workflow';

import { getFellowApiBaseUrl, shouldSkipSslValidation } from './config';
import { verifySvixSignature } from './signatureVerification';

// Human-readable event names for webhook descriptions
const EVENT_DESCRIPTIONS: Record<string, string> = {
	'ai_note.generated': 'AI Note Generated',
	'ai_note.shared_to_channel': 'AI Note Shared to Channel',
	'action_item.assigned_to_me': 'Action Item Assigned To Me',
	'action_item.completed': 'Action Item Completed',
};

export class FellowTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fellow Trigger',
		name: 'fellowTrigger',
		icon: 'file:Fellow.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Triggers workflow when Fellow events occur',
		defaults: {
			name: 'Fellow Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'fellowApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: 'ai_note.generated',
				description: 'The event to listen for',
				options: [
					{
						name: 'AI Note Generated',
						value: 'ai_note.generated',
						description: 'Triggers when an AI note is generated after a meeting',
					},
					{
						name: 'AI Note Shared to Channel',
						value: 'ai_note.shared_to_channel',
						description: 'Triggers when an AI note is shared to a Fellow channel',
					},
					{
						name: 'Action Item Assigned To Me',
						value: 'action_item.assigned_to_me',
						description: 'Triggers when an action item is assigned to me',
					},
					{
						name: 'Action Item Completed',
						value: 'action_item.completed',
						description: 'Triggers when an action item is marked as complete',
					},
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;

				this.logger.debug(`[Fellow Trigger] checkExists called, webhookId: ${webhookId ?? 'none'}`);

				return !!webhookId;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const credentials = await this.getCredentials('fellowApi');
				const subdomain = credentials.subdomain as string;

				this.logger.debug(`[Fellow Trigger] Registering webhook for event: ${event}`);

				// Generate a human-readable description for the webhook
				const eventName = EVENT_DESCRIPTIONS[event] ?? event;
				const description = `n8n workflow trigger: ${eventName}`;

				// Construct the API URL using the subdomain from credentials
				const apiBaseUrl = getFellowApiBaseUrl(subdomain);

				try {
					// Call Fellow Developer API to create the webhook
					const response = await this.helpers.httpRequestWithAuthentication.call(
						this,
						'fellowApi',
						{
							method: 'POST',
							url: `${apiBaseUrl}/webhook`,
							headers: {
								'Content-Type': 'application/json',
							},
							body: {
								url: webhookUrl,
								enabled_events: [event],
								description,
								status: 'active',
							},
							json: true,
							skipSslCertificateValidation: shouldSkipSslValidation(),
						},
					);

					// Extract the webhook ID and secret from the response
					// API returns: { webhook: { id: "...", secret: "whsec_..." } }
					const webhookId = response?.webhook?.id;
					const webhookSecret = response?.webhook?.secret;
					if (!webhookId || !webhookSecret) {
						throw new Error('Fellow API did not return a webhook ID or secret');
					}

					// Store the webhook ID and secret for later use
					const staticData = this.getWorkflowStaticData('node');
					staticData.webhookId = webhookId;
					staticData.webhookSecret = webhookSecret;

					this.logger.info(`[Fellow Trigger] Webhook registered successfully: ${webhookId}`);

					return true;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					this.logger.error(`[Fellow Trigger] Failed to register webhook: ${errorMessage}`);

					throw new NodeApiError(
						this.getNode(),
						{ message: errorMessage },
						{
							message: 'Failed to register webhook with Fellow API',
						},
					);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;

				this.logger.debug(`[Fellow Trigger] delete called, webhookId: ${webhookId ?? 'none'}`);

				if (!webhookId) {
					this.logger.debug('[Fellow Trigger] No webhook ID found, nothing to delete');
					return true;
				}

				const credentials = await this.getCredentials('fellowApi');
				const subdomain = credentials.subdomain as string;
				const apiBaseUrl = getFellowApiBaseUrl(subdomain);

				try {
					// Call Fellow Developer API to delete the webhook
					await this.helpers.httpRequestWithAuthentication.call(this, 'fellowApi', {
						method: 'DELETE',
						url: `${apiBaseUrl}/webhook/${webhookId}`,
						skipSslCertificateValidation: shouldSkipSslValidation(),
					});

					this.logger.info(`[Fellow Trigger] Webhook deleted successfully: ${webhookId}`);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					this.logger.error(`[Fellow Trigger] Failed to delete webhook: ${errorMessage}`);
					// Don't throw - we still want to clean up the local reference
					// The webhook may have already been deleted manually
				}

				delete staticData.webhookId;
				delete staticData.webhookSecret;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = this.getBodyData() as IDataObject;

		// Handle URL verification challenge from Fellow
		// When WEBHOOK_VERIFICATION_ENABLED=true, Fellow sends a challenge that must be echoed back
		if (body.type === 'url_verification' && body.challenge) {
			this.logger.info('[Fellow Trigger] Responding to URL verification challenge');
			return {
				webhookResponse: body.challenge as string,
			};
		}

		// Get Svix headers for signature verification
		const svixId = req.headers['svix-id'] as string | undefined;
		const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
		const svixSignature = req.headers['svix-signature'] as string | undefined;

		// Get the stored webhook secret
		const staticData = this.getWorkflowStaticData('node');
		const webhookSecret = staticData.webhookSecret as string | undefined;

		// Verify webhook signature using guard clauses
		if (!webhookSecret) {
			this.logger.warn('[Fellow Trigger] No webhook secret stored - rejecting request');
			return {
				webhookResponse: 'Unauthorized',
				noWebhookResponse: true,
			};
		}

		if (!svixId || !svixTimestamp || !svixSignature) {
			this.logger.warn('[Fellow Trigger] Missing Svix headers - rejecting request');
			return {
				webhookResponse: 'Unauthorized',
				noWebhookResponse: true,
			};
		}

		// Verify raw body is available - required for signature verification
		// Svix signs the exact raw HTTP body bytes, so we cannot fallback to JSON.stringify
		if (!req.rawBody) {
			this.logger.error('[Fellow Trigger] Raw body unavailable - cannot verify signature');
			return {
				webhookResponse: 'Bad Request',
				noWebhookResponse: true,
			};
		}

		// Get raw body for signature verification
		const rawBody = Buffer.isBuffer(req.rawBody)
			? req.rawBody.toString('utf8')
			: String(req.rawBody);

		const isValid = verifySvixSignature(
			webhookSecret,
			svixId,
			svixTimestamp,
			rawBody,
			svixSignature,
		);

		if (!isValid) {
			this.logger.error('[Fellow Trigger] Invalid webhook signature - rejecting request');
			return {
				webhookResponse: 'Unauthorized',
				noWebhookResponse: true,
			};
		}

		this.logger.info('[Fellow Trigger] Signature verified successfully');

		// Pass through the raw payload for normal events
		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}
}
