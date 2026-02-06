import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import { getFellowApiBaseUrl } from './config';
import { actionItemOperations, actionItemFields, noteOperations, noteFields } from './descriptions';
import {
	executeActionItemGet,
	executeActionItemGetMany,
	executeActionItemComplete,
	executeNoteGet,
	executeNoteGetMany,
} from './handlers';

// Operation handlers mapped by resource and operation
type OperationHandler = (
	context: IExecuteFunctions,
	apiBaseUrl: string,
	itemIndex: number,
) => Promise<INodeExecutionData[]>;

const operationHandlers: Record<string, Record<string, OperationHandler>> = {
	actionItem: {
		get: executeActionItemGet,
		getMany: executeActionItemGetMany,
		complete: executeActionItemComplete,
	},
	note: {
		get: executeNoteGet,
		getMany: executeNoteGetMany,
	},
};

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
			// Resource selector
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
			// Action Item operations and fields
			...actionItemOperations,
			...actionItemFields,
			// Note operations and fields
			...noteOperations,
			...noteFields,
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

		// Get the handler for this resource/operation combination
		const handler = operationHandlers[resource]?.[operation];
		if (!handler) {
			throw new NodeApiError(this.getNode(), {
				message: `Unknown resource/operation: ${resource}/${operation}`,
			});
		}

		for (let i = 0; i < items.length; i++) {
			try {
				const results = await handler(this, apiBaseUrl, i);
				returnData.push(...results);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: i },
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
