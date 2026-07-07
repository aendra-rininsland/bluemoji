<script lang="ts">
  let { data } = $props()
  const { items } = data

  // Track which emoji is being hovered for animated preview
  let hovered = $state<string | null>(null)
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
      {#each items as item (item.uri)}
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
        </div>
      {/each}
    </div>
  {/if}
</main>
