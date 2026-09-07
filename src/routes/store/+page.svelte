<script lang="ts">
	import { onMount } from 'svelte';
	import {
		BookOpen,
		Globe,
		Search,
		WifiOff,
		RefreshCw,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import TopBar from '$lib/components/library/TopBar.svelte';
	import LibraryBottomBar from '$lib/components/library/LibraryBottomBar.svelte';
	import StoreBookCard from '$lib/components/library/StoreBookCard.svelte';
	import { AspectRatio } from '$lib/components/ui/aspect-ratio';
	import { Button } from '$lib/components/ui/button';
	import { fetchCatalogTitles, type CatalogTitleSummary } from '$lib/api/catalog';
	import { ApiOfflineError } from '$lib/api/client';

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => void;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	let titles = $state<CatalogTitleSummary[]>([]);
	let page = $state(0);
	let size = $state(12);
	let totalPages = $state(0);
	let totalElements = $state(0);

	let searchQuery = $state('');
	let selectedLanguage = $state('');
	let loading = $state(true);
	let isOffline = $state(false);
	let errorMessage = $state<string | null>(null);

	let darkMode = $state(false);
	let showInstall = $state(false);
	let installPrompt = $state<BeforeInstallPromptEvent | null>(null);

	const languages = [
		{ code: '', label: 'All Languages' },
		{ code: 'en', label: 'English' },
		{ code: 'es', label: 'Spanish' },
		{ code: 'fr', label: 'French' },
		{ code: 'de', label: 'German' },
		{ code: 'hi', label: 'Hindi' }
	];

	function toggleDarkMode() {
		darkMode = !darkMode;
		if (darkMode) {
			document.documentElement.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			document.documentElement.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}

	async function handleInstall() {
		if (!installPrompt) return;
		installPrompt.prompt();
		const { outcome } = await installPrompt.userChoice;
		if (outcome === 'accepted') {
			showInstall = false;
			installPrompt = null;
		}
	}

	async function loadTitles(targetPage = 0) {
		loading = true;
		errorMessage = null;
		isOffline = false;

		try {
			const res = await fetchCatalogTitles({
				search: searchQuery.trim() || undefined,
				language: selectedLanguage || undefined,
				page: targetPage,
				size
			});
			titles = res.content || [];
			page = res.page ?? 0;
			totalPages = res.totalPages ?? 0;
			totalElements = res.totalElements ?? 0;
		} catch (err) {
			if (err instanceof ApiOfflineError) {
				isOffline = true;
			} else {
				errorMessage = err instanceof Error ? err.message : 'Failed to load catalog titles.';
			}
			titles = [];
		} finally {
			loading = false;
		}
	}

	function handleSearchSubmit(e: SubmitEvent) {
		e.preventDefault();
		loadTitles(0);
	}

	function handleLanguageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedLanguage = target.value;
		loadTitles(0);
	}

	function goToPage(newPage: number) {
		if (newPage >= 0 && newPage < totalPages) {
			loadTitles(newPage);
		}
	}

	onMount(() => {
		const savedTheme = localStorage.getItem('theme');
		darkMode =
			savedTheme === 'dark' ||
			(!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
		if (darkMode) {
			document.documentElement.classList.add('dark');
		}

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			installPrompt = e as BeforeInstallPromptEvent;
			showInstall = true;
		});

		loadTitles(0);
	});
</script>

<svelte:head>
	<title>Storefront - Granthalay Catalog</title>
	<meta name="description" content="Browse published catalog titles and editions on Granthalay" />
</svelte:head>

<div
	class="min-h-screen bg-background pb-24 font-sans text-foreground transition-colors duration-300"
