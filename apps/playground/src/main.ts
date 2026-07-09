import "./styles.css";
import type { ElementRef } from "drawover";

const hostile = new URLSearchParams(window.location.search).has("hostile");
const outputFixture = new URLSearchParams(window.location.search).has(
  "output-fixture",
);

if (hostile) {
  const style = document.createElement("style");
  style.dataset.hostileFixture = "true";
  style.textContent = `
    body *:not(#drawover-root) {
      all: unset !important;
      box-sizing: border-box !important;
    }
  `;
  document.head.append(style);
}

const app = document.querySelector<HTMLElement>("#app");

if (!app) throw new Error("Playground root was not found.");

app.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="/">Northstar Shop</a>
    <nav aria-label="Checkout progress">
      <span>Cart</span><span class="active">Payment</span><span>Done</span>
    </nav>
  </header>
  <div class="page-shell">
    <section class="checkout-panel" aria-labelledby="checkout-title">
      <div class="heading-row">
        <div>
          <p class="eyebrow">Secure checkout</p>
          <h1 id="checkout-title">Payment details</h1>
        </div>
        <span class="status">Encrypted</span>
      </div>
      <form id="checkout">
        <label for="card-number">Card number</label>
        <input id="card-number" name="cardNumber" type="text" value="4242 4242 4242 4242" />
        <div class="field-grid">
          <div>
            <label for="expiry">Expiry date</label>
            <input id="expiry" data-testid="expiry-date" name="expiry" type="text" value="12 / 30" />
          </div>
          <div>
            <label for="security-code">Security code</label>
            <input id="security-code" data-testid="security-code" name="securityCode" type="text" value="123" />
          </div>
        </div>
        <label class="check-row">
          <input type="checkbox" checked />
          <span>Save this card for next time</span>
        </label>
        <button data-testid="checkout-submit" type="submit">Place order</button>
      </form>
    </section>
    <aside class="summary" aria-labelledby="summary-title">
      <p class="eyebrow">Order 1048</p>
      <h2 id="summary-title">Order summary</h2>
      <div class="line-item"><span>Design review seat</span><strong>$24.00</strong></div>
      <div class="line-item muted"><span>Tax</span><strong>$1.92</strong></div>
      <div class="total"><span>Total</span><strong>$25.92</strong></div>
    </aside>
  </div>
  <section class="targeting-lab" aria-labelledby="targeting-title">
    <div class="targeting-heading">
      <div>
        <p class="eyebrow">Element targeting fixture</p>
        <h2 id="targeting-title">Selector and metadata matrix</h2>
      </div>
      <output id="targeting-output" aria-live="polite">No element selected</output>
    </div>
    <div class="fixture-grid">
      <article class="fixture-card">
        <h3>Preferred selectors</h3>
        <button type="button" data-testid="fixture-testid">data-testid target</button>
        <button type="button" id="fixture-id">id target</button>
        <div class="stable-region"><button type="button" class="stable-action">stable path target</button></div>
        <div class="hash-region"><button type="button" class="css-1a2B3c styles_button__x7H2p">hashed class target</button></div>
      </article>
      <article class="fixture-card">
        <h3>Nesting and overlap</h3>
        <button type="button" class="nested-action"><span class="nested-label">nested label target</span></button>
        <div class="overlap-fixture" aria-label="Overlapping targets">
          <div class="overlap-back">back target</div>
          <div class="overlap-front">front target</div>
        </div>
      </article>
      <article class="fixture-card">
        <h3>Scrolled container</h3>
        <div class="scroll-fixture" tabindex="0">
          <p>Scroll this panel</p>
          <div class="scroll-spacer"></div>
          <button type="button" class="scrolled-action">scrolled target</button>
        </div>
      </article>
      <article class="fixture-card">
        <h3>Framework metadata</h3>
        <button type="button" id="react-fixture">React fiber target</button>
        <button type="button" id="vue-fixture">Vue component target</button>
        <button type="button" id="pass-through">Host click count: <span>0</span></button>
      </article>
    </div>
  </section>
  <div class="host-max-z" aria-hidden="true"></div>
`;

document.querySelector("form")?.addEventListener("submit", (event) => {
  event.preventDefault();
});

const reactFixture = document.querySelector("#react-fixture");
if (reactFixture) {
  function CheckoutAction(): null {
    return null;
  }
  Object.defineProperty(reactFixture, "__reactFiber$fixture", {
    value: {
      type: "button",
      return: {
        type: CheckoutAction,
        _debugSource: {
          fileName: "src/components/CheckoutAction.tsx",
          lineNumber: 24,
        },
        return: null,
      },
    },
  });
}

const vueFixture = document.querySelector("#vue-fixture");
if (vueFixture) {
  Object.defineProperty(vueFixture, "__vueParentComponent", {
    value: {
      type: {
        __name: "PaymentSummary",
        __file: "src/components/PaymentSummary.vue",
      },
    },
  });
}

document.querySelector("#pass-through")?.addEventListener("click", (event) => {
  const count = (event.currentTarget as HTMLElement).querySelector("span");
  if (count) count.textContent = String(Number(count.textContent) + 1);
});

if (import.meta.env.DEV || import.meta.env.VITE_DRAWOVER === "true") {
  void import("drawover").then(async (drawover) => {
    drawover.init({ position: "bottom-right", theme: "auto" });
    document
      .querySelector("#drawover-root")
      ?.addEventListener("drawover:element-selected", (event) => {
        const output = document.querySelector("#targeting-output");
        const reference = (event as CustomEvent<ElementRef>).detail;
        if (!output) return;
        const component = reference.component
          ? ` | ${reference.component.framework}:${reference.component.name}`
          : "";
        output.textContent = `${reference.selector.primary} | ${reference.facts.tag}${component}`;
      });
    if (outputFixture) {
      const { installOutputFixture } = await import("./output-fixture.js");
      installOutputFixture(drawover);
    }
  });
}
