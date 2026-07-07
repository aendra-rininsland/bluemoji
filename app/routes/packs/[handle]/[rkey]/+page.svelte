<script lang="ts">
  import { callXrpc } from '$hatk/client'
  import { invalidateAll } from '$app/navigation'

  let { data } = $props()

  let hovered = $state<string | null>(null)
  let showPicker = $state(false)
  let busy = $state<string | null>(null) // uri of the item being acted on, or '*' for copy-all
  let error = $state('')
  let copied = $state<Set<string>>(new Set())
  let shareCopied = $state(false)

  const inPack = $derived(new Set(data.items.map((i: any) => i.subject.uri).filter(Boolean)))

  async function shareLink() {
    const url = `${location.origin}/packs/${data.pack.creator.did}/${data.packUri.split('/').pop()}`
    await navigator.clipboard.writeText(url)
    shareCopied = true
    setTimeout(() => (shareCopied = false), 2000)
  }

  async function addToPack(subjectUri: string) {
    if (!data.viewer) return
    busy = subjectUri
    error = ''
    try {
      await callXrpc('dev.hatk.createRecord', {
        collection: 'blue.moji.packs.packitem',
        repo: data.viewer.did,
        record: {
          $type: 'blue.moji.packs.packitem',
          subject: subjectUri,
          pack: data.packUri,
          createdAt: new Date().toISOString(),
        },
      })
      await invalidateAll()
    } catch (e: any) {
      error = e.message ?? 'Failed to add emoji to pack'
    } finally {
      busy = null
    }
  }

  async function removeFromPack(packItemUri: string) {
    busy = packItemUri
    error = ''
    try {
      await callXrpc('dev.hatk.deleteRecord', {
        collection: 'blue.moji.packs.packitem',
        rkey: packItemUri.split('/').pop(),
      })
      await invalidateAll()
    } catch (e: any) {
      error = e.message ?? 'Failed to remove emoji from pack'
    } finally {
      busy = null
    }
  }

  /** Copy one pack item's blobs + record into the signed-in user's repo. */
  async function copyItem(item: any) {
    const { subject } = item
    if (!data.viewer || !subject.did || !subject.uri) return

    const rkey = (subject.name as string).replace(/:/g, '')
    const formats: Record<string, unknown> = {
      $type: 'blue.moji.collection.item#formats_v1',
    }

    for (const key of ['original', 'png_128', 'apng_128', 'gif_128', 'webp_128', 'lottie']) {
      const ref = subject.formats?.[key]
      const cid = ref?.ref?.$link
      if (!cid) continue
      const url = blobFetchUrl(item, cid)
      if (!url) continue
      const res = await fetch(url)
      if (!res.ok) continue
      const bytes = await res.blob()
      const { blob } = await callXrpc('dev.hatk.uploadBlob', bytes)
      formats[key] = blob
    }

    await callXrpc('dev.hatk.putRecord', {
      collection: 'blue.moji.collection.item',
      rkey,
      record: {
        $type: 'blue.moji.collection.item',
        name: subject.name,
        alt: subject.alt,
        createdAt: new Date().toISOString(),
        adultOnly: subject.adultOnly ?? false,
        copyOf: subject.uri,
        formats,
      },
    })
  }

  function blobFetchUrl(item: any, cid: string): string | null {
    // Same-origin /img/{did}/{cid} proxy URLs: swap the trailing CID segment.
    if (!item.subject?.did) return null
    return `/img/${encodeURIComponent(item.subject.did)}/${encodeURIComponent(cid)}`
  }

  async function copyOne(item: any) {
    busy = item.subject.uri ?? null
    error = ''
    try {
      await copyItem(item)
      copied = new Set([...copied, item.subject.uri as string])
    } catch (e: any) {
      error = e.message ?? 'Copy failed'
    } finally {
      busy = null
    }
  }

  async function copyAll() {
    busy = '*'
    error = ''
    try {
      for (const item of data.items) {
        if (!item.subject.uri || copied.has(item.subject.uri ?? '')) continue
        await copyItem(item)
        copied = new Set([...copied, item.subject.uri as string])
      }
    } catch (e: any) {
      error = e.message ?? 'Copy failed'
    } finally {
      busy = null
    }
  }
</script>

