/**
 * <blue-moji-picker>: a drop-in emoji picker backed by an AppView's
 * blue.moji.collection.searchItems query. Debounced search-as-you-type,
 * renders a grid of matches, and dispatches a "moji-pick" CustomEvent with
 * the chosen emoji's { uri, did, name, alt } when clicked — host apps decide
 * what to do with that (typically: insert ":alias:" into a composer).
 *
 * Attributes:
 *   api-base     REQUIRED. AppView origin to query and load blob images from,
 *                e.g. https://moji.blue. There is no default: which AppView
 *                you rely on is your choice. Must be https (or http://localhost)
 *                and expose blue.moji.collection.searchItems and an
 *                /img/{did}/{cid} blob proxy (or override the `imgUrl`
 *                property with a custom (did, cid) => string function).
 *                Without a valid one the picker makes no requests and says so.
 *   repo         Optional at-identifier. When set, searches substring-match
 *                within that repo's own collection (suited to "my collection"
 *                composer autocomplete). Omit for network-wide whole-word
 *                search (suited to a "discover emoji" browse surface).
 *   placeholder  Input placeholder text.
 *   limit        Max results per search (default 24).
 */
/**
 * The AppView origin from an `api-base` attribute, or null if it is missing or
 * unusable (not a URL, credentials in it, or http other than localhost).
 */
export function resolveApiBase(value: string | null | undefined): string | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const localhost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localhost)) return null;
  return url.origin;
}

export const NO_APPVIEW_MESSAGE =
  "No AppView configured: set the api-base attribute (for example https://moji.blue).";

export class BluemojiPicker extends HTMLElement {
  static observedAttributes = ["api-base", "repo", "placeholder", "limit"];

  #input?: HTMLInputElement;
  #results?: HTMLDivElement;
  #status?: HTMLParagraphElement;
  #debounceTimer?: ReturnType<typeof setTimeout>;
  #requestSeq = 0;

  /** Override to customise how a (did, cid) pair becomes an image URL. */
  imgUrl: (did: string, cid: string) => string = (did, cid) =>
    `${this.apiBase ?? ""}/img/${encodeURIComponent(did)}/${encodeURIComponent(cid)}`;

  /** The configured AppView origin, or null: there is deliberately no default. */
  get apiBase(): string | null {
    return resolveApiBase(this.getAttribute("api-base"));
  }

  attributeChangedCallback(name: string) {
    if (name === "api-base" && this.#status) this.#showConfigProblem();
  }

  #showConfigProblem() {
    this.#status!.textContent = this.apiBase ? "" : NO_APPVIEW_MESSAGE;
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
    this.#showConfigProblem();
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
    const base = this.apiBase;
    if (!base) {
      this.#status!.textContent = NO_APPVIEW_MESSAGE;
      this.dispatchEvent(new CustomEvent("moji-error", { detail: new Error(NO_APPVIEW_MESSAGE) }));
      return; // never guess an AppView to send the user's queries to
    }
    const seq = ++this.#requestSeq;
    this.#status!.textContent = "Searching…";

    const repo = this.getAttribute("repo");
    const limit = this.getAttribute("limit") || "24";
    const url = new URL("/xrpc/blue.moji.collection.searchItems", base);
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
