<script lang="ts">
  import { tick } from 'svelte'
  import { callXrpc } from '$hatk/client'
  import { goto } from '$app/navigation'
  import { graphemeCount } from '$lib/packs'
  import {
    autocompleteToken,
    buildEmojiFacets,
    emojiByAlias,
    findEmoji,
    previewParts,
    suggest
  } from '$lib/compose'

  let { data } = $props()

  const MAX_GRAPHEMES = 300 // app.bsky.feed.post text limit

  type Emoji = (typeof data.emoji)[number]

  let text = $state('')
  let caret = $state(0)
  let textarea = $state<HTMLTextAreaElement | null>(null)
  let selected = $state<Emoji | null>(null)
  let posting = $state(false)
  let error = $state('')

  // Inline emoji: picker + :autocomplete:
  let showPicker = $state(false)
  let pickerQuery = $state('')
  let activeIdx = $state(0)
  let dismissedAt = $state<number | null>(null)

  const byAlias = $derived(emojiByAlias(data.emoji))
  const matches = $derived(findEmoji(text.trim(), byAlias))
  const parts = $derived(previewParts(text.trim(), matches))
  const stickers = $derived(data.emoji.filter(e => e.sticker))
  const length = $derived(graphemeCount(text.trim()))
  const tooLong = $derived(length > MAX_GRAPHEMES)
  const canPost = $derived(!posting && !tooLong && (text.trim().length > 0 || selected !== null))

  const token = $derived(autocompleteToken(text, caret))
  const suggestions = $derived(
    token && token.start !== dismissedAt ? suggest(data.emoji, token.query) : []
  )
  const pickerEmoji = $derived(
    pickerQuery.trim() ? suggest(data.emoji, pickerQuery.trim().replace(/^:|:$/g, ''), 60) : data.emoji
  )

  function syncCaret() {
    caret = textarea?.selectionStart ?? text.length
  }

  /** Replace text[start,end) with `name ` and put the caret after it. */
  async function insertEmoji(e: Emoji, start: number, end: number) {
    const after = text.slice(end)
    const pad = after.length === 0 || !/^\s/.test(after) ? ' ' : ''
    const insert = `${e.name}${pad}`
    text = text.slice(0, start) + insert + after
    const pos = start + insert.length
    dismissedAt = null
    activeIdx = 0
    await tick()
    textarea?.focus()
    textarea?.setSelectionRange(pos, pos)
    caret = pos
  }

  function pickFromPicker(e: Emoji) {
    const start = textarea?.selectionStart ?? text.length
    const end = textarea?.selectionEnd ?? start
    // Keep a space before the emoji so it doesn't glue onto the previous word
    const needsSpace = start > 0 && !/\s/.test(text[start - 1])
    if (needsSpace) {
      text = text.slice(0, start) + ' ' + text.slice(end)
      insertEmoji(e, start + 1, start + 1)
    } else {
      insertEmoji(e, start, end)
    }
  }

  function onKeydown(ev: KeyboardEvent) {
    if (!suggestions.length || !token) return
    if (ev.key === 'ArrowDown') {
      ev.preventDefault()
      activeIdx = (activeIdx + 1) % suggestions.length
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault()
      activeIdx = (activeIdx - 1 + suggestions.length) % suggestions.length
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault()
      insertEmoji(suggestions[activeIdx] ?? suggestions[0], token.start, caret)
    } else if (ev.key === 'Escape') {
      ev.preventDefault()
      dismissedAt = token.start
    }
  }

  function onInput() {
    syncCaret()
    activeIdx = 0
  }

  function blobRefCid(ref: unknown): string | undefined {
    return (ref as { ref?: { $link?: string } } | undefined)?.ref?.$link
  }

  function stickerEmbed(s: Emoji) {
    const sf = (s.sticker?.stickerFormats ?? {}) as Record<string, unknown>
    const formats: Record<string, unknown> = { $type: 'blue.moji.embed.sticker#formats_v0' }
    for (const key of ['png_512', 'webp_512', 'gif_512', 'apng_512', 'lottie']) {
      const cid = blobRefCid(sf[key])
      if (cid) formats[key] = cid
    }
    return {
      $type: 'blue.moji.embed.sticker',
      sticker: {
        $type: 'blue.moji.embed.sticker#sticker',
        record: { $type: 'com.atproto.repo.strongRef', uri: s.uri, cid: s.cid },
        did: s.did,
        name: s.name,
        alt: s.alt,
        formats
      }
    }
  }

  async function submitPost() {
    if (!canPost) return
    posting = true
    error = ''
    try {
      // Facet byte offsets are computed on exactly the text we send
      const body = text.trim()
      const facets = buildEmojiFacets(findEmoji(body, byAlias))

      const { uri } = await callXrpc('dev.hatk.createRecord', {
        collection: 'app.bsky.feed.post',
        repo: data.viewer.did,
        record: {
          $type: 'app.bsky.feed.post',
          text: body,
          createdAt: new Date().toISOString(),
          // Omit unset keys: an explicit undefined fails lexicon validation
          ...(facets.length ? { facets } : {}),
          ...(selected ? { embed: stickerEmbed(selected) } : {})
        }
      } as any)

      const rkey = (uri as string).split('/').pop()
      await goto(`/profile/${data.viewer.did}/post/${rkey}`)
    } catch (e: any) {
      error = e.message ?? 'Failed to post'
    } finally {
      posting = false
    }
  }
