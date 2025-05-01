import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeOperationError,
	IDataObject,
	// ICredentialDataDecryptedObject, // Removed unused import
	IHookFunctions,
} from 'n8n-workflow';
import { meetingRecapDescription } from './descriptions/index.js'; // Fix import path

// Load API URL from environment variable, defaulting to production
const FELLOW_GRAPHQL_URL = process.env.FELLOW_API_URL || 'https://fellow.app/graphql';

// --- Standalone Helper for GraphQL requests ---
async function callFellowGraphql(
	context: IHookFunctions | IExecuteFunctions,
	query: string,
	variables?: IDataObject,
): Promise<any> {
	// Get credentials for Basic Auth
	let credentials;
	try {
		credentials = await context.getCredentials('fellowApi');
	} catch (error) {
		throw new NodeOperationError(context.getNode(), 'Credentials could not be loaded.');
	}

	const apiKey = credentials.apiKey as string;
	const email = credentials.email as string;

	if (!apiKey || !email) {
		throw new NodeOperationError(
			context.getNode(),
			'Fellow API key or email missing in credentials for Basic Auth.',
		);
	}
	const basicAuthHeader = `Basic ${Buffer.from(`${email}:${apiKey}`).toString('base64')}`;

	try {
		const response = await context.helpers.httpRequest({
			method: 'POST',
			url: FELLOW_GRAPHQL_URL,
			headers: {
				'Content-Type': 'application/json',
				Authorization: basicAuthHeader,
			},
			body: JSON.stringify({ query, variables }),
			json: true,
			skipSslCertificateValidation: true, // Consider making this configurable
		});

		context.logger.debug('GraphQL Response:', response);
		return response; // Return the full response object
	} catch (error) {
		context.logger.error(`Error calling Fellow GraphQL API: ${error.message}`, error);
		// Rethrow specific errors if needed, or handle generally
		throw new NodeOperationError(context.getNode(), `Error calling Fellow API: ${error.message}`);
	}
}