<main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 1.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › pack</span>
  </h1>

  <!-- Pack header -->
  <div style="display: flex; gap: 1.25rem; align-items: flex-start; padding: 1.25rem; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 1.5rem; flex-wrap: wrap;">
    {#if data.pack.avatar}
      <img src={data.pack.avatar} alt="" width="72" height="72" style="border-radius: 12px; object-fit: cover;" />
    {:else}
      <div style="width: 72px; height: 72px; border-radius: 12px; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 2rem;">
        📦
      </div>
    {/if}
    <div style="flex: 1; min-width: 200px;">
      <h2 style="margin-bottom: 0.25rem;">{data.pack.name}</h2>
      <p style="font-size: 0.875rem; color: var(--muted); margin-bottom: 0.5rem;">
        by @{data.pack.creator.handle} · {data.pack.packItemCount ?? data.items.length} emoji{(data.pack.packItemCount ?? data.items.length) === 1 ? '' : 's'}
      </p>
      {#if data.pack.description}
        <p style="font-size: 0.9375rem;">{data.pack.description}</p>
      {/if}
    </div>
    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
      <button
        onclick={shareLink}
        style="padding: 0.375rem 0.875rem; border: 1px solid var(--border); background: none; color: var(--text); border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
      >
        {shareCopied ? 'Link copied!' : 'Share pack'}
      </button>
      {#if data.viewer && !data.isOwner}
        <button
          onclick={copyAll}
          disabled={busy !== null}
          style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer; opacity: {busy !== null ? 0.5 : 1};"
        >
          {busy === '*' ? 'Copying…' : 'Copy all to my collection'}
        </button>
      {/if}
      {#if data.isOwner}
        <button
          onclick={() => (showPicker = !showPicker)}
          style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
        >
          {showPicker ? 'Done' : '+ Add emoji'}
        </button>
      {/if}
    </div>
  </div>

  {#if error}
    <p style="color: red; margin-bottom: 1rem;">{error}</p>
  {/if}

  <!-- Owner: add-from-collection picker -->
  {#if data.isOwner && showPicker}
    <div style="padding: 1rem; border: 1px dashed var(--border); border-radius: 8px; margin-bottom: 1.5rem;">
      <p style="font-weight: 500; margin-bottom: 0.75rem;">Add from your collection</p>
      {#if data.collection.length === 0}
        <p style="color: var(--muted); font-size: 0.875rem;">
          Your collection is empty. <a href="/upload">Upload an emoji</a> first.
        </p>
      {:else}
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.5rem;">
          {#each data.collection as emoji (emoji.uri)}
            <button
              onclick={() => addToPack(emoji.uri)}
              disabled={inPack.has(emoji.uri) || busy !== null}
              style="display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.5rem; border: 1px solid var(--border); border-radius: 6px; background: none; cursor: pointer; opacity: {inPack.has(emoji.uri) ? 0.4 : 1};"
              title={inPack.has(emoji.uri) ? 'Already in pack' : `Add ${emoji.name}`}
            >
              {#if emoji.imageUrl}
                <img src={emoji.imageUrl} alt={emoji.name} width="40" height="40" style="object-fit: contain;" />
              {/if}
              <span style="font-family: var(--mono); font-size: 0.6875rem; color: var(--text); word-break: break-all;">
                {emoji.name}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Pack items -->
  {#if data.items.length === 0}
    <div style="text-align: center; padding: 3rem 2rem; color: var(--muted); border: 1px dashed var(--border); border-radius: 8px;">
      <p>This pack is empty{data.isOwner ? ' — add some emoji from your collection!' : '.'}</p>
    </div>
  {:else}
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">
      {#each data.items as item (item.uri)}
        <div
          style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.75rem 0.5rem; border: 1px solid var(--border); border-radius: 8px;"
          onmouseenter={() => (hovered = item.uri)}
          onmouseleave={() => (hovered = null)}
          role="img"
          aria-label={item.subject.alt || item.subject.name}
        >
          <div style="width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 12px 12px; border-radius: 4px; overflow: hidden;">
            {#if item.imageUrl || item.animatedUrl}
              <img
                src={hovered === item.uri && item.animatedUrl ? item.animatedUrl : (item.imageUrl ?? item.animatedUrl ?? '')}
                alt={item.subject.alt || item.subject.name}
                width="64"
                height="64"
                style="object-fit: contain; image-rendering: pixelated; width: 100%; height: 100%;"
              />
            {:else}
              <span style="font-size: 1.5rem; color: var(--muted);">?</span>
            {/if}
          </div>
          <span style="font-family: var(--mono); font-size: 0.75rem; text-align: center; word-break: break-all; line-height: 1.3;">
            {item.subject.name}
          </span>
          {#if item.subject.adultOnly}
            <span style="font-size: 0.625rem; padding: 0.125rem 0.375rem; background: var(--border); color: var(--muted); border-radius: 999px;">18+</span>
          {/if}
          {#if item.subject.stickerFormats}
            <span style="font-size: 0.625rem; padding: 0.125rem 0.375rem; background: var(--border); color: var(--muted); border-radius: 999px;" title="Has full-size sticker formats">sticker</span>
          {/if}

          {#if data.isOwner}
            <button
              onclick={() => removeFromPack(item.uri)}
              disabled={busy !== null}
              style="font-size: 0.75rem; padding: 0.25rem 0.625rem; border: 1px solid var(--border); background: none; color: var(--muted); border-radius: 4px; cursor: pointer;"
            >
              {busy === item.uri ? 'Removing…' : 'Remove'}
            </button>
          {:else if data.viewer}
            <button
              onclick={() => copyOne(item)}
              disabled={busy !== null || copied.has(item.subject.uri ?? '')}
              style="font-size: 0.75rem; padding: 0.25rem 0.625rem; border: 1px solid var(--border); background: none; color: var(--text); border-radius: 4px; cursor: pointer; opacity: {copied.has(item.subject.uri ?? '') ? 0.5 : 1};"
            >
              {copied.has(item.subject.uri ?? '') ? 'Copied ✓' : busy === item.subject.uri ? 'Copying…' : 'Copy'}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</main>
