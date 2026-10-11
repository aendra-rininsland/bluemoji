<script lang="ts">
  import { tick } from 'svelte'
  import { callXrpc } from '$hatk/client'
  import { invalidateAll } from '$app/navigation'
  import { ALT_MAX_GRAPHEMES, altError } from '$lib/alt'
  import { graphemeCount } from '$lib/packs'

  let { data } = $props()
  const items = $derived(data.items)

  // Track which emoji is being hovered for animated preview
  let hovered = $state<string | null>(null)

  let query = $state('')
  const shown = $derived(
    query.trim()
      ? items.filter(i => `${i.name} ${i.alt}`.toLowerCase().includes(query.trim().toLowerCase()))
      : items
  )

  // Editing one emoji's description. The whole record is put back with only
  // `alt` changed, so formats, stickers, labels and provenance are untouched.
  type Item = (typeof data.items)[number]
  let editing = $state<{ item: Item; record: Record<string, unknown> | null; text: string; busy: boolean; error: string } | null>(null)
  let editor = $state<HTMLTextAreaElement | null>(null)
  const textError = $derived(editing ? altError(editing.text) : null)

  async function startEdit(item: Item) {
    removal = null
    editing = { item, record: null, text: item.alt, busy: true, error: '' }
    await tick()
    try {
      const res = await fetch(`/collection/record?rkey=${encodeURIComponent(item.rkey)}`)
      if (!res.ok) throw new Error(res.status === 404 ? 'That emoji no longer exists' : "Couldn't load the emoji")
      const { value } = await res.json()
      if (editing?.item.uri !== item.uri) return // cancelled or switched meanwhile
      // Edit against the freshest copy of the description too
      editing = { item, record: value, text: typeof value.alt === 'string' ? value.alt : '', busy: false, error: '' }
      await tick()
      editor?.focus()
    } catch (e: any) {
      if (editing?.item.uri === item.uri) editing = { ...editing, busy: false, error: e.message ?? "Couldn't load the emoji" }
    }
  }

  async function saveEdit() {
    if (!editing || !editing.record || textError) return
    const { item, record } = editing
    const alt = editing.text.trim()
    editing.busy = true
    editing.error = ''
    try {
      const { alt: _old, ...rest } = record
      await callXrpc('dev.hatk.putRecord', {
        collection: 'blue.moji.collection.item',
        rkey: item.rkey,
        // Omit the key when empty: an explicit undefined fails lexicon validation
        record: { ...rest, ...(alt ? { alt } : {}) }
      } as any)
      editing = null
      await invalidateAll()
    } catch (e: any) {
      if (editing) editing = { ...editing, busy: false, error: e.message ?? 'Failed to save' }
    }
  }

  // Deleting: a confirm step that first looks up which of your packs include
  // the emoji, so those entries go with it. Deliberately independent of the
  // record loading — a broken record must still be deletable.
  let removal = $state<{ loading: boolean; busy: boolean; packItems: string[]; complete: boolean; error: string } | null>(null)

  async function askDelete() {
    if (!editing) return
    const uri = editing.item.uri
    removal = { loading: true, busy: false, packItems: [], complete: true, error: '' }
    try {
      const res = await fetch(`/collection/references?rkey=${encodeURIComponent(editing.item.rkey)}`)
      if (!res.ok) throw new Error("Couldn't check which packs use this emoji")
      const { packItems, complete } = await res.json()
      if (editing?.item.uri === uri) removal = { loading: false, busy: false, packItems, complete, error: '' }
    } catch (e: any) {
      if (editing?.item.uri === uri) removal = { loading: false, busy: false, packItems: [], complete: false, error: e.message ?? "Couldn't check your packs" }
    }
  }

  async function confirmDelete() {
    if (!editing || !removal || removal.loading || removal.busy) return
    const { item } = editing
    removal.busy = true
    removal.error = ''
    try {
      // Pack entries first: if the emoji's own delete then fails, nothing is left dangling
      for (const rkey of removal.packItems) {
        await callXrpc('dev.hatk.deleteRecord', { collection: 'blue.moji.packs.packitem', rkey } as any)
      }
      await callXrpc('dev.hatk.deleteRecord', { collection: 'blue.moji.collection.item', rkey: item.rkey } as any)
      editing = null
      removal = null
      await invalidateAll()
    } catch (e: any) {
      if (removal) removal = { ...removal, busy: false, error: e.message ?? 'Failed to delete' }
    }
  }

  function closeEditor() {
    editing = null
    removal = null
  }

  function onEditorKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeEditor()
    else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveEdit()
  }
