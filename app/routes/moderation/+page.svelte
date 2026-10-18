<script lang="ts">
  import { callXrpc } from '$hatk/client'
  import { invalidateAll } from '$app/navigation'

  let { data } = $props()

  const VALUES = [
    ['bluemoji-takedown', 'Take down (remove from moji.blue)'],
    ['bluemoji-adult', 'Mark adult-only'],
    ['bluemoji-abusive', 'Abusive'],
    ['bluemoji-impersonation', 'Impersonation']
  ] as const

  let uri = $state('')
  let val = $state<string>('bluemoji-takedown')
  let expires = $state('')
  let reason = $state('')
  let busy = $state(false)
  let error = $state('')
  let done = $state('')

  // Start from a pre-filled link (?uri=…) once, without tracking later changes to it
  $effect.pre(() => {
    if (data.prefill && !uri) uri = data.prefill
  })

  const isEmoji = (u: string) => u.includes('/blue.moji.collection.item/')

  async function submit(target: string, value: string, neg: boolean) {
    busy = true
    error = ''
    done = ''
    try {
      await callXrpc('blue.moji.moderation.applyLabel', {
        uri: target,
        val: value,
        neg,
        ...(!neg && expires ? { exp: new Date(expires).toISOString() } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {})
      })
      done = `${neg ? 'Lifted' : 'Applied'} ${value} on ${target}`
      if (!neg) {
        uri = ''
        reason = ''
        expires = ''
      }
      await invalidateAll()
    } catch (e: any) {
      error = e.message ?? 'Failed'
    } finally {
      busy = false
    }
  }

  const active = $derived(data.labels.filter((l: any) => !l.neg))
  const lifted = $derived(data.labels.filter((l: any) => l.neg))
</script>

<svelte:head>
  <title>Moderation — moji.blue</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main style="max-width: 900px; margin: 0 auto; padding: 2rem;">
  <h1 style="margin-bottom: 0.5rem;">
    <a href="/" style="color: inherit;">bluemoji</a>
    <span style="color: var(--muted); font-weight: 400;"> › moderation</span>
  </h1>

  {#if !data.labelerEnabled}
    <p style="padding: 1rem; border: 1px dashed var(--border); border-radius: 6px; color: var(--muted);">
      The labeler isn't configured on this AppView (<code>LABELER_DID</code> and
      <code>LABELER_SIGNING_KEY</code> aren't set), so labels can't be applied.
    </p>
  {:else}
    <p style="color: var(--muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
      Labels on emoji are published, signed, from the moji.blue labeler. moji.blue itself acts on
      takedown and adult-only. Account takedowns are made with the admin tools and appear here
      automatically.
    </p>

    <form
      onsubmit={(e) => { e.preventDefault(); if (uri.trim()) submit(uri.trim(), val, false) }}
      style="display: grid; gap: 0.5rem; margin-bottom: 1rem;"
    >
      <label style="display: grid; gap: 0.25rem; font-size: 0.8125rem;">
        Emoji (at:// URI)
        <input
          id="mod-uri"
          bind:value={uri}
          placeholder="at://did:plc:…/blue.moji.collection.item/blobcat"
          style="padding: 0.375rem 0.625rem; border: 1px solid var(--border); border-radius: 4px; font-family: var(--mono); font-size: 0.8125rem;"
        />
      </label>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <label style="display: grid; gap: 0.25rem; font-size: 0.8125rem;">
          Label
          <select id="mod-val" bind:value={val} style="padding: 0.375rem; border: 1px solid var(--border); border-radius: 4px;">
            {#each VALUES as [v, text]}<option value={v}>{text}</option>{/each}
          </select>
        </label>
        <label style="display: grid; gap: 0.25rem; font-size: 0.8125rem;">
          Expires (optional)
          <input id="mod-exp" type="datetime-local" bind:value={expires} style="padding: 0.3rem; border: 1px solid var(--border); border-radius: 4px;" />
        </label>
      </div>
      <label style="display: grid; gap: 0.25rem; font-size: 0.8125rem;">
        Reason (private, kept for the audit trail)
        <input id="mod-reason" bind:value={reason} maxlength="1000" style="padding: 0.375rem 0.625rem; border: 1px solid var(--border); border-radius: 4px;" />
      </label>
      <div>
        <button
          type="submit"
          disabled={busy || !uri.trim() || !isEmoji(uri.trim())}
          style="padding: 0.375rem 0.875rem; background: var(--accent); color: #fff; border: none; border-radius: 4px; font-size: 0.875rem; cursor: pointer;"
        >
          {busy ? 'Applying…' : 'Apply label'}
        </button>
        {#if uri.trim() && !isEmoji(uri.trim())}
          <span style="color: #c00; font-size: 0.8125rem; margin-left: 0.5rem;">That isn't an emoji record URI.</span>
        {/if}
      </div>
    </form>
    {#if error}<p role="alert" style="color: #c00; font-size: 0.875rem;">{error}</p>{/if}
    {#if done}<p role="status" style="color: var(--muted); font-size: 0.875rem;">{done}</p>{/if}

    <h2 style="font-size: 1rem; margin: 1.5rem 0 0.5rem;">Active labels</h2>
    {#if active.length === 0}
      <p style="color: var(--muted); font-size: 0.875rem;">None.</p>
    {:else}
      <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.375rem;">
        {#each active as l (l.uri + l.val)}
          <li data-label={l.val} style="display: flex; gap: 0.75rem; align-items: baseline; padding: 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: 6px; flex-wrap: wrap;">
            <code style="font-size: 0.75rem;">{l.val}</code>
            <span style="font-family: var(--mono); font-size: 0.75rem; word-break: break-all; flex: 1;">{l.uri}</span>
            <span style="color: var(--muted); font-size: 0.6875rem;">
              {new Date(l.cts).toLocaleString()}{l.exp ? ` · expires ${new Date(l.exp).toLocaleString()}` : ''}
            </span>
            {#if isEmoji(l.uri)}
              <button
                onclick={() => submit(l.uri, l.val, true)}
                disabled={busy}
                style="font-size: 0.75rem; padding: 0.125rem 0.5rem; border: 1px solid var(--border); background: none; border-radius: 4px; cursor: pointer;"
              >Lift</button>
            {:else}
              <span style="color: var(--muted); font-size: 0.6875rem;">account · managed from takedowns</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    {#if lifted.length}
      <h2 style="font-size: 1rem; margin: 1.5rem 0 0.5rem;">Lifted</h2>
      <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 0.25rem; color: var(--muted);">
        {#each lifted as l (l.uri + l.val)}
          <li style="font-size: 0.75rem;"><code>{l.val}</code> <span style="font-family: var(--mono); word-break: break-all;">{l.uri}</span> · lifted {new Date(l.cts).toLocaleString()}</li>
        {/each}
      </ul>
    {/if}
  {/if}
</main>
