<script lang="ts">
  import '../app.css'
  import { page } from '$app/state'

  let { children } = $props()

  const navItems = [
    { href: '/', label: 'Home', icon: 'A' },
    { href: '/gallery', label: 'Trending', icon: 'B' },
    { href: '/packs', label: 'Packs', icon: 'C' },
  ]
</script>

<div class="site-marquee" aria-hidden="true">
  <div class="site-marquee__track">
    ★☆★ WELCOME TO BLUEMOJI ★☆★ CUSTOM EMOJI FOR ATPROTO ★☆★ NEW STICKERS EVERY WEEK ★☆★ SIGN THE GUESTBOOK ★☆★ BEST VIEWED AT 800x600 ★☆★
  </div>
</div>

<img src="/logo-badge.png" alt="" class="corner-badge" aria-hidden="true" />

<div class="petshell">
  <div class="petshell__brand" aria-hidden="true">
    <span class="petshell__ear"></span>
    <img src="/logo-badge.png" alt="" class="petshell__logo" />
    <span class="petshell__wordmark">bluemoji&trade;</span>
    <span class="petshell__ear"></span>
  </div>

  <div class="petshell__screen">
    {@render children()}
  </div>

  <nav class="petshell__nav" aria-label="Main">
    {#each navItems as item (item.href)}
      <a href={item.href} class:on={page.url.pathname === item.href}>
        <span class="petshell__navbtn">{item.icon}</span>
        {item.label}
      </a>
    {/each}
  </nav>
</div>

<style>
  .corner-badge {
    position: fixed;
    bottom: 14px;
    right: 14px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    box-shadow:
      0 0 0 3px var(--accent-3),
      0 4px 14px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    z-index: 500;
    animation: badge-wobble 3s ease-in-out infinite;
  }

  @keyframes badge-wobble {
    0%,
    100% {
      transform: rotate(-4deg);
    }
    50% {
      transform: rotate(4deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .corner-badge {
      animation: none;
    }
  }

  /* ---------- Mobile: "Cyber Pet" device-bezel shell ----------
     Invisible/no-op at desktop widths — only the .petshell__screen
     wrapper exists so children() is rendered exactly once regardless of
     viewport, and only takes on the device chrome below 640px. */
  .petshell {
    display: contents;
  }

  .petshell__brand,
  .petshell__nav {
    display: none;
  }

  @media (max-width: 640px) {
    .corner-badge {
      display: none;
    }

    .petshell {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      background: linear-gradient(160deg, #8b5cf6 0%, #a06bf0 45%, #6d3fc2 100%);
      padding: 14px 10px calc(72px + env(safe-area-inset-bottom, 0px));
    }

    .petshell__brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 6px 0 12px;
    }

    .petshell__ear {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #ff6ec7;
      box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5);
    }

    .petshell__logo {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.6);
    }

    .petshell__wordmark {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #fff;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
    }

    .petshell__screen {
      flex: 1;
      background: linear-gradient(180deg, #cdfacb, #a9e8a4);
      border-radius: 22px;
      box-shadow:
        inset 0 0 0 6px #1f3d1a,
        inset 0 0 24px rgba(0, 0, 0, 0.25);
      padding: 4px;
      position: relative;
      overflow: hidden;
      color: #1f3d1a;
      /* Override the desktop GeoCities palette locally (custom properties
         cascade to every descendant that reads var(--bg) etc.) so real
         page content reads correctly against the green LCD glass instead
         of GeoCities purple. */
      --bg: transparent;
      --text: #1f3d1a;
      --muted: #4d6b45;
      --border: #7fae52;
    }

    .petshell__screen::after {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        180deg,
        rgba(0, 0, 0, 0.05) 0px,
        rgba(0, 0, 0, 0.05) 1px,
        transparent 1px,
        transparent 3px
      );
      pointer-events: none;
      z-index: 2;
    }

    .petshell__screen :global(h1) {
      -webkit-text-fill-color: initial;
      background: none;
      color: #1f3d1a;
      text-shadow: none;
      font-family: var(--font);
      font-weight: 800;
    }

    .petshell__screen :global(h2),
    .petshell__screen :global(h3) {
      color: #2b4020;
      text-shadow: none;
    }

    .petshell__screen :global(a) {
      color: #6d3fc2;
    }

    .petshell__nav {
      display: flex;
      justify-content: space-around;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(180deg, #7a4bd8, #5c34a8);
      padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
      z-index: 500;
    }

    .petshell__nav a {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #e8d9ff;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      text-decoration: none;
    }

    .petshell__nav a.on {
      color: #fff;
    }

    .petshell__navbtn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--mono);
      font-weight: 900;
      font-size: 13px;
      color: #2b4020;
      background: radial-gradient(circle at 35% 30%, #fff, #b8e986 55%, #7fae52 100%);
      box-shadow:
        0 3px 0 #5c8038,
        inset 0 0 0 2px rgba(255, 255, 255, 0.4);
    }

    .petshell__nav a.on .petshell__navbtn {
      box-shadow:
        0 3px 0 #5c8038,
        inset 0 0 0 2px rgba(255, 255, 255, 0.4),
        0 0 0 3px var(--accent-3, #ffe500);
    }
  }
</style>
