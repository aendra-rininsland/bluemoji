<script lang="ts">
  import { callXrpc } from "$hatk/client";
  import { invalidateAll } from "$app/navigation";
  import type { EmojiSegment, TextSegment } from "./+page.server.ts";

  let { data } = $props();

  let showPicker = $state(false);
  let reactBusy = $state(false);
  let reactError = $state("");

  async function react(emoji: {
    uri: string;
    name: string;
    alt?: string;
    formats?: Record<string, unknown>;
  }) {
    if (!data.viewer) return;
    reactBusy = true;
    reactError = "";
    try {
      await callXrpc("dev.hatk.createRecord", {
        collection: "blue.moji.feed.reaction",
        repo: data.viewer.did,
        record: {
          $type: "blue.moji.feed.reaction",
          subject: data.uri,
          subjectCid: data.cid,
          emoji: {
            uri: emoji.uri,
            name: emoji.name,
            alt: emoji.alt,
            formats: emoji.formats,
          },
          createdAt: new Date().toISOString(),
        },
      });
      showPicker = false;
      await invalidateAll();
    } catch (e: any) {
      reactError = e.message ?? "Failed to react";
    } finally {
      reactBusy = false;
    }
  }

  function reactWithPickerItem(item: (typeof data.pickerItems)[number]) {
    return react({
      uri: item.uri,
      name: item.name,
      alt: item.alt,
      formats: {
        $type: "blue.moji.richtext.facet#formats_v1",
        ...item.formatCids,
      },
    });
  }

  async function unreact(reactionUri: string) {
    reactBusy = true;
    reactError = "";
    try {
      await callXrpc("dev.hatk.deleteRecord", {
        collection: "blue.moji.feed.reaction",
        rkey: reactionUri.split("/").pop(),
      });
      await invalidateAll();
    } catch (e: any) {
      reactError = e.message ?? "Failed to remove reaction";
    } finally {
      reactBusy = false;
    }
  }

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
              class:adult={seg.adultOnly}
              src={seg.url}
              alt={seg.alt ?? seg.name}
              title={seg.adultOnly ? `${seg.name} (18+)` : seg.name}
            />
          {:else}
            <span title={seg.name}>{seg.fallbackText ?? seg.name}</span>
          {/if}
        {:else}
          {seg.text}
        {/if}
      {/each}
    </p>

    <!-- Reactions -->
    <div class="reactions">
      {#each data.groups as group (group.emoji.uri)}
        <button
          class="reaction-chip"
          class:mine={Boolean(group.viewer)}
          disabled={reactBusy || (!data.viewer && !group.viewer)}
          title={group.viewer ? `Remove your ${group.emoji.name} reaction` : `React with ${group.emoji.name}`}
          onclick={() => (group.viewer ? unreact(group.viewer) : react(group.emoji))}
        >
          {#if group.imageUrl}
            <img
              class:adult={group.emoji.adultOnly}
              src={group.imageUrl}
              alt={group.emoji.alt ?? group.emoji.name}
            />
          {:else}
            <span>{group.emoji.name}</span>
          {/if}
          {#if group.emoji.adultOnly}
            <span class="badge-18">18+</span>
          {/if}
          <span class="count">{group.count}</span>
        </button>
      {/each}
      {#if data.viewer}
        <button
          class="reaction-chip add"
          disabled={reactBusy}
          onclick={() => (showPicker = !showPicker)}
          title="Add a reaction"
        >
          +
        </button>
      {/if}
    </div>

    {#if showPicker}
      <div class="picker">
        {#if data.pickerItems.length === 0}
          <p class="picker-empty">
            No emoji in your collection yet — <a href="/upload">upload one</a> to react.
          </p>
        {:else}
          {#each data.pickerItems as item (item.uri)}
            <button
              class="picker-item"
              disabled={reactBusy}
              title={item.name}
              onclick={() => reactWithPickerItem(item)}
            >
              {#if item.imageUrl}
                <img src={item.imageUrl} alt={item.alt ?? item.name} />
              {:else}
                <span>{item.name}</span>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    {/if}

    {#if reactError}
      <p class="react-error">{reactError}</p>
    {/if}

    {#if data.sticker}
      <figure class="sticker">
        {#if data.sticker.url}
          <img
            class:adult={data.sticker.adultOnly}
            src={data.sticker.url}
            alt={data.sticker.alt ?? data.sticker.name}
            title={data.sticker.adultOnly ? `${data.sticker.name} (18+)` : data.sticker.name}
          />
        {:else}
          <span title={data.sticker.name}>{data.sticker.name}</span>
        {/if}
        {#if data.sticker.adultOnly}
          <figcaption class="badge-18">18+</figcaption>
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

  /* Self-labelled (adultOnly) content: never hidden outright here (that's a
     viewer-preference concern for a future moderation pass), but always
     visually distinct so it's never mistaken for an unlabelled emoji. */
  .adult {
    outline: 2px solid #c94040;
    outline-offset: 1px;
    border-radius: 3px;
  }

  .badge-18 {
    display: inline-flex;
    align-items: center;
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.0625rem 0.3125rem;
    background: #c94040;
    color: #fff;
    border-radius: 999px;
    line-height: 1.4;
  }

  .reactions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .reaction-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: none;
    color: var(--text);
    font-size: 0.875rem;
    cursor: pointer;
  }

  .reaction-chip.mine {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  .reaction-chip img {
    width: 1.25em;
    height: 1.25em;
    object-fit: contain;
  }

  .reaction-chip .count {
    color: var(--muted);
  }

  .reaction-chip.add {
    padding: 0.25rem 0.75rem;
    color: var(--muted);
  }

  .picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0.625rem;
    border: 1px dashed var(--border);
    border-radius: 8px;
  }

  .picker-item {
    padding: 0.375rem;
    border: none;
    background: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .picker-item:hover {
    background: var(--border);
  }

  .picker-item img {
    width: 28px;
    height: 28px;
    object-fit: contain;
    display: block;
  }

  .picker-empty {
    font-size: 0.875rem;
    color: var(--muted);
  }

  .react-error {
    color: red;
    font-size: 0.875rem;
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