export class Fellow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fellow', // Fix string quote
		name: 'fellow', // Fix string quote
		icon: 'file:Fellow.svg', // Updated icon path
		group: ['trigger', 'productivity'], // Added productivity group
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with the Fellow API', // Fix string quote
		defaults: {
			name: 'Fellow', // Fix string quote
		},
		inputs: ['main'], // Fix string quote
		outputs: ['main'], // Fix string quote
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
				isFullPath: false,
				path: 'webhook',
				webhookSharedSecretEnvName: 'FELLOW_WEBHOOK_SECRET', // Added for potential signature validation
				responseCode: '200', // Standard success code
			},
		],
		// Define properties for resource selection, operation selection, etc.
		properties: [
			// Resource Selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Meeting Recap',
						value: 'meetingRecap',
					},
					// Add other resources later
				],
				default: 'meetingRecap',
				required: true,
			},

			// Load resource-specific operations and fields
			...meetingRecapDescription, // Load descriptions/fields from dedicated file

			// Potentially add common fields if needed across resources
		],
	};

	// --- Webhook Handling ---
	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		this.logger.debug(`Received webhook request:`, req.body); // Fix template literal

		// Optional: Validate webhook signature if Fellow provides one
		// const signature = req.headers['x-fellow-signature']; // Example header
		// const secret = this.getWebhookSharedSecret('default');
		// if (secret && !isValidSignature(req.rawBody, signature, secret)) {
		//  this.logger.warn('Invalid webhook signature received.');
		//  return { noWebhookResponse: true }; // Respond later or let n8n handle default
		// }

		// TODO: Adapt based on the actual structure of Fellow's meeting recap webhook payload
		const recapData = req.body as IDataObject; // Assuming body is the recap object

		if (!recapData || Object.keys(recapData).length === 0) {
			this.logger.warn('Received empty webhook payload.'); // Fix string quote
			// Don't forward empty data usually
			return { workflowData: [] }; // Or handle as needed
		}

		// Format the data into n8n items
		const returnData: INodeExecutionData[] = this.helpers.returnJsonArray([recapData]);

		return {
			workflowData: [returnData], // Wrap in an array to match INodeExecutionData[][]
		};
	}

	// --- Webhook Registration/Deregistration (via GraphQL) ---
	webhookMethods = {
		default: {
			// Corresponds to the webhook defined in description.webhooks
			async checkExists(this: IHookFunctions): Promise<boolean> {
				// Optional: Implement logic to check if a webhook with this target URL already exists in Fellow
				// This might involve listing webhooks via GraphQL and checking the URL.
				// For simplicity, we can initially assume it doesn't exist or rely on create/delete idempotency.
				this.logger.info('Webhook checkExists not implemented, assuming webhook needs creation.');
				return false; // Assume it needs to be created/updated
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				if (!webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						'Could not get webhook URL. Ensure the workflow is active or uses a static webhook URL.',
					);
				}
				this.logger.info(`Registering webhook for Fellow Meeting Recaps: ${webhookUrl}`);

				const query = `
                    mutation CreateWebhook($input: CreateWebhookInput!) {
                        createWebhook(input: $input) {
                            webhook {
                                id
                            }
                            errors {
                                message
                            }
                        }
                    }
                `; // Fix GraphQL query template literal

				const variables = {
					input: {
						target: webhookUrl,
						event: 'MEETING_RECAP_CREATED', // Example event type - MUST match Fellow's enum
					},
				};

				try {
					// Call the helper, passing 'this' as the context
					const response = await callFellowGraphql(this, query, variables);

					// Check response for success/errors from Fellow's API
					if (response?.data?.createWebhook?.errors?.length > 0) {
						const errorMessages = response.data.createWebhook.errors
							.map((e: { message: string }) => e.message)
							.join(', ');
						throw new NodeOperationError(
							this.getNode(),
							`Failed to create Fellow webhook: ${errorMessages}`,
						); // Fix template literal
					}

					if (!response?.data?.createWebhook?.webhook?.id) {
						throw new NodeOperationError(
							this.getNode(),
							'Failed to create Fellow webhook: No webhook ID returned.',
						);
					}

					const webhookId = response.data.createWebhook.webhook.id;
					this.logger.info(`Successfully registered Fellow webhook with ID: ${webhookId}`); // Fix template literal

					// Store the webhook ID for deletion later
					this.getWorkflowStaticData('node').webhookId = webhookId;

					return true;
				} catch (error) {
					// Log specific error from create context if needed
					if (error instanceof NodeOperationError) throw error; // Rethrow known operation errors
					// The helper function already logs and throws a generic NodeOperationError
					throw error; // Rethrow error caught from helper
				}
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string;

				if (!webhookId) {
					this.logger.warn('No Fellow webhook ID found in static data to delete.'); // Fix string quote
					return true; // Nothing to delete
				}

				this.logger.info(`Deleting Fellow webhook with ID: ${webhookId}`); // Fix template literal

				const query = `
                    mutation DeleteWebhook($id: ID!) {
                        deleteWebhook(input: { id: $id }) {
                            success
                            errors {
                                message
                            }
                        }
                    }
                `; // Fix GraphQL query template literal

				const variables = {
					id: webhookId,
				};

				try {
					// Call the helper, passing 'this' as the context
					const response = await callFellowGraphql(this, query, variables);

					// Check response for success/errors
					if (response?.data?.deleteWebhook?.errors?.length > 0) {
						const errorMessages = response.data.deleteWebhook.errors
							.map((e: { message: string }) => e.message)
							.join(', ');
						// Don't throw error on delete failure, just log warning
						this.logger.warn(`Failed to delete Fellow webhook (${webhookId}): ${errorMessages}`); // Fix template literal
						return false; // Indicate deletion might have failed
					}
					if (!response?.data?.deleteWebhook?.success) {
						this.logger.warn(
							`Failed to delete Fellow webhook (${webhookId}): Success flag was false.`,
						); // Fix template literal
						return false;
					}

					this.logger.info(`Successfully deleted Fellow webhook: ${webhookId}`); // Fix template literal
					delete staticData.webhookId; // Clean up static data
					return true;
				} catch (error) {
					// Log specific error from delete context, don't rethrow to prevent workflow deactivation issues
					this.logger.error(
						`Error during Fellow webhook deletion (${webhookId}): ${error.message}`,
						error,
					);
					return false; // Indicate deletion failed
				}
			},
		},
	};

	// --- Regular Execution Logic (for non-trigger operations) ---
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		let returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials once
		try {
			await this.getCredentials('fellowApi');
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Credentials could not be loaded.');
		}

		for (let i = 0; i < items.length; i++) {
			try {
				// Route based on resource and operation
				if (resource === 'meetingRecap') {
					if (operation === 'trigger') {
						// This operation is webhook-based. The 'execute' method is primarily
						// for testing triggers manually or for non-trigger operations.
						// We'll return the input item for manual testing.
						this.logger.info('Fellow trigger node executed manually. Returning input item.'); // Fix string quote
						returnData.push(items[i]);
						continue; // Move to next item
					}
					// Add else if blocks for future operations like 'get', 'list'
					else {
						throw new NodeOperationError(
							this.getNode(),
							`Operation '${operation}' not implemented for resource '${resource}'.`,
						); // Fix template literal
					}
				}
				// Add else if blocks for future resources like 'actionItem', 'meeting'
				else {
					throw new NodeOperationError(this.getNode(), `Resource '${resource}' not implemented.`); // Fix template literal
				}

				// --- Example of calling a future operation ---
				// if (resource === 'meeting' && operation === 'get') {
				//     const meetingId = this.getNodeParameter('meetingId', i) as string;
				//     const result = await callFellowGraphql(credentials.apiKey, buildGetMeetingQuery(meetingId));
				//     returnData.push({ json: result, pairedItem: { item: i } });
				// }
			} catch (error) {
				this.logger.error(`Node execution error: ${error.message}`, error);
				if (this.continueOnFail()) {
					returnData.push({ json: items[i].json, error: error, pairedItem: { item: i } });
				} else {
					// Rethrow error if not continuing on fail
					if (error instanceof NodeOperationError) throw error;
					throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i }); // Pass error.message directly
				}
			}
		}

		return this.prepareOutputData(returnData);
	}

	// --- Helper for GraphQL requests (optional, could be inline) ---
	// async callFellowGraphql(apiKey: string, query: string, variables?: IDataObject): Promise<IDataObject> {
	//      // Implementation using this.helpers.httpRequest
	// }
}
