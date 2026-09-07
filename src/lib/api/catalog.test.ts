import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiOfflineError } from './client';
import { fetchCatalogTitles, fetchCatalogTitleBySlug, fetchCatalogEditionById } from './catalog';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('Catalog API Client', () => {
	it('fetches paginated catalog titles with search and language filters', async () => {
		const mockResponse = {
			content: [
				{
					id: 'title-1',
					slug: 'the-great-gatsby',
					title: 'The Great Gatsby',
					subtitle: 'A Novel',
					language: 'en',
					primaryAuthorName: 'F. Scott Fitzgerald'
				}
			],
			page: 0,
			size: 10,
			totalElements: 1,
			totalPages: 1
		};

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'application/json' }),
			json: vi.fn().mockResolvedValue(mockResponse)
		});
		vi.stubGlobal('fetch', mockFetch);

		const result = await fetchCatalogTitles({
			search: 'Gatsby',
			language: 'en',
			page: 0,
			size: 10
		});

		expect(result).toEqual(mockResponse);
		expect(mockFetch).toHaveBeenCalledOnce();
		const [url] = mockFetch.mock.calls[0];
		expect(url).toContain('/api/v1/catalog/titles?search=Gatsby&language=en&page=0&size=10');
	});

	it('fetches catalog title detail by slug', async () => {
		const mockTitleDetail = {
			id: 'title-1',
			slug: 'the-great-gatsby',
			title: 'The Great Gatsby',
			subtitle: 'A Novel',
			description: 'A story of classic American literature.',
			language: 'en',
			contributors: [
				{ id: 'contrib-1', name: 'F. Scott Fitzgerald', role: 'AUTHOR', bio: 'American novelist' }
			],
			editions: [
				{
					id: 'ed-1',
					isbn: '9780743273565',
					format: 'EPUB',
					editionNumber: 1,
					publisherId: 'pub-1',
					publishedDate: '1925-04-10',
					status: 'PUBLISHED',
					prices: [{ currency: 'USD', amountInCents: 999, territory: 'WORLD' }],
					availability: [{ territory: 'WORLD', isAvailable: true }]
				}
			]
		};

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'application/json' }),
			json: vi.fn().mockResolvedValue(mockTitleDetail)
		});
		vi.stubGlobal('fetch', mockFetch);

		const result = await fetchCatalogTitleBySlug('the-great-gatsby');

		expect(result).toEqual(mockTitleDetail);
		expect(mockFetch).toHaveBeenCalledOnce();
		const [url] = mockFetch.mock.calls[0];
		expect(url).toContain('/api/v1/catalog/titles/the-great-gatsby');
	});

	it('fetches edition detail by edition ID', async () => {
		const mockEdition = {
			id: 'ed-1',
			isbn: '9780743273565',
			format: 'EPUB',
			editionNumber: 1,
			publisherId: 'pub-1',
			publishedDate: '1925-04-10',
			status: 'PUBLISHED',
			prices: [{ currency: 'USD', amountInCents: 999, territory: 'WORLD' }],
			availability: [{ territory: 'WORLD', isAvailable: true }]
		};

		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			headers: new Headers({ 'Content-Type': 'application/json' }),
			json: vi.fn().mockResolvedValue(mockEdition)
		});
		vi.stubGlobal('fetch', mockFetch);

		const result = await fetchCatalogEditionById('ed-1');

		expect(result).toEqual(mockEdition);
		expect(mockFetch).toHaveBeenCalledOnce();
		const [url] = mockFetch.mock.calls[0];
		expect(url).toContain('/api/v1/catalog/editions/ed-1');
	});

	it('throws ApiOfflineError when fetch fails due to network error', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

		await expect(fetchCatalogTitles()).rejects.toThrow(ApiOfflineError);
		await expect(fetchCatalogTitleBySlug('unknown')).rejects.toThrow(ApiOfflineError);
	});

	it('throws ApiError on 404 Not Found', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
				headers: new Headers({ 'Content-Type': 'application/problem+json' }),
				json: vi.fn().mockResolvedValue({ status: 404, title: 'Title Not Found' })
			})
		);

		await expect(fetchCatalogTitleBySlug('nonexistent')).rejects.toThrow(ApiError);
	});

	it('parses HTML error pages into a clean human-readable ApiError without leaking HTML text', async () => {
		const htmlPayload =
			'<!DOCTYPE html><html><head><title>500 Internal Server Error</title></head><body><h1>Server Error</h1><p>Stack trace...</p></body></html>';
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				statusText: 'Internal Server Error',
				headers: new Headers({ 'Content-Type': 'text/html' }),
				text: vi.fn().mockResolvedValue(htmlPayload)
			})
		);

		try {
			await fetchCatalogTitles();
			expect.unreachable('Should have thrown ApiError');
		} catch (err) {
			expect(err).toBeInstanceOf(ApiError);
			const apiErr = err as ApiError;
			expect(apiErr.message).toBe('Server error: 500 Internal Server Error');
			expect(apiErr.message).not.toContain('<!DOCTYPE');
			expect(apiErr.message).not.toContain('<p>');
		}
	});

	it('throws ApiError when 200 OK returns an HTML page instead of JSON', async () => {
		const htmlPayload = '<!DOCTYPE html><html><body>Single Page App Fallback</body></html>';
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				headers: new Headers({ 'Content-Type': 'text/html' }),
				text: vi.fn().mockResolvedValue(htmlPayload)
			})
		);

		await expect(fetchCatalogTitles()).rejects.toThrow(ApiError);
	});
});
