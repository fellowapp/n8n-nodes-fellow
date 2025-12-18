import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import { getFellowApiBaseUrl, shouldSkipSslValidation } from './config';

export class Fellow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Fellow',
		name: 'fellow',
		icon: 'file:Fellow.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Fellow API',
		defaults: {
			name: 'Fellow',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'fellowApi',
				required: true,
			},
		],
		properties: [
			// Resource
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Action Item',
						value: 'actionItem',
					},
					{
						name: 'Note',
						value: 'note',
					},
				],
				default: 'actionItem',
			},
			// Operations for Action Item
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['actionItem'],
					},
				},
				options: [
					{
						name: 'Complete',
						value: 'complete',
						description: 'Mark an action item as complete',
						action: 'Complete an action item',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get an action item by ID',
						action: 'Get an action item',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get multiple action items',
						action: 'Get many action items',
					},
				],
				default: 'get',
			},
			// Action Item ID (for Get and Complete)
			{
				displayName: 'Action Item ID',
				name: 'actionItemId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['actionItem'],
						operation: ['get', 'complete'],
					},
				},
				default: '',
				description: 'The ID of the action item',
			},
			// Filters for Get Many
			{
				displayName: 'Filters',
				name: 'filters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['actionItem'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Completed',
						name: 'completed',
						type: 'boolean',
						default: false,
						description: 'Whether to filter by completed status',
					},
					{
						displayName: 'Archived',
						name: 'archived',
						type: 'boolean',
						default: false,
						description: 'Whether to filter by archived status',
					},
					{
						displayName: 'AI Detected',
						name: 'ai_detected',
						type: 'boolean',
						default: false,
						description: 'Whether to filter by AI-generated items',
					},
				],
			},
			// Options for Get Many Action Items
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['actionItem'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Order By',
						name: 'order_by',
						type: 'options',
						options: [
							{
								name: 'Created At (Newest First)',
								value: 'created_at_desc',
							},
							{
								name: 'Created At (Oldest First)',
								value: 'created_at_asc',
							},
							{
								name: 'Due Date',
								value: 'due_date',
							},
						],
						default: 'created_at_desc',
						description: 'How to order the results',
					},
					{
						displayName: 'Page Size',
						name: 'page_size',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 50,
						},
						default: 20,
						description: 'Number of results to return per page (max 50)',
					},
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'Pagination cursor for fetching next page',
					},
				],
			},
			// ==================== NOTE RESOURCE ====================
			// Operations for Note
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['note'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get an AI note by ID',
						action: 'Get an AI note',
					},
					{
						name: 'Get Many',
						value: 'getMany',
						description: 'Get multiple AI notes with optional filters',
						action: 'Get many AI notes',
					},
				],
				default: 'get',
			},
			// Note ID (for Get)
			{
				displayName: 'Note ID',
				name: 'noteId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'The ID of the AI note',
			},
			// Filters for Get Many Notes
			{
				displayName: 'Filters',
				name: 'noteFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Filter by note title (case-insensitive contains)',
					},
					{
						displayName: 'Event GUID',
						name: 'event_guid',
						type: 'string',
						default: '',
						description: 'Filter by calendar event GUID',
					},
					{
						displayName: 'Channel ID',
						name: 'channel_id',
						type: 'string',
						default: '',
						description: 'Filter by channel ID',
					},
					{
						displayName: 'Created After',
						name: 'created_at_start',
						type: 'dateTime',
						default: '',
						description: 'Filter notes created on or after this date',
					},
					{
						displayName: 'Created Before',
						name: 'created_at_end',
						type: 'dateTime',
						default: '',
						description: 'Filter notes created on or before this date',
					},
					{
						displayName: 'Updated After',
						name: 'updated_at_start',
						type: 'dateTime',
						default: '',
						description: 'Filter notes updated on or after this date',
					},
					{
						displayName: 'Updated Before',
						name: 'updated_at_end',
						type: 'dateTime',
						default: '',
						description: 'Filter notes updated on or before this date',
					},
					{
						displayName: 'Event Attendees',
						name: 'event_attendees',
						type: 'string',
						default: '',
						description: 'Filter by attendee emails (comma-separated)',
					},
				],
			},
			// Include options for Notes
			{
				displayName: 'Include',
				name: 'noteInclude',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Event Attendees',
						name: 'event_attendees',
						type: 'boolean',
						default: false,
						description: 'Whether to include event attendees in the response',
					},
					{
						displayName: 'Content Markdown',
						name: 'content_markdown',
						type: 'boolean',
						default: false,
						description: 'Whether to include note content as markdown',
					},
				],
			},
			// Pagination options for Get Many Notes
			{
				displayName: 'Options',
				name: 'noteOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['note'],
						operation: ['getMany'],
					},
				},
				options: [
					{
						displayName: 'Page Size',
						name: 'page_size',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 50,
						},
						default: 20,
						description: 'Number of results to return per page (max 50)',
					},
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'Pagination cursor for fetching next page',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const credentials = await this.getCredentials('fellowApi');
		const subdomain = credentials.subdomain as string;
		const apiBaseUrl = getFellowApiBaseUrl(subdomain);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'actionItem') {
					if (operation === 'get') {
						const actionItemId = this.getNodeParameter('actionItemId', i) as string;

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'fellowApi',
							{
								method: 'GET',
								url: `${apiBaseUrl}/action_item/${actionItemId}`,
								json: true,
								skipSslCertificateValidation: shouldSkipSslValidation(),
							},
						);

						returnData.push({ json: response });
					} else if (operation === 'getMany') {
						const filters = this.getNodeParameter('filters', i, {}) as {
							completed?: boolean;
							archived?: boolean;
							ai_detected?: boolean;
						};
						const options = this.getNodeParameter('options', i, {}) as {
							order_by?: string;
							page_size?: number;
							cursor?: string;
						};

						const body: {
							filters?: Record<string, boolean>;
							order_by?: string;
							pagination?: { page_size?: number; cursor?: string };
						} = {};

						// Add filters if any are set
						const activeFilters: Record<string, boolean> = {};
						if (filters.completed !== undefined) activeFilters.completed = filters.completed;
						if (filters.archived !== undefined) activeFilters.archived = filters.archived;
						if (filters.ai_detected !== undefined) activeFilters.ai_detected = filters.ai_detected;

						if (Object.keys(activeFilters).length > 0) {
							body.filters = activeFilters;
						}

						// Add order_by if set
						if (options.order_by) {
							body.order_by = options.order_by;
						}

						// Add pagination if set
						if (options.page_size || options.cursor) {
							body.pagination = {};
							if (options.page_size) body.pagination.page_size = options.page_size;
							if (options.cursor) body.pagination.cursor = options.cursor;
						}

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'fellowApi',
							{
								method: 'POST',
								url: `${apiBaseUrl}/action_items`,
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify(body),
								skipSslCertificateValidation: shouldSkipSslValidation(),
							},
						);

						// Return each action item as a separate item
						const actionItems = response?.action_items?.data || [];
						for (const item of actionItems) {
							returnData.push({
								json: {
									...item,
									_pagination: response?.action_items?.page_info,
								},
							});
						}

						// If no items, return empty response with pagination info
						if (actionItems.length === 0) {
							returnData.push({
								json: {
									message: 'No action items found',
									_pagination: response?.action_items?.page_info,
								},
							});
						}
					} else if (operation === 'complete') {
						const actionItemId = this.getNodeParameter('actionItemId', i) as string;

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'fellowApi',
							{
								method: 'POST',
								url: `${apiBaseUrl}/action_item/${actionItemId}/complete`,
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({ completed: true }),
								skipSslCertificateValidation: shouldSkipSslValidation(),
							},
						);

						returnData.push({ json: response });
					}
				} else if (resource === 'note') {
					if (operation === 'get') {
						const noteId = this.getNodeParameter('noteId', i) as string;

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'fellowApi',
							{
								method: 'GET',
								url: `${apiBaseUrl}/note/${noteId}`,
								json: true,
								skipSslCertificateValidation: shouldSkipSslValidation(),
							},
						);

						returnData.push({ json: response });
					} else if (operation === 'getMany') {
						const noteFilters = this.getNodeParameter('noteFilters', i, {}) as {
							title?: string;
							event_guid?: string;
							channel_id?: string;
							created_at_start?: string;
							created_at_end?: string;
							updated_at_start?: string;
							updated_at_end?: string;
							event_attendees?: string;
						};
						const noteInclude = this.getNodeParameter('noteInclude', i, {}) as {
							event_attendees?: boolean;
							content_markdown?: boolean;
						};
						const noteOptions = this.getNodeParameter('noteOptions', i, {}) as {
							page_size?: number;
							cursor?: string;
						};

						const body: {
							filters?: Record<string, string | string[]>;
							include?: Record<string, boolean>;
							pagination?: { page_size?: number; cursor?: string };
						} = {};

						// Add filters if any are set
						const activeFilters: Record<string, string | string[]> = {};
						if (noteFilters.title) activeFilters.title = noteFilters.title;
						if (noteFilters.event_guid) activeFilters.event_guid = noteFilters.event_guid;
						if (noteFilters.channel_id) activeFilters.channel_id = noteFilters.channel_id;
						if (noteFilters.created_at_start)
							activeFilters.created_at_start = noteFilters.created_at_start;
						if (noteFilters.created_at_end)
							activeFilters.created_at_end = noteFilters.created_at_end;
						if (noteFilters.updated_at_start)
							activeFilters.updated_at_start = noteFilters.updated_at_start;
						if (noteFilters.updated_at_end)
							activeFilters.updated_at_end = noteFilters.updated_at_end;
						if (noteFilters.event_attendees) {
							activeFilters.event_attendees = noteFilters.event_attendees
								.split(',')
								.map((e) => e.trim());
						}

						if (Object.keys(activeFilters).length > 0) {
							body.filters = activeFilters;
						}

						// Add include options if any are set
						const activeInclude: Record<string, boolean> = {};
						if (noteInclude.event_attendees) activeInclude.event_attendees = true;
						if (noteInclude.content_markdown) activeInclude.content_markdown = true;

						if (Object.keys(activeInclude).length > 0) {
							body.include = activeInclude;
						}

						// Add pagination if set
						if (noteOptions.page_size || noteOptions.cursor) {
							body.pagination = {};
							if (noteOptions.page_size) body.pagination.page_size = noteOptions.page_size;
							if (noteOptions.cursor) body.pagination.cursor = noteOptions.cursor;
						}

						const response = await this.helpers.httpRequestWithAuthentication.call(
							this,
							'fellowApi',
							{
								method: 'POST',
								url: `${apiBaseUrl}/notes`,
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify(body),
								skipSslCertificateValidation: shouldSkipSslValidation(),
							},
						);

						// Return each note as a separate item
						const notes = response?.notes?.data || [];
						for (const note of notes) {
							returnData.push({
								json: {
									...note,
									_pagination: response?.notes?.page_info,
								},
							});
						}

						// If no items, return empty response with pagination info
						if (notes.length === 0) {
							returnData.push({
								json: {
									message: 'No notes found',
									_pagination: response?.notes?.page_info,
								},
							});
						}
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
					});
					continue;
				}
				const errorMessage = error instanceof Error ? error.message : String(error);
				throw new NodeApiError(this.getNode(), { message: errorMessage });
			}
		}

		return [returnData];
	}
}
