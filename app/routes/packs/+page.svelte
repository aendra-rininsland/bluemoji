<script lang="ts">
  import { callXrpc, getViewer } from '$hatk/client'
  import { invalidateAll } from '$app/navigation'

  let { data } = $props()

  let showCreate = $state(false)
  let name = $state('')
  let description = $state('')
  let adultOnly = $state(false)
  let iconFile = $state<File | null>(null)
  let loading = $state(false)
  let error = $state('')

  const viewer = $derived(data.viewer ?? getViewer())

  function packHref(uri: string): string {
    // at://did/blue.moji.packs.pack/rkey -> /packs/did/rkey
    const [, , did, , rkey] = uri.split('/')
    return `/packs/${did}/${rkey}`
  }

  async function createPack() {
    const v = viewer
    if (!v || !name.trim()) return
    loading = true
    error = ''
    try {
      let icon: unknown
      if (iconFile) {
        const { blob } = await callXrpc('dev.hatk.uploadBlob', iconFile)
        icon = blob
      }
      await callXrpc('dev.hatk.createRecord', {
        collection: 'blue.moji.packs.pack',
        repo: v.did,
        record: {
          $type: 'blue.moji.packs.pack',
          name: name.trim(),
          description: description.trim() || undefined,
          adultOnly,
          ...(icon ? { icon } : {}),
          createdAt: new Date().toISOString(),
        },
      })
      name = ''
      description = ''
      adultOnly = false
      iconFile = null
      showCreate = false
      await invalidateAll()
    } catch (e: any) {
      error = e.message ?? 'Failed to create pack'
    } finally {
      loading = false
    }
  }
</script>

<main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
    <h1>
      <a href="/" style="color: inherit;">bluemoji</a>
      <span style="color: var(--muted); font-weight: 400;"> › my packs</span>
    </h1>
    <button
      onclick={() => (showCreate = !showCreate)}
      style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
    >
      {showCreate ? 'Cancel' : '+ New pack'}
    </button>
  </div>

  {#if showCreate}
    <form
      onsubmit={(e) => { e.preventDefault(); createPack() }}
      style="display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem;"
    >
      <div>
        <label for="pack-name" style="display: block; margin-bottom: 0.375rem; font-weight: 500;">Pack name</label>
        <input
          id="pack-name"
          type="text"
          bind:value={name}
          maxlength="64"
          required
          placeholder="My favourite blobs"
          style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
        />
      </div>
      <div>
        <label for="pack-desc" style="display: block; margin-bottom: 0.375rem; font-weight: 500;">
          Description <span style="font-weight: 400; color: var(--muted);">(optional)</span>
        </label>
        <textarea
          id="pack-desc"
          bind:value={description}
          rows="2"
          maxlength="300"
          style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); resize: vertical;"
        ></textarea>
      </div>
      <div>
        <label for="pack-icon" style="display: block; margin-bottom: 0.375rem; font-weight: 500;">
          Icon <span style="font-weight: 400; color: var(--muted);">(optional, PNG/JPEG)</span>
        </label>
        <input
          id="pack-icon"
          type="file"
          accept="image/png,image/jpeg"
          onchange={(e) => (iconFile = (e.target as HTMLInputElement).files?.[0] ?? null)}
        />
      </div>
      <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none;">
        <input type="checkbox" bind:checked={adultOnly} />
        Mark as adult-only content
      </label>
      <div>
        <button
          type="submit"
          disabled={loading || !name.trim()}
          style="padding: 0.5rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer; opacity: {loading || !name.trim() ? 0.5 : 1};"
        >
          {loading ? 'Creating…' : 'Create pack'}
        </button>
      </div>
      {#if error}
        <p style="color: red;">{error}</p>
      {/if}
    </form>
  {/if}

  {#if data.packs.length === 0 && !showCreate}
    <div style="text-align: center; padding: 4rem 2rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">
      <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">No packs yet</p>
      <p style="margin-bottom: 1.5rem; font-size: 0.875rem;">
        Packs are shareable, curated groups of Bluemoji — like starter packs, but for emoji.
      </p>
      <button
        onclick={() => (showCreate = true)}
        style="padding: 0.5rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer;"
      >
        Create your first pack
      </button>
    </div>
  {:else}
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      {#each data.packs as pack (pack.uri)}
        <a
          href={packHref(pack.uri)}
          style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--text);"
        >
          {#if pack.avatar}
            <img src={pack.avatar} alt="" width="48" height="48" style="border-radius: 8px; object-fit: cover;" />
          {:else}
            <div style="width: 48px; height: 48px; border-radius: 8px; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
              📦
            </div>
          {/if}
          <div style="flex: 1; min-width: 0;">
            <p style="font-weight: 600;">{pack.name}</p>
            {#if pack.description}
              <p style="font-size: 0.875rem; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {pack.description}
              </p>
            {/if}
          </div>
          <span style="color: var(--muted); font-size: 0.875rem; white-space: nowrap;">
            {pack.itemCount ?? 0} emoji{(pack.itemCount ?? 0) === 1 ? '' : 's'}
          </span>
        </a>
      {/each}
    </div>
  {/if}
</main>
