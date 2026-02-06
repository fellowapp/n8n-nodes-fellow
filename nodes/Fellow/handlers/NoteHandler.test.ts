import { describe, expect, it, vi, beforeEach } from 'vitest';
import { IExecuteFunctions } from 'n8n-workflow';
import { executeNoteGet, executeNoteGetMany } from './NoteHandler';

// Mock the config module
vi.mock('../config', () => ({
	shouldSkipSslValidation: () => false,
}));

describe('NoteHandler', () => {
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

	describe('executeNoteGet', () => {
		it('fetches a single note by ID', async () => {
			const mockResponse = {
				note: {
					id: 'note_123',
					title: 'Test Note',
					content: 'Note content',
				},
			};
			mockHttpRequest.mockResolvedValue(mockResponse);

			const context = createMockContext({ noteId: 'note_123' });
			const result = await executeNoteGet(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					method: 'GET',
					url: 'https://test.fellow.app/api/v1/note/note_123',
					json: true,
				}),
			);
			expect(result).toEqual([{ json: mockResponse, pairedItem: { item: 0 } }]);
		});

		it('uses the correct URL for the note', async () => {
			mockHttpRequest.mockResolvedValue({ note: {} });

			const context = createMockContext({ noteId: 'custom-note-456' });
			await executeNoteGet(context, 'https://mycompany.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					url: 'https://mycompany.fellow.app/api/v1/note/custom-note-456',
				}),
			);
		});
	});

	describe('executeNoteGetMany', () => {
		it('fetches notes with empty body when no filters are set', async () => {
			const mockResponse = {
				notes: {
					data: [
						{ id: 'note_1', title: 'Note 1' },
						{ id: 'note_2', title: 'Note 2' },
					],
					page_info: { has_next_page: false },
				},
			};
			mockHttpRequest.mockResolvedValue(mockResponse);

			const context = createMockContext({
				noteFilters: {},
				noteInclude: {},
				noteOptions: {},
			});
			const result = await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					method: 'POST',
					url: 'https://test.fellow.app/api/v1/notes',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({}),
				}),
			);
			expect(result).toHaveLength(2);
			expect(result[0].json.id).toBe('note_1');
			expect(result[1].json.id).toBe('note_2');
		});

		it('includes title filter when set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: { title: 'Weekly Meeting' },
				noteInclude: {},
				noteOptions: {},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: { title: 'Weekly Meeting' },
					}),
				}),
			);
		});

		it('includes event_guid filter when set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: { event_guid: 'event-guid-123' },
				noteInclude: {},
				noteOptions: {},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: { event_guid: 'event-guid-123' },
					}),
				}),
			);
		});

		it('includes date range filters when set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: {
					created_at_start: '2024-01-01T00:00:00Z',
					created_at_end: '2024-12-31T23:59:59Z',
				},
				noteInclude: {},
				noteOptions: {},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: {
							created_at_start: '2024-01-01T00:00:00Z',
							created_at_end: '2024-12-31T23:59:59Z',
						},
					}),
				}),
			);
		});

		it('parses event_attendees as comma-separated array', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: { event_attendees: 'user1@example.com, user2@example.com, user3@example.com' },
				noteInclude: {},
				noteOptions: {},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: {
							event_attendees: ['user1@example.com', 'user2@example.com', 'user3@example.com'],
						},
					}),
				}),
			);
		});

		it('includes event_attendees in include options when set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: {},
				noteInclude: { event_attendees: true },
				noteOptions: {},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						include: { event_attendees: true },
					}),
				}),
			);
		});

		it('includes content_markdown in include options when set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: {},
				noteInclude: { content_markdown: true },
				noteOptions: {},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						include: { content_markdown: true },
					}),
				}),
			);
		});

		it('includes pagination when page_size is set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: {},
				noteInclude: {},
				noteOptions: { page_size: 20 },
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						pagination: { page_size: 20 },
					}),
				}),
			);
		});

		it('includes pagination cursor when set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: {},
				noteInclude: {},
				noteOptions: { cursor: 'next_page_cursor' },
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						pagination: { cursor: 'next_page_cursor' },
					}),
				}),
			);
		});

		it('includes all options when multiple are set', async () => {
			mockHttpRequest.mockResolvedValue({ notes: { data: [], page_info: {} } });

			const context = createMockContext({
				noteFilters: {
					title: 'Sprint Planning',
					channel_id: 'channel_123',
				},
				noteInclude: {
					event_attendees: true,
					content_markdown: true,
				},
				noteOptions: {
					page_size: 50,
					cursor: 'abc123',
				},
			});
			await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(mockHttpRequest).toHaveBeenCalledWith(
				context,
				'fellowApi',
				expect.objectContaining({
					body: JSON.stringify({
						filters: {
							title: 'Sprint Planning',
							channel_id: 'channel_123',
						},
						include: {
							event_attendees: true,
							content_markdown: true,
						},
						pagination: {
							page_size: 50,
							cursor: 'abc123',
						},
					}),
				}),
			);
		});

		it('returns pagination info with each note', async () => {
			const pageInfo = { has_next_page: true, cursor: 'next_cursor' };
			mockHttpRequest.mockResolvedValue({
				notes: {
					data: [{ id: 'note_1', title: 'Note 1' }],
					page_info: pageInfo,
				},
			});

			const context = createMockContext({
				noteFilters: {},
				noteInclude: {},
				noteOptions: {},
			});
			const result = await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(result[0].json._pagination).toEqual(pageInfo);
		});

		it('returns empty message with pagination when no notes found', async () => {
			mockHttpRequest.mockResolvedValue({
				notes: {
					data: [],
					page_info: { has_next_page: false },
				},
			});

			const context = createMockContext({
				noteFilters: {},
				noteInclude: {},
				noteOptions: {},
			});
			const result = await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.message).toBe('No notes found');
			expect(result[0].json._pagination).toEqual({ has_next_page: false });
		});

		it('handles missing notes in response gracefully', async () => {
			mockHttpRequest.mockResolvedValue({});

			const context = createMockContext({
				noteFilters: {},
				noteInclude: {},
				noteOptions: {},
			});
			const result = await executeNoteGetMany(context, 'https://test.fellow.app/api/v1', 0);

			expect(result).toHaveLength(1);
			expect(result[0].json.message).toBe('No notes found');
		});
	});
});
