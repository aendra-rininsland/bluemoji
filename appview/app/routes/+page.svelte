<script lang="ts">
  import { login, logout } from "$hatk/client";
  import { invalidateAll } from "$app/navigation";

  let { data } = $props();
  let handle = $state("");
  let loading = $state(false);
  let error = $state("");

  const did = $derived(data.viewer?.did ?? null);

  async function handleLogin() {
    if (!handle.trim()) return;
    loading = true;
    error = "";
    try {
      await login(handle);
    } catch (e: any) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function handleLogout() {
    await logout();
    await invalidateAll();
  }
</script>

<main style="max-width: 600px; margin: 0 auto; padding: 2rem;">
  <h1>bluemoji</h1>

  {#if did}
    <p style="margin: 1rem 0; color: var(--muted);">
      Signed in as <code>{did}</code>
    </p>
    <button onclick={handleLogout}>Sign out</button>
  {:else}
    <form
      onsubmit={handleLogin}
      style="margin: 1rem 0; display: flex; gap: 0.5rem;"
    >
      <input
        type="text"
        bind:value={handle}
        placeholder="your.handle"
        style="flex: 1; padding: 0.5rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);"
      />
      <button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
    {#if error}
      <p style="color: red;">{error}</p>
    {/if}
  {/if}
</main>
