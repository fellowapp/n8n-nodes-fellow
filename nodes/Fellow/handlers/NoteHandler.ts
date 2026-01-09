import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { shouldSkipSslValidation } from '../config';

export async function executeNoteGet(
	context: IExecuteFunctions,
	apiBaseUrl: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const noteId = context.getNodeParameter('noteId', itemIndex) as string;

	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'fellowApi', {
		method: 'GET',
		url: `${apiBaseUrl}/note/${noteId}`,
		json: true,
		skipSslCertificateValidation: shouldSkipSslValidation(),
	});

	return [{ json: response }];
}

export async function executeNoteGetMany(
	context: IExecuteFunctions,
	apiBaseUrl: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const noteFilters = context.getNodeParameter('noteFilters', itemIndex, {}) as {
		title?: string;
		event_guid?: string;
		channel_id?: string;
		created_at_start?: string;
		created_at_end?: string;
		updated_at_start?: string;
		updated_at_end?: string;
		event_attendees?: string;
	};
	const noteInclude = context.getNodeParameter('noteInclude', itemIndex, {}) as {
		event_attendees?: boolean;
		content_markdown?: boolean;
	};
	const noteOptions = context.getNodeParameter('noteOptions', itemIndex, {}) as {
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
	if (noteFilters.created_at_start) activeFilters.created_at_start = noteFilters.created_at_start;
	if (noteFilters.created_at_end) activeFilters.created_at_end = noteFilters.created_at_end;
	if (noteFilters.updated_at_start) activeFilters.updated_at_start = noteFilters.updated_at_start;
	if (noteFilters.updated_at_end) activeFilters.updated_at_end = noteFilters.updated_at_end;
	if (noteFilters.event_attendees) {
		activeFilters.event_attendees = noteFilters.event_attendees.split(',').map((e) => e.trim());
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

	const response = await context.helpers.httpRequestWithAuthentication.call(context, 'fellowApi', {
		method: 'POST',
		url: `${apiBaseUrl}/notes`,
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
		skipSslCertificateValidation: shouldSkipSslValidation(),
	});

	const returnData: INodeExecutionData[] = [];
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

	return returnData;
}
