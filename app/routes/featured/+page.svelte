<script lang="ts">
  import { callXrpc } from '$hatk/client'
  import { invalidateAll } from '$app/navigation'

  let { data } = $props()

  let uriInput = $state('')
  let busy = $state<string | null>(null)
  let error = $state('')

  function packHref(uri: string): string {
    // at://did/blue.moji.packs.pack/rkey -> /packs/did/rkey
    const [, , did, , rkey] = uri.split('/')
    return `/packs/${did}/${rkey}`
  }

  async function setFeatured(uri: string, featured: boolean) {
    busy = uri
    error = ''
    try {
      await callXrpc('blue.moji.featured.setFeatured', { uri, featured })
      if (featured) uriInput = ''
      await invalidateAll()
    } catch (e: any) {
      error = e.message ?? 'Failed to update featured'
    } finally {
      busy = null
    }
  }

  // Featured URIs that no longer resolve (record deleted, account taken down)
  // are hidden from everyone, but admins can still see and remove them.
  const shown = $derived(
    new Set([...data.emoji, ...data.stickers, ...data.packs].map((x: { uri: string }) => x.uri)),
  )
  const orphaned = $derived(data.featuredUris.filter((u: string) => !shown.has(u)))
</script>

<svelte:head>
  <title>Featured — moji.blue</title>
  <meta name="description" content="Bluemoji emoji, stickers and packs hand-picked by the moji.blue team." />
</svelte:head>

<main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 0.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › featured</span>
  </h1>
  <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
    Emoji, stickers and packs hand-picked by the moji.blue team.
  </p>

  {#if data.viewerIsAdmin}
    <form
      onsubmit={(e) => { e.preventDefault(); if (uriInput.trim()) setFeatured(uriInput.trim(), true) }}
      style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;"
    >
      <input
        bind:value={uriInput}
        placeholder="at:// URI of an emoji, sticker or pack to feature"
        style="flex: 1; min-width: 16rem; padding: 0.375rem 0.625rem; border: 1px solid var(--border); border-radius: 4px; font-family: var(--mono); font-size: 0.8125rem;"
      />
      <button
        type="submit"
        disabled={busy !== null || !uriInput.trim()}
        style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
      >
        Feature
      </button>
    </form>
    {#if error}
      <p style="color: #c00; font-size: 0.875rem; margin-bottom: 1rem;">{error}</p>
    {/if}
  {/if}

  {#if data.emoji.length + data.stickers.length + data.packs.length === 0}
    <div style="text-align: center; padding: 4rem 2rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">
      <p>Nothing featured yet.</p>
    </div>
  {/if}

  {#snippet unfeature(uri: string)}
    {#if data.viewerIsAdmin}
      <button
        onclick={() => setFeatured(uri, false)}
        disabled={busy !== null}
        style="font-size: 0.6875rem; padding: 0.125rem 0.5rem; border: none; background: none; color: var(--muted); cursor: pointer; text-decoration: underline;"
      >
        {busy === uri ? 'Removing…' : '★ Unfeature'}
      </button>
    {/if}
  {/snippet}

  {#snippet itemGrid(items: any[], size: number)}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax({size + 66}px, 1fr)); gap: 0.75rem; margin-bottom: 2rem;">
      {#each items as item (item.uri)}
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border); border-radius: 8px;">
          <div style="width: {size}px; height: {size}px; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px; border-radius: 4px; overflow: hidden;">
            {#if item.imageUrl}
              <img src={item.imageUrl} alt={item.alt || item.name} width={size} height={size} style="object-fit: contain; width: 100%; height: 100%;" />
            {:else}
              <span style="font-size: 1.5rem; color: var(--muted);">?</span>
            {/if}
          </div>
          <span style="font-family: var(--mono); font-size: 0.75rem; text-align: center; word-break: break-all; line-height: 1.3;">{item.name}</span>
          {#if item.adultOnly}
            <span style="font-size: 0.625rem; padding: 0.125rem 0.375rem; background: var(--border); color: var(--muted); border-radius: 999px;">18+</span>
          {/if}
          {@render unfeature(item.uri)}
        </div>
      {/each}
    </div>
  {/snippet}

  {#if data.packs.length > 0}
    <h2 style="margin-bottom: 0.75rem;">Packs</h2>
    <div style="display: grid; gap: 0.75rem; margin-bottom: 2rem;">
      {#each data.packs as pack (pack.uri)}
        <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px;">
          <a href={packHref(pack.uri)} style="display: flex; align-items: center; gap: 0.75rem; flex: 1; color: inherit; text-decoration: none;">
            {#if pack.avatar}
              <img src={pack.avatar} alt="" width="48" height="48" style="border-radius: 8px; object-fit: cover;" />
            {/if}
            <div>
              <p style="font-weight: 600;">{pack.name}</p>
              {#if pack.description}
                <p style="font-size: 0.8125rem; color: var(--muted);">{pack.description}</p>
              {/if}
              <p style="font-size: 0.75rem; color: var(--muted);">{pack.itemCount ?? 0} emoji</p>
            </div>
          </a>
          {@render unfeature(pack.uri)}
        </div>
      {/each}
    </div>
  {/if}

  {#if data.stickers.length > 0}
    <h2 style="margin-bottom: 0.75rem;">Stickers</h2>
    {@render itemGrid(data.stickers, 128)}
  {/if}

  {#if data.emoji.length > 0}
    <h2 style="margin-bottom: 0.75rem;">Emoji</h2>
    {@render itemGrid(data.emoji, 64)}
  {/if}

  {#if data.viewerIsAdmin && orphaned.length > 0}
    <h2 style="margin-bottom: 0.75rem;">Unavailable (admin only)</h2>
    <p style="color: var(--muted); font-size: 0.8125rem; margin-bottom: 0.5rem;">
      These no longer resolve — the record was deleted or its account taken down.
    </p>
    {#each orphaned as uri (uri)}
      <div style="display: flex; gap: 0.75rem; align-items: center; font-family: var(--mono); font-size: 0.75rem; margin-bottom: 0.25rem;">
        <span style="word-break: break-all;">{uri}</span>
        {@render unfeature(uri)}
      </div>
    {/each}
  {/if}
</main>
