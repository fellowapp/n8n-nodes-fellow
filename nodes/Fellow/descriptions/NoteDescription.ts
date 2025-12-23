import { INodeProperties } from 'n8n-workflow';

export const noteOperations: INodeProperties[] = [
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
];

export const noteFields: INodeProperties[] = [
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
];
