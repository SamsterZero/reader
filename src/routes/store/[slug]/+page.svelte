<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import {
		ArrowLeft,
		BookOpen,
		Calendar,
		CheckCircle2,
		Globe,
		RefreshCw,
		ShoppingBag,
		Tag,
		User,
		WifiOff
	} from 'lucide-svelte';
	import TopBar from '$lib/components/library/TopBar.svelte';
	import LibraryBottomBar from '$lib/components/library/LibraryBottomBar.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		fetchCatalogTitleBySlug,
		getTitleDisplayPrice,
		type CatalogTitleDetail
	} from '$lib/api/catalog';
	import { ApiError, ApiOfflineError } from '$lib/api/client';

	interface BeforeInstallPromptEvent extends Event {
		prompt: () => void;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	const slug = $derived(page.params.slug || '');

	let titleDetail = $state<CatalogTitleDetail | null>(null);
	const authorNames = $derived(
		titleDetail?.contributors
			?.filter((c) => c.role.toUpperCase() === 'AUTHOR')
			?.map((c) => c.name)
			?.join(', ') || ''
	);
	const heroPrice = $derived.by(() => {
		if (!titleDetail?.editions?.length) {
			return getTitleDisplayPrice({ slug });
		}
		const firstPrice = titleDetail.editions[0]?.prices?.[0];
		if (firstPrice) {
			return formatPrice(firstPrice.amountInCents, firstPrice.currency);
		}
		return getTitleDisplayPrice({ slug });
	});
	let loading = $state(true);
	let isOffline = $state(false);
	let notFound = $state(false);
	let errorMessage = $state<string | null>(null);

	let darkMode = $state(false);
	let showInstall = $state(false);
	let installPrompt = $state<BeforeInstallPromptEvent | null>(null);

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

	async function loadDetail() {
		if (!slug) return;
		loading = true;
		errorMessage = null;
		isOffline = false;
		notFound = false;

		try {
			titleDetail = await fetchCatalogTitleBySlug(slug);
		} catch (err) {
			if (err instanceof ApiOfflineError) {
				isOffline = true;
			} else if (err instanceof ApiError && err.status === 404) {
				notFound = true;
			} else {
				errorMessage = err instanceof Error ? err.message : 'Failed to load catalog title details.';
			}
			titleDetail = null;
		} finally {
			loading = false;
		}
	}

	function formatPrice(amountInCents: number, currency: string): string {
		const amount = amountInCents / 100;
		try {
			return new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: currency || 'USD'
			}).format(amount);
		} catch {
			return `${currency} ${amount.toFixed(2)}`;
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

		loadDetail();
	});
</script>

<svelte:head>
	<title>{titleDetail ? titleDetail.title : 'Book Details'} - Granthalay Store</title>
	<meta name="description" content={titleDetail?.description || 'Catalog title details'} />
</svelte:head>

<div
	class="min-h-screen bg-background pb-24 font-sans text-foreground transition-colors duration-300"
