<script lang="ts">
  import { callXrpc } from '$hatk/client'
  import { goto } from '$app/navigation'

  let { data } = $props()

  let text = $state('')
  let selected = $state<(typeof data.stickers)[number] | null>(null)
  let posting = $state(false)
  let error = $state('')

  function blobRefCid(ref: unknown): string | undefined {
    return (ref as { ref?: { $link?: string } } | undefined)?.ref?.$link
  }

  async function submitPost() {
    if (!selected) return
    posting = true
    error = ''
    try {
      const sf = selected.stickerFormats ?? {}
      const formats: Record<string, unknown> = { $type: 'blue.moji.embed.sticker#formats_v0' }
      for (const key of ['png_512', 'webp_512', 'gif_512', 'apng_512', 'lottie']) {
        const cid = blobRefCid(sf[key])
        if (cid) formats[key] = cid
      }

      const embed = {
        $type: 'blue.moji.embed.sticker',
        sticker: {
          $type: 'blue.moji.embed.sticker#sticker',
          record: { $type: 'com.atproto.repo.strongRef', uri: selected.uri, cid: selected.cid },
          did: selected.did,
          name: selected.name,
          alt: selected.alt,
          formats,
        },
      }

      const { uri } = await callXrpc('dev.hatk.createRecord', {
        collection: 'app.bsky.feed.post',
        repo: data.viewer.did,
        record: {
          $type: 'app.bsky.feed.post',
          text,
          createdAt: new Date().toISOString(),
          embed,
        },
      })

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

  <textarea
    bind:value={text}
    placeholder="What's on your mind?"
    rows="4"
    maxlength="300"
    style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text); resize: vertical; margin-bottom: 1.5rem; font-size: 1rem;"
  ></textarea>

  <h2 style="font-size: 1rem; margin-bottom: 0.75rem;">Attach a sticker</h2>

  {#if data.stickers.length === 0}
    <div style="text-align: center; padding: 2rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px; margin-bottom: 1.5rem;">
      <p>No stickers yet. <a href="/upload">Upload an emoji</a> with full-size formats to make it sticker-capable.</p>
    </div>
  {:else}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 0.5rem; margin-bottom: 1.5rem;">
      {#each data.stickers as sticker (sticker.uri)}
        <button
          onclick={() => (selected = sticker)}
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

  {#if selected}
    <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem;">
      <p style="font-size: 0.875rem; color: var(--muted);">Preview:</p>
      {#if selected.fullsizeUrl}
        <img src={selected.fullsizeUrl} alt={selected.alt || selected.name} style="max-width: 200px; max-height: 200px; object-fit: contain;" />
      {/if}
    </div>
  {/if}

  {#if error}
    <p style="color: red; margin-bottom: 1rem;">{error}</p>
  {/if}

  <button
    onclick={submitPost}
    disabled={!selected || posting}
    style="padding: 0.5rem 1.5rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; cursor: pointer; opacity: {!selected || posting ? 0.5 : 1};"
  >
    {posting ? 'Posting…' : 'Post'}
  </button>
</main>
