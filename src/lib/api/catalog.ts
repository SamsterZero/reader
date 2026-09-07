import { apiFetch } from './client';

export interface CatalogTitleSummary {
	id: string;
	slug: string;
	title: string;
	subtitle?: string;
	language: string;
	primaryAuthorName?: string;
	price?: string;
}

export interface CatalogContributor {
	id: string;
	name: string;
	role: string;
	bio?: string;
}

export interface EditionPrice {
	currency: string;
	amountInCents: number;
	territory: string;
}

export interface EditionAvailability {
	territory: string;
	isAvailable: boolean;
	availableFrom?: string;
	availableUntil?: string;
}

export interface CatalogEdition {
	id: string;
	isbn?: string;
	format: string;
	editionNumber: number;
	publisherId?: string;
	publishedDate?: string;
	status: string;
	prices: EditionPrice[];
	availability: EditionAvailability[];
}

export interface CatalogTitleDetail {
	id: string;
	slug: string;
	title: string;
	subtitle?: string;
	description?: string;
	language: string;
	contributors: CatalogContributor[];
	editions: CatalogEdition[];
}

export interface CatalogTitlePage {
	content: CatalogTitleSummary[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
}

export interface FetchCatalogTitlesParams {
	search?: string;
	language?: string;
	page?: number;
	size?: number;
}

export async function fetchCatalogTitles(
	params: FetchCatalogTitlesParams = {}
): Promise<CatalogTitlePage> {
	const query = new URLSearchParams();
	if (params.search) {
		query.set('search', params.search);
	}
	if (params.language) {
		query.set('language', params.language);
	}
	if (params.page !== undefined) {
		query.set('page', params.page.toString());
	}
	if (params.size !== undefined) {
		query.set('size', params.size.toString());
	}

	const queryString = query.toString();
	const endpoint = `/catalog/titles${queryString ? `?${queryString}` : ''}`;
	return apiFetch<CatalogTitlePage>(endpoint);
}

export async function fetchCatalogTitleBySlug(slug: string): Promise<CatalogTitleDetail> {
	return apiFetch<CatalogTitleDetail>(`/catalog/titles/${encodeURIComponent(slug)}`);
}

export async function fetchCatalogEditionById(editionId: string): Promise<CatalogEdition> {
	return apiFetch<CatalogEdition>(`/catalog/editions/${encodeURIComponent(editionId)}`);
}