>
	<header
		class="sticky top-0 z-30 border-b border-border/40 bg-background/80 px-4 py-3 backdrop-blur-md"
	>
		<div class="w-full [&_nav]:mb-0">
			<TopBar {darkMode} {showInstall} onTheme={toggleDarkMode} onInstall={handleInstall} />
		</div>
	</header>

	<main class="w-full px-4 py-4">
		<div class="mb-6">
			<Button
				variant="ghost"
				size="sm"
				class="gap-1 pl-1 text-muted-foreground hover:text-foreground"
				onclick={() => goto('/store')}
			>
				<ArrowLeft class="h-4 w-4" />
				Back to Storefront
			</Button>
		</div>

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
						<h2 class="font-semibold text-amber-950 dark:text-amber-100">
							Store Offline
						</h2>
						<p class="mt-1">
							Unable to connect to the store. Your saved library books remain available offline.
						</p>
						<div class="mt-3 flex gap-2">
							<Button variant="outline" size="sm" onclick={loadDetail}>
								<RefreshCw class="mr-2 h-3.5 w-3.5" />
								Retry
							</Button>
							<Button variant="ghost" size="sm" onclick={() => goto('/')}>Go to Library</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if notFound}
			<div
				class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center"
			>
				<BookOpen class="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
				<h2 class="mt-4 text-lg font-semibold text-foreground">Catalog Title Not Found</h2>
				<p class="mt-1 max-w-sm text-sm text-muted-foreground">
					The book title with slug "<code class="text-primary">{slug}</code>" could not be found in
					the store catalog.
				</p>
				<Button class="mt-4" size="sm" onclick={() => goto('/store')}>Return to Storefront</Button>
			</div>
		{/if}

		{#if errorMessage}
			<div
				class="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-destructive"
			>
				<p class="text-sm font-medium">{errorMessage}</p>
				<Button variant="outline" size="sm" class="mt-3" onclick={loadDetail}>
					<RefreshCw class="mr-2 h-3.5 w-3.5" />
					Retry
				</Button>
			</div>
		{/if}

		{#if loading}
			<div class="animate-pulse space-y-6">
				<div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
					<div class="mx-auto sm:mx-0 h-56 w-40 shrink-0 rounded-xl bg-muted"></div>
					<div class="w-full flex-1 space-y-3">
						<div class="mx-auto sm:mx-0 h-6 w-3/4 rounded bg-muted"></div>
						<div class="mx-auto sm:mx-0 h-4 w-1/2 rounded bg-muted"></div>
						<div class="h-20 w-full rounded bg-muted"></div>
					</div>
				</div>
			</div>
		{:else if titleDetail}
			<div class="space-y-10">
				<!-- Hero Block: Integrated Cover Artwork + Title, Author, Description & Price Action -->
				<div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start md:gap-8 lg:gap-10">
					<!-- Cover Artwork -->
					<div
						class="flex aspect-[2/3] w-44 shrink-0 max-w-[260px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#0D5C63] to-[#094a50] p-6 text-center text-white shadow-xl transition-all duration-300 hover:shadow-2xl sm:w-52 lg:w-60"
					>
						<span class="text-7xl font-bold lg:text-8xl"
							>{titleDetail.title.charAt(0).toUpperCase()}</span
						>
					</div>

					<!-- Title, Author, Badges, Description & Purchase Action -->
					<div class="w-full flex-1 space-y-4 text-center sm:text-left">
						<!-- Title & Author -->
						<div class="space-y-2">
							<h1 class="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
								{titleDetail.title}
							</h1>

							{#if authorNames}
								<p class="text-lg font-semibold text-foreground/90 sm:text-xl">
									by <span class="text-primary">{authorNames}</span>
								</p>
							{/if}
						</div>

						<!-- Metadata Badges -->
						<div class="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
							{#if titleDetail.language}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
								>
									<Globe class="h-3.5 w-3.5" />
									{titleDetail.language.toUpperCase()}
								</span>
							{/if}
							<span
								class="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
							>
								<CheckCircle2 class="h-3.5 w-3.5" />
								DRM-Free EPUB
							</span>
						</div>

						<!-- Description -->
						{#if titleDetail.description}
							<p class="max-w-4xl text-sm leading-relaxed text-foreground/90 sm:text-base">
								{titleDetail.description}
							</p>
						{/if}

						<!-- Price & Purchase Action -->
						<div class="pt-2">
							<div
								class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-start"
							>
								<div class="flex items-baseline gap-2 text-center sm:text-left">
									<span class="text-3xl font-bold tracking-tight text-foreground lg:text-4xl">
										{heroPrice}
									</span>
									<span class="text-xs font-medium text-muted-foreground">
										(Digital EPUB · DRM-Free)
									</span>
								</div>

								<Button
									size="lg"
									class="w-full cursor-pointer gap-2 bg-[#0D5C63] px-8 text-white shadow-md hover:bg-[#094a50] sm:w-auto"
								>
									<ShoppingBag class="h-5 w-5" />
									Buy Now
								</Button>
							</div>
						</div>
					</div>
				</div>

				<!-- Available Editions Section (Option 3: Horizontal Carousel Strip) -->
				{#if titleDetail.editions && titleDetail.editions.length > 0}
					<section class="space-y-4 pt-2">
						<h2 class="flex items-center gap-2 text-xl font-bold text-foreground">
							<Tag class="h-5 w-5 text-primary" />
							Available Editions ({titleDetail.editions.length})
						</h2>

						<div
							class="flex snap-x snap-mandatory overflow-x-auto gap-4 pb-4 pt-1 scrollbar-thin scrollbar-thumb-muted-foreground/20"
						>
							{#each titleDetail.editions as ed (ed.id)}
								<div
									class="flex w-72 shrink-0 snap-start flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
								>
									<div class="space-y-2">
										<div class="flex flex-wrap items-center gap-2">
											<span class="font-bold text-foreground">{ed.format}</span>
											<span
												class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
											>
												Edition #{ed.editionNumber}
											</span>
											<span
												class="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
											>
												DRM-Free
											</span>
										</div>

										{#if ed.publishedDate}
											<p class="flex items-center gap-1.5 text-xs text-muted-foreground">
												<Calendar class="h-3.5 w-3.5 text-muted-foreground/70" />
												Published {ed.publishedDate}
											</p>
										{/if}

										{#if ed.isbn}
											<p class="font-mono text-[11px] text-muted-foreground/70">
												ISBN {ed.isbn}
											</p>
										{/if}
									</div>

									<div class="flex items-center justify-between pt-1">
										{#if ed.prices && ed.prices.length > 0}
											<div>
												{#each ed.prices as price (price.currency + price.territory)}
													<div class="text-lg font-bold tracking-tight text-foreground">
														{formatPrice(price.amountInCents, price.currency)}
													</div>
													<span class="text-[10px] uppercase text-muted-foreground"
														>{price.territory}</span
													>
												{/each}
											</div>
										{/if}

										<Button size="sm" class="cursor-pointer bg-[#0D5C63] text-white hover:bg-[#094a50]">
											Get Edition
										</Button>
									</div>
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Contributors Section (Option 3: Horizontal Carousel Strip) -->
				{#if titleDetail.contributors && titleDetail.contributors.length > 0}
					<section class="space-y-4 pt-2">
						<h2 class="flex items-center gap-2 text-xl font-bold text-foreground">
							<User class="h-5 w-5 text-primary" />
							Contributors ({titleDetail.contributors.length})
						</h2>
						<div
							class="flex snap-x snap-mandatory overflow-x-auto gap-4 pb-4 pt-1 scrollbar-thin scrollbar-thumb-muted-foreground/20"
						>
							{#each titleDetail.contributors as contrib (contrib.id)}
								<div class="w-64 shrink-0 snap-start rounded-lg border border-border bg-card p-3.5 shadow-xs hover:border-primary/40 transition-all">
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-semibold text-foreground">{contrib.name}</h3>
										<span
											class="rounded bg-muted px-2 py-0.5 text-[11px] font-medium uppercase text-muted-foreground"
										>
											{contrib.role}
										</span>
									</div>
									{#if contrib.bio}
										<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{contrib.bio}</p>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}
			</div>
		{/if}
	</main>

	<LibraryBottomBar active="store" />
</div>
