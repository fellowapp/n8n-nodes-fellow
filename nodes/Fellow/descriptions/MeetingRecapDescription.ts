import { INodeProperties } from 'n8n-workflow';

export const meetingRecapDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['meetingRecap'],
			},
		},
		options: [
			{
				name: 'Trigger on New',
				value: 'trigger',
				action: 'Setup a trigger for when a new meeting recap is generated',
				description:
					'Creates a webhook in Fellow to trigger the workflow instantly when a new recap is added',
			},
			// Add other operations like 'Get', 'List' later
		],
		default: 'trigger',
		required: true,
	},
	// Add fields specific to 'Meeting Recap' operations other than trigger later (e.g., ID for 'Get')
];
