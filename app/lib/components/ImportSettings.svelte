<script lang="ts">
  // Options shared by the importers: sticker rendition, adult-only flag, and
  // an optional pack to add the imported emoji to.
  import { graphemeCount, packTargetProblem, PACK_DESCRIPTION_MAX_GRAPHEMES } from '$lib/packs'
  import { provenanceError } from '$lib/provenance'
  import ProvenanceFields from './ProvenanceFields.svelte'

  let {
    packs,
    disabled = false,
    sticker = $bindable(false),
    adultOnly = $bindable(false),
    packMode = $bindable<'none' | 'existing' | 'new'>('none'),
    packUri = $bindable(''),
    packName = $bindable(''),
    packDescription = $bindable(''),
    license = $bindable(''),
    source = $bindable('')
  }: {
    packs: { uri: string; name: string }[]
    disabled?: boolean
    sticker?: boolean
    adultOnly?: boolean
    packMode?: 'none' | 'existing' | 'new'
    packUri?: string
    packName?: string
    packDescription?: string
    license?: string
    source?: string
  } = $props()

  const problem = $derived(
    packTargetProblem({ mode: packMode, uri: packUri, name: packName, description: packDescription })
  )
  const field =
    'padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);'
</script>

<div style="display: flex; flex-direction: column; gap: 0.75rem;">
  <div style="display: flex; gap: 1.25rem; flex-wrap: wrap;">
    <label title="Also create a 512px rendition so these can be posted as stickers (upscaled from the original, so it may look soft)">
      <input type="checkbox" bind:checked={sticker} {disabled} /> Also make stickers
    </label>
    <label><input type="checkbox" bind:checked={adultOnly} {disabled} /> Mark as adult-only</label>
  </div>

  <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
    <label for="import-pack-mode">Add to pack:</label>
    <select id="import-pack-mode" bind:value={packMode} {disabled} style={field}>
      <option value="none">None</option>
      <option value="existing" disabled={!packs.length}>An existing pack</option>
      <option value="new">A new pack</option>
    </select>
    {#if packMode === 'existing'}
      <select bind:value={packUri} {disabled} aria-label="Pack" style={field}>
        <option value="">Choose a pack…</option>
        {#each packs as p (p.uri)}<option value={p.uri}>{p.name}</option>{/each}
      </select>
    {:else if packMode === 'new'}
      <input
        bind:value={packName}
        placeholder="Pack name"
        aria-label="New pack name"
        {disabled}
        style={field}
      />
      <textarea
        bind:value={packDescription}
        rows="2"
        placeholder="Description (optional) — e.g. where these came from"
        aria-label="New pack description"
        {disabled}
        style="flex-basis: 100%; resize: vertical; {field}"
      ></textarea>
      <span
        style="flex-basis: 100%; font-size: 0.75rem; color: {problem && packName.trim() ? 'var(--danger)' : 'var(--muted)'};"
      >
        {#if packName.trim() && problem}{problem}{:else}{graphemeCount(packDescription)}/{PACK_DESCRIPTION_MAX_GRAPHEMES}{/if}
      </span>
    {/if}
  </div>

  <details open={!!(license || source)}>
    <summary style="cursor: pointer; font-weight: 500;">
      License &amp; source <span style="font-weight: 400; color: var(--muted);">(optional{license || source ? ' — set' : ''})</span>
    </summary>
    <div style="margin-top: 0.75rem;">
      <p style="font-size: 0.75rem; color: var(--muted); margin-bottom: 0.5rem;">
        Applied to every emoji imported here, and to a new pack if you create one. You can change them per emoji later.
      </p>
      <ProvenanceFields bind:license bind:source {disabled} idPrefix="import" />
      {#if provenanceError(license, source)}
        <p role="alert" style="margin-top: 0.5rem; font-size: 0.8125rem; color: var(--danger);">{provenanceError(license, source)}</p>
      {/if}
    </div>
  </details>
</div>
