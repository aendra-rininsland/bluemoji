/**
 * <blue-moji-picker>: a drop-in emoji picker backed by an AppView's
 * blue.moji.collection.searchItems query. Debounced search-as-you-type,
 * renders a grid of matches, and dispatches a "moji-pick" CustomEvent with
 * the chosen emoji's { uri, did, name, alt } when clicked — host apps decide
 * what to do with that (typically: insert ":alias:" into a composer).
 *
 * Attributes:
 *   api-base     AppView origin to query and load blob images from.
 *                Defaults to https://moji.blue. Must expose
 *                blue.moji.collection.searchItems and an /img/{did}/{cid}
 *                blob proxy (or override via the `img-url` property with a
 *                custom (did, cid) => string function).
 *   repo         Optional at-identifier. When set, searches substring-match
 *                within that repo's own collection (suited to "my collection"
 *                composer autocomplete). Omit for network-wide whole-word
 *                search (suited to a "discover emoji" browse surface).
 *   placeholder  Input placeholder text.
 *   limit        Max results per search (default 24).
 */
export class BluemojiPicker extends HTMLElement {
  static observedAttributes = ["api-base", "repo", "placeholder", "limit"];

  #input?: HTMLInputElement;
  #results?: HTMLDivElement;
  #status?: HTMLParagraphElement;
  #debounceTimer?: ReturnType<typeof setTimeout>;
  #requestSeq = 0;

  /** Override to customise how a (did, cid) pair becomes an image URL. */
  imgUrl: (did: string, cid: string) => string = (did, cid) =>
    `${this.apiBase}/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`;

  get apiBase(): string {
    return this.getAttribute("api-base") || "https://moji.blue";
  }

  connectedCallback() {
    this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { display: block; font: inherit; }
      input {
        width: 100%; box-sizing: border-box; padding: 0.5rem;
        border: 1px solid #ccc; border-radius: 4px; font: inherit;
      }
      .results {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
        gap: 0.375rem; margin-top: 0.5rem; max-height: 240px; overflow-y: auto;
      }
      button.item {
        display: flex; flex-direction: column; align-items: center; gap: 0.125rem;
        padding: 0.375rem; border: none; background: none; border-radius: 6px;
        cursor: pointer; font: inherit;
      }
      button.item:hover, button.item:focus-visible { background: rgba(0,0,0,0.08); }
      button.item img { width: 32px; height: 32px; object-fit: contain; display: block; }
      button.item span {
        font-size: 0.625rem; max-width: 48px; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap;
      }
      .status { font-size: 0.8125rem; color: #666; margin: 0.375rem 0 0; }
    `;
    this.shadowRoot!.appendChild(style);

    this.#input = document.createElement("input");
    this.#input.type = "text";
    this.#input.placeholder = this.getAttribute("placeholder") || "Search emoji…";
    this.#input.addEventListener("input", () => this.#onInput());
    this.shadowRoot!.appendChild(this.#input);

    this.#status = document.createElement("p");
    this.#status.className = "status";
    this.shadowRoot!.appendChild(this.#status);

    this.#results = document.createElement("div");
    this.#results.className = "results";
    this.shadowRoot!.appendChild(this.#results);
  }

  disconnectedCallback() {
    clearTimeout(this.#debounceTimer);
  }

  #onInput() {
    clearTimeout(this.#debounceTimer);
    const q = this.#input!.value.trim();
    if (!q) {
      this.#renderResults([]);
      this.#status!.textContent = "";
      return;
    }
    this.#debounceTimer = setTimeout(() => this.#search(q), 250);
  }

  async #search(q: string) {
    const seq = ++this.#requestSeq;
    this.#status!.textContent = "Searching…";

    const repo = this.getAttribute("repo");
    const limit = this.getAttribute("limit") || "24";
    const url = new URL("/xrpc/blue.moji.collection.searchItems", this.apiBase);
    url.searchParams.set("q", q);
    url.searchParams.set("limit", limit);
    if (repo) url.searchParams.set("repo", repo);

    let items: any[] = [];
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      items = body.items ?? [];
    } catch (err) {
      if (seq !== this.#requestSeq) return; // a newer search superseded this one
      this.#status!.textContent = "Search failed.";
      this.#renderResults([]);
      this.dispatchEvent(new CustomEvent("moji-error", { detail: err }));
      return;
    }

    if (seq !== this.#requestSeq) return; // stale response, a newer query is in flight
    this.#status!.textContent = items.length === 0 ? "No matches." : "";
    this.#renderResults(items);
  }

  #renderResults(items: any[]) {
    this.#results!.replaceChildren();
    for (const item of items) {
      const cid = item.formats?.png_128 ?? item.formats?.webp_128 ?? item.formats?.gif_128;
      const cidLink = cid?.ref?.$link ?? (typeof cid === "string" ? cid : undefined);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "item";
      button.title = item.name;

      if (cidLink && item.did) {
        const img = document.createElement("img");
        img.src = this.imgUrl(item.did, cidLink);
        img.alt = item.alt ?? item.name;
        button.appendChild(img);
      }

      const label = document.createElement("span");
      label.textContent = item.name;
      button.appendChild(label);

      button.addEventListener("click", () => {
        this.dispatchEvent(
          new CustomEvent("moji-pick", {
            detail: { uri: item.uri, did: item.did, name: item.name, alt: item.alt },
            bubbles: true,
            composed: true,
          }),
        );
      });

      this.#results!.appendChild(button);
    }
  }

  static register() {
    if (!customElements.get("blue-moji-picker")) {
      customElements.define("blue-moji-picker", BluemojiPicker);
    }
  }
}