</script>

<main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
    <h1>
      <a href="/" style="color: inherit;">bluemoji</a>
      <span style="color: var(--muted); font-weight: 400;"> › my collection</span>
    </h1>
    <div style="display: flex; gap: 0.75rem; align-items: center;">
      <span style="color: var(--muted); font-size: 0.875rem;">{items.length} emoji{items.length === 1 ? '' : 's'}</span>
      <a
        href="/packs"
        style="padding: 0.375rem 0.875rem; border: 1px solid var(--border); color: var(--text); border-radius: 4px; text-decoration: none; font-size: 0.875rem; white-space: nowrap;"
      >
        My packs
      </a>
      <a
        href="/upload"
        style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border-radius: 4px; text-decoration: none; font-size: 0.875rem; white-space: nowrap;"
      >
        + Upload
      </a>
    </div>
  </div>

  {#if data.truncated}
    <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 1rem;">
      Showing your first {items.length} emoji.
    </p>
  {/if}

  {#if items.length > 12}
    <input
      type="search"
      bind:value={query}
      placeholder="Search by name or description…"
      aria-label="Search your emoji"
      style="width: 100%; max-width: 24rem; padding: 0.375rem 0.5rem; margin-bottom: 1rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
    />
  {/if}

  {#if items.length === 0}
    <div style="text-align: center; padding: 4rem 2rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">
      <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">No emoji yet</p>
      <p style="margin-bottom: 1.5rem; font-size: 0.875rem;">Upload your first custom emoji to get started.</p>
      <a
        href="/upload"
        style="padding: 0.5rem 1.25rem; background: var(--accent); color: #fff; border-radius: 4px; text-decoration: none;"
      >
        Upload emoji
      </a>
    </div>
  {:else}
    <div
      style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 0.75rem;"
    >
      {#each shown as item (item.uri)}
        {#if editing?.item.uri === item.uri}
          <div
            style="grid-column: 1 / -1; display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; border: 2px solid var(--accent); border-radius: 8px; flex-wrap: wrap;"
          >
            <div
              style="width: 96px; height: 96px; flex: none; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px; border-radius: 4px; overflow: hidden;"
            >
              {#if item.animatedUrl || item.imageUrl}
                <img src={item.animatedUrl ?? item.imageUrl ?? ''} alt="" style="object-fit: contain; width: 100%; height: 100%;" />
              {/if}
            </div>
            <form
              onsubmit={(e) => { e.preventDefault(); saveEdit() }}
              style="flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 0.5rem;"
            >
              <p style="font-family: var(--mono); font-size: 0.875rem;">{item.name}</p>
              <label for="alt-editor" style="font-size: 0.875rem; font-weight: 500;">
                Description <span style="font-weight: 400; color: var(--muted);">— read by screen readers and shown on hover</span>
              </label>
              <textarea
                id="alt-editor"
                bind:this={editor}
                bind:value={editing.text}
                onkeydown={onEditorKeydown}
                disabled={editing.busy || !editing.record}
                rows="3"
                placeholder={editing.record ? 'Describe what this emoji shows, e.g. “a smiling cat in a party hat”' : 'Loading…'}
                style="padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); resize: vertical;"
              ></textarea>
              <p style="font-size: 0.75rem; color: {textError ? 'var(--danger)' : 'var(--muted)'};">
                {textError ?? `${graphemeCount(editing.text.trim())}/${ALT_MAX_GRAPHEMES}`}
              </p>
              {#if editing.error}
                <p role="alert" style="font-size: 0.875rem; color: var(--danger);">{editing.error}</p>
              {/if}
              <div style="display: flex; gap: 0.5rem;">
                <button
                  type="submit"
                  disabled={editing.busy || !editing.record || !!textError}
                  style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer; opacity: {editing.busy || !editing.record || textError ? 0.5 : 1};"
                >
                  {editing.busy && editing.record ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onclick={closeEditor}
                  disabled={editing.busy && !!editing.record}
                  style="padding: 0.375rem 0.875rem; border: 1px solid var(--border); background: none; color: var(--text); border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
                >
                  Cancel
                </button>
                {#if !removal}
                  <button
                    type="button"
                    onclick={askDelete}
                    disabled={editing.busy && !!editing.record}
                    style="margin-left: auto; padding: 0.375rem 0.875rem; border: 1px solid var(--danger); background: none; color: var(--danger); border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
                  >
                    Delete…
                  </button>
                {/if}
              </div>
            </form>

            {#if removal}
              <div
                role="alertdialog"
                aria-label="Confirm deletion of {item.name}"
                style="flex-basis: 100%; padding: 0.75rem 1rem; border: 1px solid var(--danger); border-radius: 8px; display: flex; flex-direction: column; gap: 0.5rem;"
              >
                {#if removal.loading}
                  <p style="font-size: 0.875rem; color: var(--muted);">Checking where this emoji is used…</p>
                {:else}
                  <p style="font-weight: 600;">Delete {item.name}?</p>
                  <p style="font-size: 0.875rem;">
                    This permanently removes it from your collection and can't be undone.
                    {#if removal.packItems.length}
                      It will also be taken out of {removal.packItems.length} entr{removal.packItems.length === 1 ? 'y' : 'ies'} in your packs.
                    {/if}
                    Posts that already use it will show the plain text <code>{item.name}</code>, and other people's copies are not affected.
                  </p>
                  {#if !removal.complete}
                    <p style="font-size: 0.8125rem; color: var(--muted);">
                      Your packs couldn't be checked completely, so some pack entries may be left over.
                    </p>
                  {/if}
                {/if}
                {#if removal.error}
                  <p role="alert" style="font-size: 0.875rem; color: var(--danger);">{removal.error}</p>
                {/if}
                <div style="display: flex; gap: 0.5rem;">
                  <button
                    type="button"
                    onclick={confirmDelete}
                    disabled={removal.loading || removal.busy}
                    style="padding: 0.375rem 0.875rem; background: var(--danger); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer; opacity: {removal.loading || removal.busy ? 0.5 : 1};"
                  >
                    {removal.busy ? 'Deleting…' : 'Delete emoji'}
                  </button>
                  <button
                    type="button"
                    onclick={() => (removal = null)}
                    disabled={removal.busy}
                    style="padding: 0.375rem 0.875rem; border: 1px solid var(--border); background: none; color: var(--text); border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            {/if}
          </div>
        {:else}
        <div
          style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; cursor: default;"
          onmouseenter={() => hovered = item.uri}
          onmouseleave={() => hovered = null}
          role="img"
          aria-label={item.alt || item.name}
        >
          <div
            style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px; border-radius: 4px; overflow: hidden;"
          >
            {#if item.imageUrl || item.animatedUrl}
              <img
                src={hovered === item.uri && item.animatedUrl ? item.animatedUrl : (item.imageUrl ?? item.animatedUrl ?? '')}
                alt={item.alt || item.name}
                width="64"
                height="64"
                style="object-fit: contain; image-rendering: pixelated; width: 100%; height: 100%;"
              />
            {:else}
              <span style="font-size: 1.5rem; color: var(--muted);">?</span>
            {/if}
          </div>

          <span
            style="font-family: var(--mono); font-size: 0.75rem; color: var(--text); text-align: center; word-break: break-all; line-height: 1.3;"
            title={item.alt || undefined}
          >
            {item.name}
          </span>

          {#if item.adultOnly}
            <span style="font-size: 0.625rem; padding: 0.125rem 0.375rem; background: var(--border); color: var(--muted); border-radius: 999px;">
              18+
            </span>
          {/if}

          {#if item.alt}
            <span
              style="font-size: 0.6875rem; color: var(--muted); text-align: center; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere;"
              title={item.alt}
            >
              {item.alt}
            </span>
          {/if}
          <button
            type="button"
            onclick={() => startEdit(item)}
            aria-label={item.alt ? `Edit description of ${item.name}` : `Add description to ${item.name}`}
            style="margin-top: auto; padding: 0.125rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: none; color: var(--muted); font-size: 0.6875rem; cursor: pointer;"
          >
            {item.alt ? '✎ Edit' : '+ Description'}
          </button>
        </div>
        {/if}
      {/each}
      {#if query.trim() && !shown.length}
        <p style="grid-column: 1 / -1; color: var(--muted);">No emoji match “{query.trim()}”.</p>
      {/if}
    </div>
  {/if}
</main>
