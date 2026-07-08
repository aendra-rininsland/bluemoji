<script lang="ts">
  let { data } = $props()

  const PERIODS = [
    { value: 'day', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
  ]
</script>

<svelte:head>
  <title>Trending — moji.blue</title>
  <meta name="description" content="The most-used custom Bluemoji this week, ranked by distinct reactors." />
</svelte:head>

<main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
  <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
    <h1>
      <a href="/" style="color: inherit;">bluemoji</a>
      <span style="color: var(--muted); font-weight: 400;"> › trending</span>
    </h1>
    <div style="display: flex; gap: 0.5rem;">
      {#each PERIODS as p (p.value)}
        <a
          href="/gallery?period={p.value}"
          style="padding: 0.375rem 0.875rem; border: 1px solid var(--border); border-radius: 4px; font-size: 0.875rem; text-decoration: none; color: {data.period === p.value ? '#fff' : 'var(--text)'}; background: {data.period === p.value ? 'var(--accent)' : 'none'};"
        >
          {p.label}
        </a>
      {/each}
    </div>
  </div>

  <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
    Top Bluemoji by distinct reactors — only reflects reactions moji.blue has indexed.
  </p>

  {#if data.items.length === 0}
    <div style="text-align: center; padding: 4rem 2rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">
      <p>No trending emoji yet — react to a post with a Bluemoji to get things started.</p>
    </div>
  {:else}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">
      {#each data.items as item, i (item.emoji.uri)}
        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; position: relative;">
          <span style="position: absolute; top: 0.375rem; left: 0.5rem; font-size: 0.6875rem; color: var(--muted); font-weight: 600;">
            #{i + 1}
          </span>
          <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px; border-radius: 4px; overflow: hidden; margin-top: 0.75rem;">
            {#if item.imageUrl}
              <img
                src={item.imageUrl}
                alt={item.emoji.alt || item.emoji.name}
                width="64"
                height="64"
                style="object-fit: contain; image-rendering: pixelated; width: 100%; height: 100%;"
              />
            {:else}
              <span style="font-size: 1.5rem; color: var(--muted);">?</span>
            {/if}
          </div>
          <span style="font-family: var(--mono); font-size: 0.75rem; text-align: center; word-break: break-all; line-height: 1.3;">
            {item.emoji.name}
          </span>
          <span style="font-size: 0.75rem; color: var(--muted);">
            {item.count} reactor{item.count === 1 ? '' : 's'}
          </span>
          {#if item.emoji.adultOnly}
            <span style="font-size: 0.625rem; padding: 0.125rem 0.375rem; background: var(--border); color: var(--muted); border-radius: 999px;">18+</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>
