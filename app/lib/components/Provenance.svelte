<script lang="ts">
  // Read-only display of an emoji's/pack's license and source. Values come
  // from records anyone can write, so they are re-validated here: the source
  // only becomes a link if it is a plain http(s) URL, and the license is shown
  // as text (linked to its SPDX page only when it is a single well-formed id).
  import { licenseLabel, licenseUrl, safeHref, sourceHost, viewProvenance } from '$lib/provenance'

  let {
    license,
    source,
    compact = false
  }: { license?: string | null; source?: string | null; compact?: boolean } = $props()

  const p = $derived(viewProvenance(license, source))
  const spdx = $derived(p.license ? licenseUrl(p.license) : null)
  const href = $derived(safeHref(p.source))
  const size = $derived(compact ? '0.6875rem' : '0.8125rem')
</script>

{#if p.license || href}
  <span style="display: inline-flex; flex-wrap: wrap; gap: 0.25rem 0.5rem; justify-content: center; font-size: {size}; color: var(--muted);">
    {#if p.license}
      {#if spdx}
        <a href={spdx} target="_blank" rel="noopener noreferrer" title={licenseLabel(p.license)} style="color: inherit;">{p.license}</a>
      {:else}
        <span title={licenseLabel(p.license)}>{p.license}</span>
      {/if}
    {/if}
    {#if href}
      <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc" title={href} style="color: inherit;">{compact ? '↗ source' : `source: ${sourceHost(href)}`}</a>
    {/if}
  </span>
{/if}
