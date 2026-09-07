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
		ShieldCheck,
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
			<!-- Book Hero Header -->
			<div class="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
				<div
					class="mx-auto sm:mx-0 flex h-56 w-40 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-gradient-to-br from-[#0D5C63] to-[#094a50] p-4 text-center text-white shadow-md"
				>
					<span class="text-6xl font-bold">{titleDetail.title.charAt(0).toUpperCase()}</span>
				</div>

				<div class="flex-1 space-y-2 text-center sm:text-left">
					<div class="flex items-center justify-center gap-2 sm:justify-start">
						{#if titleDetail.language}
							<span
								class="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
							>
								<Globe class="h-3 w-3" />
								{titleDetail.language.toUpperCase()}
							</span>
						{/if}
					</div>

					<h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
						{titleDetail.title}
					</h1>

					{#if authorNames}
						<p class="text-base font-semibold text-foreground/90 sm:text-lg">
							by <span class="text-primary">{authorNames}</span>
						</p>
					{/if}

					{#if titleDetail.description}
						<p class="pt-2 text-sm leading-relaxed text-foreground/90">
							{titleDetail.description}
						</p>
					{/if}

					<!-- Price Tag & Purchasing Action Bar -->
					<div
						class="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs"
					>
						<div>
							<div class="text-2xl font-bold tracking-tight text-foreground">
								{heroPrice}
							</div>
							<p class="text-xs text-muted-foreground">Digital EPUB · DRM-Free · Instant Access</p>
						</div>

						<Button class="cursor-pointer gap-2 bg-[#0D5C63] text-white hover:bg-[#094a50]">
							<ShoppingBag class="h-4 w-4" />
							Buy Now ({heroPrice})
						</Button>
					</div>
				</div>
			</div>

			<!-- Contributors Section -->
			{#if titleDetail.contributors && titleDetail.contributors.length > 0}
				<section class="mt-8 border-t border-border pt-6">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
						<User class="h-5 w-5 text-primary" />
						Contributors
					</h2>
					<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
						{#each titleDetail.contributors as contrib (contrib.id)}
							<div class="rounded-lg border border-border bg-card p-3 shadow-sm">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-semibold text-foreground">{contrib.name}</h3>
									<span
										class="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground uppercase"
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

			<!-- Available Editions Section -->
			{#if titleDetail.editions && titleDetail.editions.length > 0}
				<section class="mt-8 border-t border-border pt-6">
					<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
						<Tag class="h-5 w-5 text-primary" />
						Available Editions ({titleDetail.editions.length})
					</h2>

					<div class="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
						{#each titleDetail.editions as ed (ed.id)}
							<div
								class="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
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

								<div class="flex items-center justify-between border-t border-border/50 pt-3">
									{#if ed.prices && ed.prices.length > 0}
										<div>
											{#each ed.prices as price (price.currency + price.territory)}
												<div class="text-lg font-bold tracking-tight text-foreground">
													{formatPrice(price.amountInCents, price.currency)}
												</div>
												<span class="text-[10px] text-muted-foreground uppercase"
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

			<!-- Privacy & Local-First Reader Notice -->
			<section class="mt-8 rounded-xl border border-border bg-muted/40 p-4">
				<div class="flex items-start gap-3">
					<ShieldCheck class="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
					<div class="text-xs text-muted-foreground">
						<h3 class="mb-0.5 text-sm font-semibold text-foreground">
							Local-First Anonymous Reading
						</h3>
						<p>
							Granthalay preserves your privacy. Personal EPUB imports, bookmarks, highlights, and
							reading history stay exclusively on your local device.
						</p>
					</div>
				</div>
			</section>
		{/if}
	</main>

	<LibraryBottomBar active="store" />
</div>
