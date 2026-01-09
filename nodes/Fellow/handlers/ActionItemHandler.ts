import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { shouldSkipSslValidation } from '../config';

export async function executeActionItemGet(
	context: IExecuteFunctions,
	apiBaseUrl: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const actionItemId = context.getNodeParameter('actionItemId', itemIndex) as string;

	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'fellowApi', {
		method: 'GET',
		url: `${apiBaseUrl}/action_item/${actionItemId}`,
		json: true,
		skipSslCertificateValidation: shouldSkipSslValidation(),
	});

	return [{ json: response }];
}

export async function executeActionItemGetMany(
	context: IExecuteFunctions,
	apiBaseUrl: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const filters = context.getNodeParameter('filters', itemIndex, {}) as {
		completed?: boolean;
		archived?: boolean;
		ai_detected?: boolean;
	};
	const options = context.getNodeParameter('options', itemIndex, {}) as {
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

	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'fellowApi', {
		method: 'POST',
		url: `${apiBaseUrl}/action_items`,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
		skipSslCertificateValidation: shouldSkipSslValidation(),
	});

	const returnData: INodeExecutionData[] = [];
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

	return returnData;
}

export async function executeActionItemComplete(
	context: IExecuteFunctions,
	apiBaseUrl: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const actionItemId = context.getNodeParameter('actionItemId', itemIndex) as string;

	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'fellowApi', {
		method: 'POST',
		url: `${apiBaseUrl}/action_item/${actionItemId}/complete`,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ completed: true }),
		skipSslCertificateValidation: shouldSkipSslValidation(),
	});

	return [{ json: response }];
}