>
	<header
		class="sticky top-0 z-30 border-b border-border/40 bg-background/80 px-4 pt-4 pb-3 backdrop-blur-md"
	>
		<div class="w-full">
			<TopBar {darkMode} {showInstall} onTheme={toggleDarkMode} onInstall={handleInstall} />

			<!-- Search and Filter Bar -->
			<form onsubmit={handleSearchSubmit} class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div class="relative flex-1">
					<Search
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden="true"
					/>
					<input
						type="search"
						placeholder="Search title or author..."
						bind:value={searchQuery}
						class="w-full rounded-md border border-input bg-background py-2 pr-4 pl-9 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					/>
				</div>

				<div class="flex items-center gap-2">
					<div class="relative flex-1 sm:w-44">
						<Globe
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden="true"
						/>
						<select
							value={selectedLanguage}
							onchange={handleLanguageChange}
							class="w-full rounded-md border border-input bg-background py-2 pr-4 pl-9 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
							aria-label="Filter by language"
						>
							{#each languages as lang (lang.code)}
								<option value={lang.code}>{lang.label}</option>
							{/each}
						</select>
					</div>

					<Button type="submit" size="default" disabled={loading}>Search</Button>
				</div>
			</form>
		</div>
	</header>

	<main class="w-full px-4 py-4">
		{#if isOffline}
			<div
				class="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
			>
				<div class="flex items-start gap-3">
					<WifiOff
						class="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
						aria-hidden="true"
					/>
					<div class="flex-1 text-sm">
						<h2 class="font-semibold text-amber-950 dark:text-amber-100">Store Offline</h2>
						<p class="mt-1">
							Unable to connect to the store. Your saved library books remain available offline.
						</p>
						<div class="mt-3">
							<Button
								variant="outline"
								size="sm"
								class="border-amber-600/40 text-amber-950 hover:bg-amber-500/20 dark:text-amber-100"
								onclick={() => loadTitles(page)}
							>
								<RefreshCw class="mr-2 h-3.5 w-3.5" />
								Retry Connection
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if errorMessage}
			<div
				class="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive"
			>
				<p class="text-sm font-medium">{errorMessage}</p>
				<Button variant="outline" size="sm" class="mt-3" onclick={() => loadTitles(page)}>
					<RefreshCw class="mr-2 h-3.5 w-3.5" />
					Retry
				</Button>
			</div>
		{/if}

		<!-- Content Listing -->
		{#if loading}
			<div
				class="3xl:grid-cols-8 4xl:grid-cols-9 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
			>
				{#each [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as i (i)}
					<div class="group">
						<AspectRatio
							ratio={2 / 3}
							class="relative animate-pulse overflow-hidden rounded-xl bg-muted shadow-xs"
						/>
					</div>
				{/each}
			</div>
		{:else if titles.length === 0 && !isOffline}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<BookOpen class="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
				<h3 class="mt-4 text-base font-semibold text-foreground">No Catalog Titles Found</h3>
				<p class="mt-1 max-w-sm text-sm text-muted-foreground">
					We couldn't find any catalog books matching your search or filters. Try adjusting your
					search query or language filter.
				</p>
			</div>
		{:else if titles.length > 0}
			<div
				class="3xl:grid-cols-8 4xl:grid-cols-9 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
			>
				{#each titles as item (item.id)}
					<StoreBookCard
						slug={item.slug}
						title={item.title}
						subtitle={item.subtitle}
						author={item.primaryAuthorName}
						language={item.language}
						price={item.price}
					/>
				{/each}
			</div>
		{/if}

		<!-- Pagination Bar -->
		{#if totalPages > 1}
			<div
				class="mt-8 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground"
			>
				<span>
					Page {page + 1} of {totalPages} ({totalElements} titles)
				</span>

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 0}
						onclick={() => goToPage(page - 1)}
						aria-label="Previous Page"
					>
						<ChevronLeft class="mr-1 h-4 w-4" />
						Previous
					</Button>

					<Button
						variant="outline"
						size="sm"
						disabled={page >= totalPages - 1}
						onclick={() => goToPage(page + 1)}
						aria-label="Next Page"
					>
						Next
						<ChevronRight class="ml-1 h-4 w-4" />
					</Button>
				</div>
			</div>
		{/if}
	</main>

	<LibraryBottomBar active="store" />
</div>
