<script lang="ts">
  import { callXrpc } from "$hatk/client";
  import { invalidateAll } from "$app/navigation";
  import type { EmojiSegment, TextSegment } from "./+page.server.ts";

  let { data } = $props();

  let showPicker = $state(false);
  let reactBusy = $state(false);
  let reactError = $state("");

  // Values must match an identifier registered via defineLabel() in
  // server/labels/ — dev.hatk.createReport rejects any other label.
  const REPORT_REASONS = [
    { value: "sexual", label: "Unwanted or mislabeled sexual content" },
    { value: "violation", label: "Violates server rules or terms of service" },
    { value: "rude", label: "Rude, harassing, or hateful" },
    { value: "misleading", label: "Misleading identity or content" },
    { value: "spam", label: "Spam" },
    { value: "other", label: "Other" },
  ];
  let reportTarget = $state<{ uri: string; cid: string; label: string } | null>(null);
  let reportLabel = $state(REPORT_REASONS[0].value);
  let reportReason = $state("");
  let reportBusy = $state(false);
  let reportError = $state("");
  let reportDone = $state<Set<string>>(new Set());

  function openReport(uri: string | undefined, cid: string | undefined, label: string) {
    if (!uri || !cid) return;
    reportTarget = { uri, cid, label };
    reportLabel = REPORT_REASONS[0].value;
    reportReason = "";
    reportError = "";
  }

  async function submitReport() {
    if (!reportTarget) return;
    reportBusy = true;
    reportError = "";
    try {
      await callXrpc("dev.hatk.createReport", {
        subject: {
          $type: "com.atproto.repo.strongRef",
          uri: reportTarget.uri,
          cid: reportTarget.cid,
        },
        label: reportLabel,
        reason: reportReason || undefined,
      });
      reportDone = new Set([...reportDone, reportTarget.uri]);
      reportTarget = null;
    } catch (e: any) {
      reportError = e.message ?? "Failed to submit report";
    } finally {
      reportBusy = false;
    }
  }

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
        <div class="reaction-chip-wrap">
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
          {#if data.viewer && group.emoji.cid && !reportDone.has(group.emoji.uri)}
            <button
              class="report-flag"
              title="Report {group.emoji.name}"
              onclick={() => openReport(group.emoji.uri, group.emoji.cid, group.emoji.name)}
            >
              ⚑
            </button>
          {/if}
        </div>
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
      {@const sticker = data.sticker}
      <figure class="sticker">
        {#if sticker.url}
          <img
            class:adult={sticker.adultOnly}
            src={sticker.url}
            alt={sticker.alt ?? sticker.name}
            title={sticker.adultOnly ? `${sticker.name} (18+)` : sticker.name}
          />
        {:else}
          <span title={sticker.name}>{sticker.name}</span>
        {/if}
        <figcaption>
          {#if sticker.adultOnly}
            <span class="badge-18">18+</span>
          {/if}
          {#if data.viewer && sticker.uri && sticker.cid && !reportDone.has(sticker.uri)}
            <button
              class="report-flag"
              title="Report {sticker.name}"
              onclick={() => openReport(sticker.uri, sticker.cid, sticker.name)}
            >
              ⚑ Report
            </button>
          {/if}
        </figcaption>
      </figure>
    {/if}

    {#if reportTarget}
      <div class="report-form">
        <p class="report-form-title">Report {reportTarget.label}</p>
        <label class="report-field">
          Reason
          <select bind:value={reportLabel}>
            {#each REPORT_REASONS as reason (reason.value)}
              <option value={reason.value}>{reason.label}</option>
            {/each}
          </select>
        </label>
        <label class="report-field">
          Additional details <span class="muted">(optional)</span>
          <textarea bind:value={reportReason} rows="2" maxlength="2000"></textarea>
        </label>
        {#if reportError}
          <p class="react-error">{reportError}</p>
        {/if}
        <div class="report-actions">
          <button class="btn-primary" onclick={submitReport} disabled={reportBusy}>
            {reportBusy ? "Submitting…" : "Submit report"}
          </button>
          <button onclick={() => (reportTarget = null)} disabled={reportBusy}> Cancel </button>
        </div>
      </div>
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
    outline: 2px solid var(--danger);
    outline-offset: 1px;
    border-radius: 3px;
  }

  .badge-18 {
    display: inline-flex;
    align-items: center;
    font-size: 0.625rem;
    font-weight: 600;
    padding: 0.0625rem 0.3125rem;
    background: var(--danger);
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

  .reaction-chip-wrap {
    display: inline-flex;
    align-items: center;
    gap: 0.125rem;
  }

  .report-flag {
    border: none;
    background: none;
    color: var(--muted);
    font-size: 0.75rem;
    padding: 0.125rem 0.25rem;
    cursor: pointer;
    opacity: 0.6;
  }

  .report-flag:hover {
    opacity: 1;
    color: var(--danger);
  }

  .report-form {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    padding: 0.875rem;
    border: 1px solid var(--border);
    border-radius: 8px;
  }

  .report-form-title {
    font-weight: 600;
  }

  .report-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
  }

  .report-field select,
  .report-field textarea {
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg);
    color: var(--text);
    font: inherit;
  }

  .report-field textarea {
    resize: vertical;
  }

  .muted {
    color: var(--muted);
    font-weight: 400;
  }

  .report-actions {
    display: flex;
    gap: 0.5rem;
  }

  .report-actions button {
    padding: 0.375rem 0.875rem;
    border: 1px solid var(--border);
    background: none;
    color: var(--text);
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .report-actions .btn-primary {
    background: var(--accent);
    color: #fff;
    border: none;
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
    color: var(--danger);
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

  .sticker figcaption {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.375rem;
  }

  .sticker .report-flag {
    font-size: 0.75rem;
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
