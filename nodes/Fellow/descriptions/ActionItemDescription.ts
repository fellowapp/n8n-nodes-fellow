import { INodeProperties } from 'n8n-workflow';

export const actionItemOperations: INodeProperties[] = [
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
];

export const actionItemFields: INodeProperties[] = [
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
				displayName: 'Scope',
				name: 'scope',
				type: 'options',
				options: [
					{
						name: 'Assigned to Me',
						value: 'assigned_to_me',
					},
					{
						name: 'Assigned to Others',
						value: 'assigned_to_others',
					},
				],
				default: 'assigned_to_me',
				description:
					'Which action items to retrieve. If not specified, returns all accessible items.',
			},
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
];
