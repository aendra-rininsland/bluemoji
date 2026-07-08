<script lang="ts">
  import { callXrpc, getViewer } from '$hatk/client'
  import { aliasToRkey, normalizeAlias } from '$lib/alias'

  let { data } = $props()

  let fileInput = $state<HTMLInputElement | null>(null)
  let file = $state<File | null>(null)
  let emojiName = $state('')
  let altText = $state('')
  let adultOnly = $state(false)
  let asSticker = $state(true)
  let loading = $state(false)
  let error = $state('')
  let successUri = $state('')
  let previewUrl = $state('')

  const viewer = $derived(data.viewer)

  // RFC 0005: canonical alias + Punycode rkey preview
  const aliasCheck = $derived.by(() => {
    if (!emojiName.trim()) return { alias: '', rkey: '', error: '' }
    try {
      return { alias: normalizeAlias(emojiName), rkey: aliasToRkey(emojiName), error: '' }
    } catch (e: any) {
      return { alias: '', rkey: '', error: e.message as string }
    }
  })

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
        .replace(/[\s:]+/g, '-')
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

  function toBase64(bytes: ArrayBuffer): string {
    let binary = ''
    const chunk = 0x8000
    const arr = new Uint8Array(bytes)
    for (let i = 0; i < arr.length; i += chunk) {
      binary += String.fromCharCode(...arr.subarray(i, i + chunk))
    }
    return btoa(binary)
  }

  function fromBase64(b64: string, type: string): Blob {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type })
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

      let stickerFormats: Record<string, unknown> | undefined

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
          // Transcode to properly-sized animated WebP server-side (ffmpeg)
          // rather than storing the raw, unresized original — imgproxy
          // can't resize APNG on demand (RFC 0001 / imgproxy#1222), and the
          // old behaviour uploaded the source file byte-for-byte regardless
          // of its actual dimensions.
          try {
            const data = toBase64(await file.arrayBuffer())
            const { webp128, webp512 } = await callXrpc('blue.moji.collection.transcodeAnimation', { data })
            const { blob: webp128Blob } = await callXrpc('dev.hatk.uploadBlob', fromBase64(webp128, 'image/webp'))
            formats.webp_128 = webp128Blob
            if (asSticker && webp512) {
              const stickerBlob = fromBase64(webp512, 'image/webp')
              if (stickerBlob.size <= 512_000) {
                const { blob: webp512Blob } = await callXrpc('dev.hatk.uploadBlob', stickerBlob)
                stickerFormats = {
                  $type: 'blue.moji.collection.item#stickerFormats_v0',
                  webp_512: webp512Blob,
                }
              }
            }
          } catch (transcodeErr) {
            // Fall back to the old raw-upload behaviour rather than hard-
            // failing the whole upload if the transcode pipeline is down.
            console.error('Animation transcode failed, falling back to raw APNG upload', transcodeErr)
            const apngBlob = new Blob([await file.arrayBuffer()], { type: 'image/apng' })
            const { blob: apng128 } = await callXrpc('dev.hatk.uploadBlob', apngBlob)
            formats.apng_128 = apng128
          }
        } else if (kind === 'webp') {
          const webpBlob = await canvasToBlob(canvas, 'image/webp')
          const { blob: webp128 } = await callXrpc('dev.hatk.uploadBlob', webpBlob)
          formats.webp_128 = webp128
        }
      }

      // Static raster sticker rendition (skipped for apng, which already
      // produces its own animated stickerFormats above when successful)
      if (asSticker && !stickerFormats && (kind === 'png' || kind === 'webp')) {
        const canvas512 = await resizeCanvas(file, 512)
        const sticker = await canvasToBlob(canvas512, 'image/png')
        if (sticker.size <= 512_000) {
          const { blob: png512 } = await callXrpc('dev.hatk.uploadBlob', sticker)
          stickerFormats = {
            $type: 'blue.moji.collection.item#stickerFormats_v0',
            png_512: png512,
          }
        }
      }

      const alias = normalizeAlias(emojiName)
      const result = await callXrpc('blue.moji.collection.putItem', {
        repo: v.did,
        item: {
          name: `:${alias}:`,
          alt: altText || undefined,
          createdAt: new Date().toISOString(),
          adultOnly,
          formats,
          ...(stickerFormats ? { stickerFormats } : {}),
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
          style="flex: 1; padding: 0.5rem; border: 1px solid var(--border); border-radius: 0; font-family: var(--mono); background: var(--bg); color: var(--text); min-width: 0;"
        />
        <span
          style="padding: 0.5rem 0.625rem; border: 1px solid var(--border); border-left: none; border-radius: 0 4px 4px 0; color: var(--muted); background: var(--border); font-family: var(--mono); line-height: 1.5;"
        >:</span>
      </div>
      {#if aliasCheck.error}
        <p style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--danger);">{aliasCheck.error}</p>
      {:else if aliasCheck.rkey && aliasCheck.rkey !== aliasCheck.alias}
        <p style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--muted);">
          :{aliasCheck.alias}: — stored as <code>{aliasCheck.rkey}</code>
        </p>
      {:else}
        <p style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--muted);">
          Any language or emoji works — no spaces or colons
        </p>
      {/if}
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

    <!-- Sticker -->
    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none;">
      <input type="checkbox" bind:checked={asSticker} />
      Also generate a full-size sticker (512px, shareable as a post attachment)
    </label>

    <!-- Adult only -->
    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; user-select: none;">
      <input type="checkbox" bind:checked={adultOnly} />
      Mark as adult-only content
    </label>

    <div>
      <button
        type="submit"
        disabled={loading || !file || !!aliasCheck.error}
        style="padding: 0.5rem 1.25rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; opacity: {loading || !file || aliasCheck.error ? 0.5 : 1};"
      >
        {loading ? 'Uploading…' : 'Upload emoji'}
      </button>
    </div>
  </form>

  {#if error}
    <p style="margin-top: 1rem; color: var(--danger);">{error}</p>
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
