<script lang="ts">
  import type { EmojiSegment, TextSegment } from "./+page.server.ts";

  let { data } = $props();

  const handle = $derived(data.handle);
  const did = $derived(data.did);
  const uri = $derived(data.uri);
  const post = $derived(data.post);
  const segments = $derived(data.segments);

  const createdAt = $derived(
    post.createdAt ? new Date(post.createdAt).toLocaleString() : null,
  );

  function isEmoji(seg: EmojiSegment | TextSegment): seg is EmojiSegment {
    return seg.type === "emoji";
  }
</script>

<main>
  <article>
    <header>
      <a
        class="author"
        href="https://bsky.app/profile/{handle}"
        target="_blank"
        rel="noopener noreferrer"
      >
        {handle}
      </a>
      {#if createdAt}
        <time datetime={post.createdAt}>{createdAt}</time>
      {/if}
    </header>

    <p class="post-text">
      {#each segments as seg}
        {#if isEmoji(seg)}
          {#if seg.url}
            <img
              class="bluemoji"
              src={seg.url}
              alt={seg.alt ?? seg.name}
              title={seg.name}
            />
          {:else}
            <span title={seg.name}>{seg.fallbackText ?? seg.name}</span>
          {/if}
        {:else}
          {seg.text}
        {/if}
      {/each}
    </p>

    {#if data.sticker}
      <figure class="sticker">
        {#if data.sticker.url}
          <img src={data.sticker.url} alt={data.sticker.alt ?? data.sticker.name} title={data.sticker.name} />
        {:else}
          <span title={data.sticker.name}>{data.sticker.name}</span>
        {/if}
      </figure>
    {/if}

    <footer>
      <a
        class="at-uri"
        href="https://bsky.app/profile/{did}/post/{data.rkey}"
        target="_blank"
        rel="noopener noreferrer"
      >
        View on Bluesky
      </a>
      <span class="uri-text">{uri}</span>
    </footer>
  </article>
</main>

<style>
  main {
    max-width: 600px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  article {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .author {
    font-weight: 600;
    color: var(--text);
  }

  time {
    font-size: 0.875rem;
    color: var(--muted);
  }

  .post-text {
    font-size: 1rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .bluemoji {
    display: inline;
    width: 1.5em;
    height: 1.5em;
    vertical-align: middle;
    object-fit: contain;
  }

  .sticker {
    margin: 0;
  }

  .sticker img {
    max-width: 256px;
    max-height: 256px;
    object-fit: contain;
  }

  footer {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .uri-text {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--muted);
    word-break: break-all;
  }
</style>
