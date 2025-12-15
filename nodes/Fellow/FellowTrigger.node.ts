import {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

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

				this.logger.debug(`[Fellow Trigger] create called`);
				this.logger.debug(`[Fellow Trigger] Webhook URL: ${webhookUrl}`);
				this.logger.debug(`[Fellow Trigger] Event: ${event}`);

				// TODO: Implement webhook registration with Fellow API
				// For now, store a placeholder ID to test the flow
				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = 'placeholder-webhook-id';

				this.logger.info(`[Fellow Trigger] Webhook registration placeholder - would register for event: ${event}`);

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;

				this.logger.debug(`[Fellow Trigger] delete called, webhookId: ${webhookId ?? 'none'}`);

				if (!webhookId) {
					this.logger.debug('[Fellow Trigger] No webhook ID found, nothing to delete');
					return true;
				}

				// TODO: Implement webhook deletion with Fellow API
				this.logger.info(`[Fellow Trigger] Webhook deletion placeholder - would delete webhook: ${webhookId}`);

				delete staticData.webhookId;

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const body = this.getBodyData() as IDataObject;

		this.logger.debug('[Fellow Trigger] Webhook received', { body });

		// TODO: Implement URL challenge response
		// TODO: Implement event payload handling

		// For now, pass through the raw payload
		return {
			workflowData: [this.helpers.returnJsonArray([body])],
		};
	}
}