</script>

<main style="max-width: 700px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 1.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › new post</span>
  </h1>

  <!-- Text + :emoji: autocomplete -->
  <div style="position: relative; margin-bottom: 0.5rem;">
    <textarea
      bind:this={textarea}
      bind:value={text}
      oninput={onInput}
      onkeydown={onKeydown}
      onkeyup={syncCaret}
      onclick={syncCaret}
      onfocus={syncCaret}
      placeholder={data.emoji.length ? "What's on your mind? Type : to add an emoji" : "What's on your mind?"}
      rows="4"
      aria-label="Post text"
      aria-autocomplete="list"
      aria-controls="emoji-suggestions"
      style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); resize: vertical; font-size: 1rem; display: block;"
    ></textarea>

    {#if suggestions.length}
      <ul
        id="emoji-suggestions"
        role="listbox"
        aria-label="Emoji suggestions"
        style="position: absolute; left: 0.5rem; right: 0.5rem; top: 100%; z-index: 10; margin: 0.25rem 0 0; padding: 0.25rem; list-style: none; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.25); max-height: 16rem; overflow: auto;"
      >
        {#each suggestions as s, i (s.uri)}
          <li role="option" aria-selected={i === activeIdx}>
            <!-- mousedown (not click) so the textarea keeps focus -->
            <button
              type="button"
              onmousedown={(ev) => { ev.preventDefault(); if (token) insertEmoji(s, token.start, caret) }}
              style="display: flex; align-items: center; gap: 0.5rem; width: 100%; padding: 0.25rem 0.5rem; border: none; border-radius: 4px; background: {i === activeIdx ? 'var(--border)' : 'none'}; color: var(--text); cursor: pointer; text-align: left;"
            >
              {#if s.thumbUrl}
                <img src={s.thumbUrl} alt="" width="24" height="24" style="object-fit: contain;" />
              {/if}
              <span style="font-family: var(--mono); font-size: 0.875rem;">{s.name}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
    <button
      type="button"
      onclick={() => (showPicker = !showPicker)}
      aria-expanded={showPicker}
      disabled={!data.emoji.length}
      style="padding: 0.25rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; background: none; color: var(--text); cursor: pointer;"
    >
      ☺ Emoji
    </button>
    <span
      aria-live="polite"
      style="font-size: 0.875rem; color: {tooLong ? 'var(--danger)' : 'var(--muted)'};"
    >
      {length}/{MAX_GRAPHEMES}
    </span>
  </div>

  {#if !data.emoji.length}
    <p style="font-size: 0.875rem; color: var(--muted); margin-bottom: 1rem;">
      You don't have any emoji yet — <a href="/upload">upload one</a> or
      <a href="/import/mastodon">import from Mastodon</a> to use them in posts.
    </p>
  {/if}

  <!-- Inline emoji picker -->
  {#if showPicker}
    <div style="padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1rem;">
      <input
        type="search"
        bind:value={pickerQuery}
        placeholder="Search your emoji…"
        aria-label="Search your emoji"
        style="width: 100%; padding: 0.375rem 0.5rem; margin-bottom: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
      />
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); gap: 0.25rem; max-height: 14rem; overflow: auto;">
        {#each pickerEmoji as e (e.uri)}
          <button
            type="button"
            title={e.name}
            aria-label={e.alt || e.name}
            onmousedown={(ev) => ev.preventDefault()}
            onclick={() => pickFromPicker(e)}
            style="display: flex; align-items: center; justify-content: center; padding: 0.25rem; border: 1px solid transparent; border-radius: 6px; background: none; cursor: pointer;"
          >
            {#if e.thumbUrl}
              <img src={e.thumbUrl} alt="" width="32" height="32" style="object-fit: contain;" />
            {:else}
              <span style="font-size: 0.625rem; font-family: var(--mono);">{e.name}</span>
            {/if}
          </button>
        {/each}
        {#if !pickerEmoji.length}
          <p style="grid-column: 1 / -1; color: var(--muted); font-size: 0.875rem;">No matching emoji.</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Live preview, so what you see is how the post will render -->
  {#if matches.length || selected}
    <div style="padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem;">
      <p style="font-size: 0.75rem; color: var(--muted); margin-bottom: 0.5rem;">Preview</p>
      {#if text.trim()}
        <p style="white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.6;">
          {#each parts as part, i (i)}
            {#if 'emoji' in part}
              {#if part.emoji.inlineUrl}
                <img
                  src={part.emoji.inlineUrl}
                  alt={part.emoji.alt || part.emoji.name}
                  title={part.emoji.name}
                  style="height: 1.5em; width: 1.5em; vertical-align: middle; object-fit: contain;"
                />
              {:else}{part.emoji.name}{/if}
            {:else}{part.text}{/if}
          {/each}
        </p>
      {/if}
      {#if selected?.sticker?.fullsizeUrl}
        <div style="display: flex; align-items: flex-start; gap: 0.75rem; margin-top: 0.75rem;">
          <img src={selected.sticker.fullsizeUrl} alt={selected.alt || selected.name} style="max-width: 200px; max-height: 200px; object-fit: contain;" />
          <button
            type="button"
            onclick={() => (selected = null)}
            style="padding: 0.25rem 0.75rem; border: 1px solid var(--border); border-radius: 4px; background: none; color: var(--text); cursor: pointer; font-size: 0.875rem;"
          >
            Remove sticker
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Optional sticker -->
  <h2 style="font-size: 1rem; margin-bottom: 0.75rem;">
    Attach a sticker <span style="font-weight: 400; color: var(--muted);">(optional)</span>
  </h2>

  {#if stickers.length === 0}
    <div style="text-align: center; padding: 1.5rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px; margin-bottom: 1.5rem;">
      <p>No stickers yet. <a href="/upload">Upload an emoji</a> with full-size formats to make it sticker-capable.</p>
    </div>
  {:else}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem;">
      {#each stickers as sticker (sticker.uri)}
        <button
          type="button"
          aria-pressed={selected?.uri === sticker.uri}
          onclick={() => (selected = selected?.uri === sticker.uri ? null : sticker)}
          style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 2px solid {selected?.uri === sticker.uri ? 'var(--accent)' : 'var(--border)'}; border-radius: 8px; background: none; cursor: pointer;"
        >
          {#if sticker.thumbUrl}
            <img src={sticker.thumbUrl} alt={sticker.alt || sticker.name} width="48" height="48" style="object-fit: contain;" />
          {:else}
            <span style="font-size: 1.5rem;">?</span>
          {/if}
          <span style="font-family: var(--mono); font-size: 0.625rem; color: var(--text); word-break: break-all; text-align: center;">
            {sticker.name}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  {#if error}
    <p style="color: var(--danger); margin-bottom: 1rem;">{error}</p>
  {/if}

  <button
    type="button"
    onclick={submitPost}
    disabled={!canPost}
    style="padding: 0.5rem 1.5rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer; opacity: {canPost ? 1 : 0.5};"
  >
    {posting ? 'Posting…' : 'Post'}
  </button>
</main>
