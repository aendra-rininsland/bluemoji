export class BluemojiWebComponent extends HTMLElement {
  static observedAttributes = ["src", "size", "alt", "style"];
  img?: HTMLImageElement;

  connectedCallback() {
    const size = this.getAttribute("size");

    this.attachShadow({ mode: "open" });

    this.img = document.createElement("img");

    this.shadowRoot?.appendChild(this.img);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    switch (name) {
      case "size": {
        this.img?.setAttribute("width", newValue);
        this.img?.setAttribute("height", newValue);
      }
      default: {
        this.img?.setAttribute(name, newValue);
      }
    }
  }

  register() {
    try {
      customElements.define("blue-moji", BluemojiWebComponent);
    } catch (e) {
      console.error(e);
    }
  }
}
