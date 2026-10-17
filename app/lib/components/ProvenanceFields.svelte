<script lang="ts">
  // Optional license (SPDX) and source URL for an emoji or pack.
  import { COMMON_LICENSES, licenseError, normalizeLicense, sourceError } from '$lib/provenance'

  let {
    license = $bindable(''),
    source = $bindable(''),
    disabled = false,
    idPrefix = 'prov',
    noun = 'emoji'
  }: {
    license?: string
    source?: string
    disabled?: boolean
    idPrefix?: string
    noun?: string
  } = $props()

  const OTHER = '__other'
  let otherMode = $state(false)

  const normalized = $derived(normalizeLicense(license.trim()))
  const isCommon = $derived(COMMON_LICENSES.some(l => l.id === normalized))
  // A value that isn't one of the common licenses is shown in "other" mode, so
  // an existing record with e.g. "MIT OR Apache-2.0" opens correctly
  const selectValue = $derived(otherMode || (license.trim() && !isCommon) ? OTHER : isCommon ? normalized : '')

  function onSelect(e: Event) {
    const v = (e.target as HTMLSelectElement).value
    if (v === OTHER) {
      otherMode = true
      if (isCommon) license = ''
    } else {
      otherMode = false
      license = v
    }
  }

  const licenseProblem = $derived(licenseError(license))
  const sourceProblem = $derived(sourceError(source))
  const field =
    'padding: 0.375rem 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);'
</script>

<div style="display: flex; flex-direction: column; gap: 0.75rem;">
  <div>
    <label for="{idPrefix}-license" style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem;">
      License <span style="font-weight: 400; color: var(--muted);">(optional)</span>
    </label>
    <select id="{idPrefix}-license" value={selectValue} onchange={onSelect} {disabled} style="max-width: 100%; {field}">
      <option value="">Not specified</option>
      {#each COMMON_LICENSES as l (l.id)}<option value={l.id}>{l.label}</option>{/each}
      <option value={OTHER}>Other (SPDX expression)…</option>
    </select>
    {#if selectValue === OTHER}
      <input
        bind:value={license}
        {disabled}
        aria-label="SPDX license expression"
        aria-invalid={licenseProblem ? 'true' : 'false'}
        placeholder="e.g. MIT OR Apache-2.0, or LicenseRef-my-terms"
        spellcheck="false"
        autocomplete="off"
        style="display: block; width: 100%; max-width: 28rem; margin-top: 0.375rem; font-family: var(--mono); {field} border-color: {licenseProblem ? 'var(--danger)' : 'var(--border)'};"
      />
      <p style="margin-top: 0.25rem; font-size: 0.75rem; color: {licenseProblem ? 'var(--danger)' : 'var(--muted)'};">
        {licenseProblem ?? 'An '}{#if !licenseProblem}<a href="https://spdx.org/licenses/" target="_blank" rel="noopener noreferrer">SPDX</a> identifier or expression.{/if}
      </p>
    {:else if !license.trim()}
      <p style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--muted);">
        With no license, others don't know whether they may reuse this {noun}.
      </p>
    {/if}
  </div>

  <div>
    <label for="{idPrefix}-source" style="display: block; margin-bottom: 0.25rem; font-weight: 500; font-size: 0.875rem;">
      Source <span style="font-weight: 400; color: var(--muted);">(optional — where it came from, if you didn't make it)</span>
    </label>
    <input
      id="{idPrefix}-source"
      type="url"
      bind:value={source}
      {disabled}
      aria-invalid={sourceProblem ? 'true' : 'false'}
      placeholder="https://example.com/the-original"
      spellcheck="false"
      autocomplete="off"
      style="display: block; width: 100%; max-width: 32rem; {field} border-color: {sourceProblem ? 'var(--danger)' : 'var(--border)'};"
    />
    {#if sourceProblem}
      <p style="margin-top: 0.25rem; font-size: 0.75rem; color: var(--danger);">{sourceProblem}</p>
    {/if}
  </div>
</div>
