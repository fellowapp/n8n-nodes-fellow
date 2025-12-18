import {
	IHookFunctions,
	IWebhookFunctions,
	INodeExecutionData,
	IExecuteFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
} from 'n8n-workflow';

import { getFellowApiBaseUrl, shouldSkipSslValidation } from './config';

// Human-readable event names for webhook descriptions
const EVENT_DESCRIPTIONS: Record<string, string> = {
	'ai_note.generated': 'AI Note Generated',
	'ai_note.shared_to_channel': 'AI Note Shared to Channel',
	'action_item.assigned': 'Action Item Assigned',
	'action_item.completed': 'Action Item Completed',
};

// Sample payloads for manual testing (execute method)
const SAMPLE_PAYLOADS: Record<string, IDataObject> = {
	'ai_note.generated': {
		event: 'ai_note.generated',
		timestamp: new Date().toISOString(),
		data: {
			meeting_id: 'sample-meeting-123',
			meeting_title: 'Weekly Team Sync',
			note_id: 'sample-note-456',
			generated_at: new Date().toISOString(),
			summary: 'This is a sample AI-generated meeting summary for testing purposes.',
			action_items: [
				{ id: 'ai-1', title: 'Follow up on project timeline', assignee: 'john@example.com' },
				{ id: 'ai-2', title: 'Share meeting notes with stakeholders', assignee: 'jane@example.com' },
			],
		},
	},
	'ai_note.shared_to_channel': {
		event: 'ai_note.shared_to_channel',
		timestamp: new Date().toISOString(),
		data: {
			meeting_id: 'sample-meeting-123',
			meeting_title: 'Weekly Team Sync',
			note_id: 'sample-note-456',
			channel_id: 'sample-channel-789',
			channel_name: 'Engineering Team',
			shared_by: 'john@example.com',
			shared_at: new Date().toISOString(),
		},
	},
	'action_item.assigned': {
		event: 'action_item.assigned',
		timestamp: new Date().toISOString(),
		data: {
			action_item_id: 'sample-action-123',
			title: 'Review PR for new feature',
			description: 'Please review and approve the pull request for the dashboard update.',
			assignee: 'jane@example.com',
			assigned_by: 'john@example.com',
			due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			meeting_id: 'sample-meeting-123',
			meeting_title: 'Weekly Team Sync',
		},
	},
	'action_item.completed': {
		event: 'action_item.completed',
		timestamp: new Date().toISOString(),
		data: {
			action_item_id: 'sample-action-123',
			title: 'Review PR for new feature',
			completed_by: 'jane@example.com',
			completed_at: new Date().toISOString(),
			meeting_id: 'sample-meeting-123',
			meeting_title: 'Weekly Team Sync',
		},
	},
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
						name: 'Action Item Assigned',
						value: 'action_item.assigned',
						description: 'Triggers when an action item is assigned to a user',
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
							url: `${apiBaseUrl}/webhooks`,
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

					// Extract the webhook ID from the response
					const webhookId = response?.webhook?.id;
					if (!webhookId) {
						throw new Error('Fellow API did not return a webhook ID');
					}

					// Store the webhook ID for later cleanup
					const staticData = this.getWorkflowStaticData('node');
					staticData.webhookId = webhookId;

					this.logger.info(`[Fellow Trigger] Webhook registered successfully: ${webhookId}`);

					return true;
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					this.logger.error(`[Fellow Trigger] Failed to register webhook: ${errorMessage}`);

					throw new NodeApiError(this.getNode(), { message: errorMessage }, {
						message: 'Failed to register webhook with Fellow API',
					});
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
					await this.helpers.httpRequestWithAuthentication.call(
						this,
						'fellowApi',
						{
							method: 'DELETE',
							url: `${apiBaseUrl}/webhooks/${webhookId}`,
							skipSslCertificateValidation: shouldSkipSslValidation(),
						},
					);

					this.logger.info(`[Fellow Trigger] Webhook deleted successfully: ${webhookId}`);
				} catch (error) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					this.logger.error(`[Fellow Trigger] Failed to delete webhook: ${errorMessage}`);
					// Don't throw - we still want to clean up the local reference
					// The webhook may have already been deleted manually
				}

				delete staticData.webhookId;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;

		this.logger.debug('[Fellow Trigger] Webhook received', { body });

		// Handle URL verification challenge from Fellow
		// When WEBHOOK_VERIFICATION_ENABLED=true, Fellow sends a challenge that must be echoed back
		if (body.type === 'url_verification' && body.challenge) {
			this.logger.info('[Fellow Trigger] Responding to URL verification challenge');
			return {
				webhookResponse: body.challenge as string,
			};
		}

		// TODO: Implement event payload handling (PR6)

		// Pass through the raw payload for normal events
		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}

	/**
	 * Execute method for manual testing.
	 * Returns sample data based on the selected event type.
	 */
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const event = this.getNodeParameter('event', 0) as string;

		this.logger.info(`[Fellow Trigger] Manual execution - returning sample data for event: ${event}`);

		// Get sample payload for the selected event
		const samplePayload = SAMPLE_PAYLOADS[event] ?? {
			event,
			timestamp: new Date().toISOString(),
			data: { message: 'Sample payload for testing' },
		};

		return [this.helpers.returnJsonArray([samplePayload])];
	}
}
