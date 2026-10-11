<script lang="ts">
  import { onDestroy } from 'svelte'
  import { invalidateAll } from '$app/navigation'
  import { aliasToRkey, normalizeAlias } from '$lib/alias'
  import { addToPack, createPack, importEmoji } from '$lib/emoji-import'
  import { runImportQueue, type ItemStatus } from '$lib/import-runner'
  import { packTargetProblem } from '$lib/packs'
  import { scanEmojiZip, type ZipImage, type ZipSkip } from '$lib/zip-emoji'
  import ImportSettings from '$lib/components/ImportSettings.svelte'

  let { data } = $props()

  type Row = { image: ZipImage; name: string; selected: boolean; url: string }

  let rows = $state<Row[]>([])
  let skipped = $state<ZipSkip[]>([])
  let zipName = $state('')
  let scanning = $state(false)
  let scanError = $state('')
  let dragging = $state(false)

  let asSticker = $state(false)
  let adultOnly = $state(false)
  let packMode = $state<'none' | 'existing' | 'new'>('none')
  let packUri = $state('')
  let packName = $state('')
  let packDescription = $state('')
  let running = $state(false)
  let statuses = $state<Record<string, ItemStatus>>({})

  const existing = $derived(new Set(data.existing))

  /** Canonical alias / rkey for a row's current name, or why it can't be used. */
  function check(name: string): { alias: string; rkey: string; error: string } {
    try {
      return { alias: normalizeAlias(name), rkey: aliasToRkey(name), error: '' }
    } catch (e: any) {
      return { alias: '', rkey: '', error: e.message as string }
    }
  }

  const checks = $derived(rows.map(r => check(r.name)))
  // Names used more than once among rows that would actually be imported
  const duplicateRkeys = $derived.by(() => {
    const seen = new Map<string, number>()
    rows.forEach((r, i) => {
      const k = checks[i].rkey
      if (r.selected && k) seen.set(k, (seen.get(k) ?? 0) + 1)
    })
    return new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k))
  })
  const problemFor = (i: number) =>
    checks[i].error || (duplicateRkeys.has(checks[i].rkey) && rows[i].selected ? 'Another file has this name' : '')

  const selectedRows = $derived(rows.filter(r => r.selected))
  const blocking = $derived(rows.reduce((n, r, i) => n + (r.selected && problemFor(i) ? 1 : 0), 0))
  const packProblem = $derived(
    packTargetProblem({ mode: packMode, uri: packUri, name: packName, description: packDescription })
  )
  const canImport = $derived(!running && selectedRows.length > 0 && blocking === 0 && !packProblem)
  const doneCount = $derived(Object.values(statuses).filter(s => s.state === 'done').length)
  const failedCount = $derived(Object.values(statuses).filter(s => s.state === 'error').length)
  const total = $derived(Object.keys(statuses).length)

  function releaseUrls() {
    for (const r of rows) URL.revokeObjectURL(r.url)
  }
  onDestroy(releaseUrls)

  function reset() {
    releaseUrls()
    rows = []
    skipped = []
    zipName = ''
    scanError = ''
    statuses = {}
  }

  async function load(file: File | undefined) {
    if (!file) return
    reset()
    scanning = true
    try {
      const result = await scanEmojiZip(file)
      zipName = file.name
      skipped = result.skipped
      rows = result.images.map(image => ({
        image,
        name: image.suggestedName,
        // Don't pre-select files that would overwrite something the user already has
        selected: !existing.has(check(image.suggestedName).rkey),
        url: URL.createObjectURL(image.blob)
      }))
      if (!rows.length) scanError = 'No usable images were found in that zip.'
    } catch (e: any) {
      scanError = e?.message ?? "Couldn't read that zip file"
    } finally {
      scanning = false
    }
  }

  function onPick(e: Event) {
    const input = e.target as HTMLInputElement
    load(input.files?.[0])
    input.value = ''
  }
  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragging = false
    load(e.dataTransfer?.files?.[0])
  }

  function setAll(selected: boolean) {
    rows.forEach((r, i) => {
      r.selected = selected && !checks[i].error
    })
  }

  async function run() {
    const did = data.viewer.did
    const queue = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.selected)
    running = true
    statuses = {}
    const summary = await runImportQueue({
      did,
      items: queue.map(({ r }) => ({
        key: String(r.image.id),
        run: () =>
          importEmoji({
            did,
            name: r.name,
            source: r.image.blob,
            animated: r.image.animated,
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
    // Imported files leave the selection; failures stay selected so they can be retried
    for (const r of rows) if (summary.done.includes(String(r.image.id))) r.selected = false
    running = false
    await invalidateAll()
  }

  const kb = (n: number) => `${Math.max(1, Math.round(n / 1024))} KB`
  const control =
    'border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);'
</script>

<main style="max-width: 960px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 0.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › <a href="/import" style="color: inherit;">import</a> › zip</span>
  </h1>

  {#if !rows.length}
    <p style="color: var(--muted); margin-bottom: 1.25rem;">
      Upload a zip of emoji images (PNG, GIF, WebP, JPEG or SVG — SVGs are converted to PNG). Each file's name becomes the emoji's
      name, and you can rename them before importing. The zip is opened in your browser — it isn't
      uploaded anywhere until you import.
    </p>

    <label
      ondragover={(e) => { e.preventDefault(); dragging = true }}
      ondragleave={() => (dragging = false)}
      ondrop={onDrop}
      style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 2.5rem 1rem; border: 2px dashed {dragging ? 'var(--accent)' : 'var(--border)'}; border-radius: 8px; cursor: pointer; text-align: center;"
    >
      <span style="font-size: 2rem;" aria-hidden="true">🗜️</span>
      <span style="font-weight: 600;">{scanning ? 'Reading zip…' : 'Drop a .zip here, or click to choose one'}</span>
      <span style="font-size: 0.875rem; color: var(--muted);">Images up to 1 MB each</span>
      <input
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onchange={onPick}
        disabled={scanning}
        style="position: absolute; width: 1px; height: 1px; opacity: 0;"
      />
    </label>

    {#if scanError}
      <p role="alert" style="color: var(--danger); margin-top: 1rem;">{scanError}</p>
    {/if}

    {#if skipped.length}
      <p style="margin-top: 1rem; color: var(--muted); font-size: 0.875rem;">
        {skipped.length} file{skipped.length === 1 ? '' : 's'} skipped.
      </p>
    {/if}
  {:else}
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem;">
      <p>
        <strong>{zipName}</strong> ·
        <span style="color: var(--muted);">{rows.length} image{rows.length === 1 ? '' : 's'}</span>
      </p>
      <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <button type="button" onclick={() => setAll(true)} disabled={running} style="padding: 0.25rem 0.75rem; cursor: pointer; {control}">Select all</button>
        <button type="button" onclick={() => setAll(false)} disabled={running} style="padding: 0.25rem 0.75rem; cursor: pointer; {control}">Select none</button>
        <button type="button" onclick={reset} disabled={running} style="padding: 0.25rem 0.75rem; cursor: pointer; {control}">Choose a different zip</button>
      </div>
    </div>

    {#if skipped.length}
      <details style="margin-bottom: 1rem; font-size: 0.875rem; color: var(--muted);">
        <summary style="cursor: pointer;">{skipped.length} file{skipped.length === 1 ? '' : 's'} skipped</summary>
        <ul style="margin: 0.5rem 0 0; padding-left: 1.25rem;">
          {#each skipped as s (s.path)}
            <li><code>{s.path}</code> — {s.reason}</li>
          {/each}
        </ul>
      </details>
    {/if}

    <ul style="list-style: none; padding: 0; margin: 0 0 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
      {#each rows as row, i (row.image.id)}
        {@const st = statuses[String(row.image.id)]}
        {@const problem = problemFor(i)}
        <li
          style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 8px; opacity: {row.selected ? 1 : 0.6};"
        >
          <input
            type="checkbox"
            bind:checked={row.selected}
            disabled={running}
            aria-label="Import {row.image.filename}"
          />
          <img
            src={row.url}
            alt=""
            loading="lazy"
            width="48"
            height="48"
            style="width: 48px; height: 48px; object-fit: contain; flex: none; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px; border-radius: 4px;"
          />
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: stretch; max-width: 22rem;">
              <span style="padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-right: none; border-radius: 4px 0 0 4px; color: var(--muted); background: var(--border); font-family: var(--mono);">:</span>
              <input
                bind:value={row.name}
                disabled={running}
                aria-label="Name for {row.image.filename}"
                aria-invalid={problem ? 'true' : 'false'}
                spellcheck="false"
                autocomplete="off"
                style="flex: 1; min-width: 0; padding: 0.375rem 0.5rem; border-radius: 0; font-family: var(--mono); {control} border-color: {problem && row.selected ? 'var(--danger)' : 'var(--border)'};"
              />
              <span style="padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-left: none; border-radius: 0 4px 4px 0; color: var(--muted); background: var(--border); font-family: var(--mono);">:</span>
            </div>
            <p style="font-size: 0.75rem; margin-top: 0.25rem; color: {problem && row.selected ? 'var(--danger)' : 'var(--muted)'};">
              {#if problem && row.selected}
                {problem}
              {:else if !checks[i].error && checks[i].alias !== row.name}
                saved as :{checks[i].alias}:
              {:else}
                {row.image.filename} · {kb(row.image.blob.size)}{row.image.notice ? ` · ${row.image.notice}` : ''}
              {/if}
            </p>
          </div>
          <span style="font-size: 0.75rem; color: var(--muted); text-align: right; min-width: 7rem;">
            {#if st?.state === 'working'}importing…
            {:else if st?.state === 'done'}✓ imported{st.message ? ' (!)' : ''}
            {:else if st?.state === 'error'}✗ failed
            {:else if !checks[i].error && existing.has(checks[i].rkey)}already in your collection
            {:else if row.image.animated}animated{/if}
          </span>
        </li>
      {/each}
    </ul>

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
          {running ? 'Importing…' : `Import ${selectedRows.length} emoji`}
        </button>
        {#if blocking}
          <span style="font-size: 0.875rem; color: var(--danger);">
            Fix {blocking} name{blocking === 1 ? '' : 's'} (or untick the file) to continue
          </span>
        {:else if total}
          <span aria-live="polite" style="font-size: 0.875rem; color: var(--muted);">
            {doneCount}/{total} imported{failedCount ? `, ${failedCount} failed` : ''}
          </span>
        {/if}
      </div>

      {#if Object.values(statuses).some(s => s.state === 'error' || (s.state === 'done' && s.message))}
        <ul style="font-size: 0.8125rem; color: var(--danger); margin: 0; padding-left: 1.25rem;">
          {#each rows as row (row.image.id)}
            {@const st = statuses[String(row.image.id)]}
            {#if st && 'message' in st && st.message}
              <li><code>{row.image.filename}</code> — {st.message}</li>
            {/if}
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</main>
