import "./styles.css";
import type { ElementRef } from "drawover";

type FixtureName = "framework" | "hostile" | "max-z" | "normal";

const search = new URLSearchParams(window.location.search);
const requestedFixture = search.get("fixture");
const fixture: FixtureName = search.has("hostile")
  ? "hostile"
  : isFixtureName(requestedFixture)
    ? requestedFixture
    : "normal";
const outputFixture = search.has("output-fixture");

document.body.dataset.fixture = fixture;

if (fixture === "hostile") {
  const style = document.createElement("style");
  style.dataset.hostileFixture = "true";
  style.textContent = `
    html body #app, html body #app * {
      all: unset !important;
      box-sizing: border-box !important;
      font: 11px monospace !important;
    }

    html body {
      display: block !important;
      min-height: 100vh !important;
      background: #fff3cd !important;
    }
  `;
  document.head.append(style);
}

const app = document.querySelector<HTMLElement>("#app");
if (!app) throw new Error("Playground root was not found.");

app.innerHTML = `
  <header class="site-header">
    <a class="wordmark" href="/?fixture=${fixture}">Northstar Shop</a>
    <nav aria-label="Checkout progress">
      <span>Cart</span><span class="active">Payment</span><span>Done</span>
    </nav>
  </header>
  <div class="fixture-bar" data-testid="fixture-bar">
    <strong>Fixture: ${fixture}</strong>
    <a href="/?fixture=normal">Normal</a>
    <a href="/?fixture=hostile">Hostile CSS</a>
    <a href="/?fixture=max-z">Max z-index</a>
    <a href="/?fixture=framework">Framework metadata</a>
  </div>
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
        <div class="delivery-options" data-fixture="stable-path">
          <button class="delivery-option" type="button">Standard delivery</button>
          <button class="delivery-option" type="button">Express delivery</button>
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
        <div class="stable-region"><button type="button" class="stable-action fixtureControlaB12Cdef checkoutButton_aB12Cdef">stable path target</button></div>
        <div class="hash-region"><button type="button" class="css-1a2B3c styles_button__x7H2p">hashed class target</button></div>
      </article>
      <article class="fixture-card">
        <h3>Nesting and overlap</h3>
        <button type="button" class="nested-action"><span class="nested-label">nested label target</span></button>
        <div class="overlap-fixture" data-fixture="overlap" aria-label="Overlapping targets">
          <div class="overlap-back">back target</div>
          <div class="overlap-front">front target</div>
        </div>
      </article>
      <article class="fixture-card">
        <h3>Scrolled container</h3>
        <div class="scroll-fixture" data-fixture="scroll-container" tabindex="0">
          <p>Scroll this panel</p>
          <div class="scroll-spacer"></div>
          <button type="button" class="scrolled-action" data-fixture="scrolled-target">scrolled target</button>
        </div>
      </article>
      <article class="fixture-card">
        <h3>Framework metadata</h3>
        <button type="button" id="react-fixture" data-framework-target="react">React fiber target</button>
        <button type="button" id="vue-fixture" data-framework-target="vue">Vue component target</button>
        <button type="button" id="pass-through">Host click count: <span>0</span></button>
      </article>
    </div>
  </section>
  ${
    fixture === "max-z"
      ? '<div class="host-max-z" data-testid="max-z-hostile">Host app at max z-index</div>'
      : ""
  }
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
    configurable: true,
    enumerable: true,
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
    configurable: true,
    enumerable: true,
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

function isFixtureName(value: string | null): value is FixtureName {
  return ["framework", "hostile", "max-z", "normal"].includes(value ?? "");
}
