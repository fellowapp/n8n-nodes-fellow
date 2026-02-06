import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IExecuteFunctions } from 'n8n-workflow';
import {
	executeActionItemGet,
	executeActionItemGetMany,
	executeActionItemComplete,
} from './ActionItemHandler';

// Mock the config module
vi.mock('../config', () => ({
	shouldSkipSslValidation: () => false,
}));

describe('ActionItemHandler', () => {
	// Create a mock for httpRequestWithAuthentication
	const mockHttpRequest = vi.fn();

	// Create a mock context that matches the IExecuteFunctions interface
	const createMockContext = (params: Record<string, unknown> = {}) => {
		return {
			getNodeParameter: vi.fn((name: string, _index: number, defaultValue?: unknown) => {
				return params[name] ?? defaultValue;
			}),
			helpers: {
				httpRequestWithAuthentication: {
					call: mockHttpRequest,
				},
			},
		} as unknown as IExecuteFunctions;
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('executeActionItemGet', () => {
		it('fetches a single action item by ID', async () => {
			const mockResponse = {
				action_item: {
					id: 'ai_123',
					title: 'Test Action Item',
					completed: false,
				},
			};
			mockHttpRequest.mockResolvedValue(mockResponse);

			const context = createMockContext({ actionItemId: 'ai_123' });
			const result = await executeActionItemGet(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://test.fellow.app/api/v1/action_item/ai_123',
					json: true,
				}),
			);
			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});

		it('uses the correct URL for the action item', async () => {
			mockHttpRequest.mockResolvedValue({ action_item: {} });

			const context = createMockContext({ actionItemId: 'custom-id-456' });
			await executeActionItemGet(context, 'https://mycompany.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					url: 'https://mycompany.fellow.app/api/v1/action_item/custom-id-456',
				}),
			);
		});
	});

	describe('executeActionItemGetMany', () => {
		it('fetches action items with empty body when no filters are set', async () => {
			const mockResponse = {
				action_items: {
					data: [
						{ id: 'ai_1', title: 'Action 1' },
						{ id: 'ai_2', title: 'Action 2' },
					],
					page_info: { has_next_page: false },
				},
			};
			mockHttpRequest.mockResolvedValue(mockResponse);

			const context = createMockContext({ filters: {}, options: {} });
			const result = await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://test.fellow.app/api/v1/action_items',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);
			expect(result).toHaveLength(2);
			expect(result[0].json.id).toBe('ai_1');
			expect(result[1].json.id).toBe('ai_2');
		});

		it('includes filters in request body when set', async () => {
			mockHttpRequest.mockResolvedValue({ action_items: { data: [], page_info: {} } });

			const context = createMockContext({
				filters: { completed: true, archived: false },
				options: {},
			});
			await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: { completed: true, archived: false },
					}),
				}),
			);
		});

		it('includes ai_detected filter when set', async () => {
			mockHttpRequest.mockResolvedValue({ action_items: { data: [], page_info: {} } });

			const context = createMockContext({
				filters: { ai_detected: true },
				options: {},
			});
			await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: { ai_detected: true },
					}),
				}),
			);
		});

		it('includes order_by in request body when set', async () => {
			mockHttpRequest.mockResolvedValue({ action_items: { data: [], page_info: {} } });

			const context = createMockContext({
				filters: {},
				options: { order_by: 'created_at_desc' },
			});
			await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						order_by: 'created_at_desc',
					}),
				}),
			);
		});

		it('includes pagination in request body when page_size is set', async () => {
			mockHttpRequest.mockResolvedValue({ action_items: { data: [], page_info: {} } });

			const context = createMockContext({
				filters: {},
				options: { page_size: 10 },
			});
			await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						pagination: { page_size: 10 },
					}),
				}),
			);
		});

		it('includes pagination cursor when set', async () => {
			mockHttpRequest.mockResolvedValue({ action_items: { data: [], page_info: {} } });

			const context = createMockContext({
				filters: {},
				options: { cursor: 'next_page_cursor_123' },
			});
			await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						pagination: { cursor: 'next_page_cursor_123' },
					}),
				}),
			);
		});

		it('includes all options when multiple are set', async () => {
			mockHttpRequest.mockResolvedValue({ action_items: { data: [], page_info: {} } });

			const context = createMockContext({
				filters: { completed: false, ai_detected: true },
				options: { order_by: 'due_date', page_size: 25, cursor: 'abc123' },
			});
			await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: { completed: false, ai_detected: true },
						order_by: 'due_date',
						pagination: { page_size: 25, cursor: 'abc123' },
					}),
				}),
			);
		});

		it('returns pagination info with each item', async () => {
			const pageInfo = { has_next_page: true, cursor: 'next_cursor' };
			mockHttpRequest.mockResolvedValue({
				action_items: {
					data: [{ id: 'ai_1', title: 'Action 1' }],
					page_info: pageInfo,
				},
			});

			const context = createMockContext({ filters: {}, options: {} });
			const result = await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(result[0].json._pagination).toEqual(pageInfo);
		});

		it('returns empty message with pagination when no items found', async () => {
			mockHttpRequest.mockResolvedValue({
				action_items: {
					data: [],
					page_info: { has_next_page: false },
				},
			});

			const context = createMockContext({ filters: {}, options: {} });
			const result = await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.message).toBe('No action items found');
			expect(result[0].json._pagination).toEqual({ has_next_page: false });
		});

		it('handles missing action_items in response gracefully', async () => {
			mockHttpRequest.mockResolvedValue({});

			const context = createMockContext({ filters: {}, options: {} });
			const result = await executeActionItemGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.message).toBe('No action items found');
		});
	});

	describe('executeActionItemComplete', () => {
		it('marks an action item as complete', async () => {
			const mockResponse = {
				action_item: {
					id: 'ai_123',
					title: 'Test Action Item',
					completed: true,
				},
			};
			mockHttpRequest.mockResolvedValue(mockResponse);

			const context = createMockContext({ actionItemId: 'ai_123' });
			const result = await executeActionItemComplete(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://test.fellow.app/api/v1/action_item/ai_123/complete',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ completed: true }),
				}),
			);
			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});

		it('uses the correct action item ID in URL', async () => {
			mockHttpRequest.mockResolvedValue({ action_item: {} });

			const context = createMockContext({ actionItemId: 'different-id-789' });
			await executeActionItemComplete(context, 'https://mycompany.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					url: 'https://mycompany.fellow.app/api/v1/action_item/different-id-789/complete',
				}),
			);
		});
	});
});
