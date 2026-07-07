<script lang="ts">
  import { callXrpc, getViewer } from '$hatk/client'

  let { data } = $props()

  let fileInput = $state<HTMLInputElement | null>(null)
  let file = $state<File | null>(null)
  let emojiName = $state('')
  let altText = $state('')
  let adultOnly = $state(false)
  let loading = $state(false)
  let error = $state('')
  let successUri = $state('')
  let previewUrl = $state('')

  const viewer = $derived(data.viewer)

  function detectKind(f: File): 'png' | 'apng' | 'webp' | 'lottie' {
    if (f.type === 'image/apng' || f.name.endsWith('.apng')) return 'apng'
    if (f.type === 'image/webp') return 'webp'
    if (
      f.type === 'application/json' ||
      f.type === 'application/lottie+zip' ||
      f.name.endsWith('.lottie') ||
      f.name.endsWith('.json')
    )
      return 'lottie'
    return 'png'
  }

  function onFileChange(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0]
    if (!f) return
    if (f.size > 1_000_000) {
      error = 'File too large (max 1 MB)'
      return
    }
    error = ''
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    file = f
    previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : ''
    if (!emojiName) {
      emojiName = f.name
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9_-]/gi, '-')
        .toLowerCase()
    }
  }

  async function resizeCanvas(f: File, size: number): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(f, { resizeWidth: size, resizeHeight: size })
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
    bitmap.close()
    return canvas
  }

  function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
    return new Promise((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas export failed'))), type)
    )
  }

  async function upload() {
    const v = viewer ?? getViewer()
    if (!v || !file) return

    loading = true
    error = ''
    successUri = ''

    try {
      const kind = detectKind(file)
      const { blob: original } = await callXrpc('dev.hatk.uploadBlob', file)

      const formats: Record<string, unknown> = {
        $type: 'blue.moji.collection.item#formats_v1',
        original,
      }

      if (kind === 'lottie') {
        // The lottie blob IS the original for Lottie files
        formats.lottie = original
      } else {
        const canvas = await resizeCanvas(file, 128)

        // Static PNG fallback — always useful, canvas gives first frame for APNG
        const pngBlob = await canvasToBlob(canvas, 'image/png')
        const { blob: png128 } = await callXrpc('dev.hatk.uploadBlob', pngBlob)
        formats.png_128 = png128

        if (kind === 'apng') {
          // Upload the full APNG source for animated playback
          const apngBlob = new Blob([await file.arrayBuffer()], { type: 'image/apng' })
          const { blob: apng128 } = await callXrpc('dev.hatk.uploadBlob', apngBlob)
          formats.apng_128 = apng128
        } else if (kind === 'webp') {
          const webpBlob = await canvasToBlob(canvas, 'image/webp')
          const { blob: webp128 } = await callXrpc('dev.hatk.uploadBlob', webpBlob)
          formats.webp_128 = webp128
        }
      }

      const rkey = emojiName.replace(/:/g, '')
      const result = await callXrpc('blue.moji.collection.putItem', {
        repo: v.did,
        item: {
          name: `:${rkey}:`,
          alt: altText || undefined,
          createdAt: new Date().toISOString(),
          adultOnly,
          formats,
        } as any,
      })

      successUri = result.uri
      file = null
      emojiName = ''
      altText = ''
      adultOnly = false
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = '' }
      if (fileInput) fileInput.value = ''
    } catch (e: any) {
      error = e.message ?? 'Upload failed'
    } finally {
      loading = false
    }
  }
</script>

<main style="max-width: 600px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 1.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › upload</span>
  </h1>

  <form
    onsubmit={(e) => { e.preventDefault(); upload() }}
    style="display: flex; flex-direction: column; gap: 1.25rem;"
  >
    <!-- File picker -->
    <div>
      <label for="file" style="display: block; margin-bottom: 0.375rem; font-weight: 500;">
        Emoji file
      </label>
      <input
        bind:this={fileInput}
        id="file"
        type="file"
        accept="image/png,image/apng,image/webp,application/json,.lottie"
        onchange={onFileChange}
        required
        style="display: block; width: 100%;"
      />
      <p style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--muted);">
        PNG, APNG, WebP, or Lottie — max 1 MB
      </p>
    </div>

    <!-- Preview -->
    {#if previewUrl && file}
      <div
        style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 6px;"
      >
        <img
          src={previewUrl}
          alt="preview"
          style="width: 64px; height: 64px; object-fit: contain; image-rendering: pixelated; border-radius: 4px; background: repeating-conic-gradient(#ddd 0% 25%, #fff 0% 50%) 0 0 / 16px 16px;"
        />
        <div style="overflow: hidden;">
          <p style="font-family: var(--mono); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            {file.name}
          </p>
          <p style="font-size: 0.875rem; color: var(--muted);">
            {(file.size / 1024).toFixed(1)} KB · {file.type || 'unknown type'}
          </p>
        </div>
      </div>
    {/if}

    <!-- Name -->
    <div>
      <label for="name" style="display: block; margin-bottom: 0.375rem; font-weight: 500;">
        Name
      </label>
      <div style="display: flex; align-items: stretch;">
        <span
          style="padding: 0.5rem 0.625rem; border: 1px solid var(--border); border-right: none; border-radius: 4px 0 0 4px; color: var(--muted); background: var(--border); font-family: var(--mono); line-height: 1.5;"
        >:</span>
        <input
          id="name"
          type="text"
          bind:value={emojiName}
          placeholder="emoji-name"
          required
          pattern="[a-z0-9_-]+"
          style="flex: 1; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0; font-family: var(--mono); background: var(--bg); color: var(--text); min-width: 0;"
        />
        <span
          style="padding: 0.5rem 0.625rem; border: 1px solid var(--border); border-left: none; border-radius: 0 4px 4px 0; color: var(--muted); background: var(--border); font-family: var(--mono); line-height: 1.5;"
        >:</span>
      </div>
      <p style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--muted);">
        Lowercase letters, numbers, hyphens, underscores only
      </p>
    </div>

    <!-- Alt text -->
    <div>
      <label for="alt" style="display: block; margin-bottom: 0.375rem; font-weight: 500;">
        Alt text
        <span style="font-weight: 400; color: var(--muted);">(optional)</span>
      </label>
      <input
        id="alt"
        type="text"
        bind:value={altText}
        placeholder="Describe the emoji for screen readers"
        style="width: 100%; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
      />
    </div>

    <!-- Adult only -->
    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none;">
      <input type="checkbox" bind:checked={adultOnly} />
      Mark as adult-only content
    </label>

    <div>
      <button
        type="submit"
        disabled={loading || !file}
        style="padding: 0.5rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; opacity: {loading || !file ? 0.5 : 1};"
      >
        {loading ? 'Uploading…' : 'Upload emoji'}
      </button>
    </div>
  </form>

  {#if error}
    <p style="margin-top: 1rem; color: red;">{error}</p>
  {/if}

  {#if successUri}
    <div
      style="margin-top: 1rem; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 6px;"
    >
      <p style="color: green; margin-bottom: 0.375rem;">Emoji uploaded successfully.</p>
      <code style="font-size: 0.8125rem; color: var(--muted); word-break: break-all;">{successUri}</code>
    </div>
  {/if}
</main>
