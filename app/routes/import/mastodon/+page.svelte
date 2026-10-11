<script lang="ts">
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'
  import { addToPack, createPack } from '$lib/emoji-import'
  import { runImportQueue, type ItemStatus } from '$lib/import-runner'
  import { importMastodonEmoji } from '$lib/mastodon-import'
  import { packTargetProblem } from '$lib/packs'
  import ImportSettings from '$lib/components/ImportSettings.svelte'

  let { data, form } = $props()

  let query = $state('')
  let category = $state('')
  let showHidden = $state(false)
  let showImported = $state(true)
  let selected = $state(new Set<string>())
  let asSticker = $state(false)
  let adultOnly = $state(false)
  let packMode = $state<'none' | 'existing' | 'new'>('none')
  let packUri = $state('')
  let packName = $state('')
  let packDescription = $state('')
  let running = $state(false)
  let statuses = $state<Record<string, ItemStatus>>({})
  let connecting = $state(false)

  const categories = $derived([...new Set(data.emojis.map(e => e.category).filter(Boolean))].sort())

  const visible = $derived(
    data.emojis.filter(e => {
      if (!showHidden && !e.visible) return false
      if (!showImported && e.exists) return false
      if (category && e.category !== category) return false
      if (query && !e.shortcode.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  )
  const selectable = $derived(visible.filter(e => !e.problem))
  const doneCount = $derived(Object.values(statuses).filter(s => s.state === 'done').length)
  const failedCount = $derived(Object.values(statuses).filter(s => s.state === 'error').length)
  const total = $derived(Object.keys(statuses).length)
  const packProblem = $derived(
    packTargetProblem({ mode: packMode, uri: packUri, name: packName, description: packDescription })
  )
  const canImport = $derived(!running && selected.size > 0 && !packProblem)

  function toggle(code: string) {
    const next = new Set(selected)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    selected = next
  }
  function selectAllVisible() {
    selected = new Set([...selected, ...selectable.filter(e => !e.exists).map(e => e.shortcode)])
  }
  const img = (code: string, still = false) =>
    `/import/mastodon/image?shortcode=${encodeURIComponent(code)}${still ? '&static=1' : ''}`

  async function run() {
    const did = data.viewer.did
    const queue = data.emojis.filter(e => selected.has(e.shortcode))
    running = true
    statuses = {}
    const summary = await runImportQueue({
      did,
      items: queue.map(e => ({
        key: e.shortcode,
        run: () =>
          importMastodonEmoji({
            did,
            shortcode: e.shortcode,
            animated: e.animated,
            sticker: asSticker,
            adultOnly
          })
      })),
      pack: { mode: packMode, uri: packUri, name: packName, description: packDescription },
      adultOnly,
      createPack,
      addToPack,
      onStatus: (key, status) => (statuses[key] = status)
    })
    // Imported emoji leave the selection; failures stay selected so they can be retried
    selected = new Set([...selected].filter(code => !summary.done.includes(code)))
    running = false
    await invalidateAll()
  }
</script>

<main style="max-width: 960px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 0.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › <a href="/import" style="color: inherit;">import</a> › Mastodon</span>
  </h1>

  {#if data.error || form?.error}
    <p role="alert" style="color: var(--danger); margin: 0.75rem 0;">{form?.error ?? data.error}</p>
  {/if}

  {#if !data.mastodon}
    <p style="color: var(--muted); margin-bottom: 1.25rem;">
      Copy your Mastodon server's custom emoji into your own Bluemoji collection. Log in to your
      Mastodon account so we know which server to read from. Only administrators (or accounts with
      the “Manage Custom Emojis” permission) can import a server's emoji — we only ask for read-only access to
      your profile, and never post or change anything.
    </p>
    <form
      method="POST"
      action="?/connect"
      use:enhance={() => {
        connecting = true
        return async ({ update }) => {
          await update()
          connecting = false
        }
      }}
      style="display: flex; gap: 0.5rem; flex-wrap: wrap; max-width: 520px;"
    >
      <input
        name="domain"
        value={form?.domain ?? ''}
        placeholder="mastodon.social"
        aria-label="Mastodon server"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        required
        style="flex: 1; min-width: 0; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
      />
      <button
        disabled={connecting}
        style="padding: 0.5rem 1rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer;"
      >
        {connecting ? 'Connecting…' : 'Log in with Mastodon'}
      </button>
    </form>
    <p style="margin-top: 1.5rem; font-size: 0.875rem; color: var(--muted);">
      Only import emoji you have the right to reuse — many servers' emoji are artists' work.
      Imported emoji are copied into your own repo as new Bluemoji.
    </p>
  {:else}
    <div
      style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;"
    >
      <p>
        Connected as <strong>{data.mastodon.acct}</strong> ·
        <span style="color: var(--muted);">{data.emojis.length} custom emoji</span>
      </p>
      <form method="POST" action="?/disconnect" use:enhance>
        <button style="padding: 0.25rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; background: none; color: var(--text); cursor: pointer;">
          Disconnect
        </button>
      </form>
    </div>

    {#if data.emojis.length === 0}
      <p style="color: var(--muted);">This server has no custom emoji.</p>
    {:else}
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; margin-bottom: 0.75rem;">
        <input
          type="search"
          bind:value={query}
          placeholder="Filter by name…"
          aria-label="Filter by name"
          style="padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
        />
        {#if categories.length}
          <select bind:value={category} aria-label="Category" style="padding: 0.375rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);">
            <option value="">All categories</option>
            {#each categories as c (c)}<option value={c}>{c}</option>{/each}
          </select>
        {/if}
        <label><input type="checkbox" bind:checked={showHidden} /> Include hidden</label>
        <label><input type="checkbox" bind:checked={showImported} /> Show already imported</label>
        <button type="button" onclick={selectAllVisible} style="padding: 0.25rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; background: none; color: var(--text); cursor: pointer;">
          Select all shown
        </button>
        <button type="button" onclick={() => (selected = new Set())} disabled={!selected.size} style="padding: 0.25rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; background: none; color: var(--text); cursor: pointer;">
          Clear
        </button>
      </div>

      <ul
        style="list-style: none; padding: 0; margin: 0 0 1rem; display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 0.5rem;"
      >
        {#each visible as e (e.shortcode)}
          {@const st = statuses[e.shortcode]}
          <li>
            <label
              title={e.problem ?? (e.exists ? 'Already in your collection — importing replaces it' : e.shortcode)}
              style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem 0.25rem; border: 2px solid {selected.has(e.shortcode) ? 'var(--accent)' : 'var(--border)'}; border-radius: 6px; cursor: {e.problem ? 'not-allowed' : 'pointer'}; opacity: {e.problem ? 0.5 : 1}; height: 100%;"
            >
              <input
                type="checkbox"
                checked={selected.has(e.shortcode)}
                disabled={!!e.problem || running}
                onchange={() => toggle(e.shortcode)}
                style="align-self: flex-start;"
              />
              <img
                src={img(e.shortcode, true)}
                alt=""
                loading="lazy"
                width="48"
                height="48"
                style="width: 48px; height: 48px; object-fit: contain;"
              />
              <span style="font-family: var(--mono); font-size: 0.75rem; word-break: break-all; text-align: center;">
                :{e.shortcode}:
              </span>
              <span style="font-size: 0.6875rem; color: var(--muted);">
                {#if st?.state === 'working'}importing…
                {:else if st?.state === 'done'}✓ done{st.message ? ' (!)' : ''}
                {:else if st?.state === 'error'}✗ failed
                {:else if e.problem}can't import
                {:else if e.exists}already imported
                {:else if e.animated}animated{/if}
              </span>
            </label>
          </li>
        {/each}
      </ul>
      {#if !visible.length}<p style="color: var(--muted);">No emoji match your filters.</p>{/if}

      <section
        style="position: sticky; bottom: 0; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;"
      >
        <ImportSettings
          packs={data.packs}
          disabled={running}
          bind:sticker={asSticker}
          bind:adultOnly
          bind:packMode
          bind:packUri
          bind:packName
          bind:packDescription
        />

        <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
          <button
            type="button"
            onclick={run}
            disabled={!canImport}
            style="padding: 0.5rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer; opacity: {canImport ? 1 : 0.5};"
          >
            {running ? 'Importing…' : `Import ${selected.size} emoji`}
          </button>
          {#if total}
            <span aria-live="polite" style="font-size: 0.875rem; color: var(--muted);">
              {doneCount}/{total} imported{failedCount ? `, ${failedCount} failed` : ''}
            </span>
          {/if}
        </div>

        {#if failedCount || Object.values(statuses).some(s => s.state === 'done' && s.message)}
          <ul style="font-size: 0.8125rem; color: var(--danger); margin: 0; padding-left: 1.25rem;">
            {#each Object.entries(statuses).filter(([, s]) => s.message) as [code, s] (code)}
              <li><code>:{code}:</code> — {s.message}</li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  {/if}
</main>
