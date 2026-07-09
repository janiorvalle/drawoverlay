import "./styles.css";

type FixtureName = "framework" | "hostile" | "max-z" | "normal";

const search = new URLSearchParams(window.location.search);
const requestedFixture = search.get("fixture");
const fixture: FixtureName = search.has("hostile")
  ? "hostile"
  : isFixtureName(requestedFixture)
    ? requestedFixture
    : "normal";

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
          <button class="delivery-option fixtureControlaB12Cdef checkoutButton_aB12Cdef" type="button">
            Standard delivery
          </button>
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
      <div class="scroll-fixture" data-fixture="scroll-container" tabindex="0">
        <div class="scroll-spacer">Scrollable fixture start</div>
        <button type="button" data-fixture="scrolled-target">Target inside scroller</button>
      </div>
      <div class="overlap-fixture" data-fixture="overlap">
        <button class="overlap-back" type="button">Back target</button>
        <button class="overlap-front" type="button">Front target</button>
      </div>
      <div class="framework-fixtures" data-fixture="framework-metadata">
        <button data-framework-target="react" type="button">React checkout action</button>
        <button data-framework-target="vue" type="button">Vue checkout action</button>
      </div>
    </aside>
  </div>
  ${
    fixture === "max-z"
      ? '<div class="host-max-z" data-testid="max-z-hostile">Host app at max z-index</div>'
      : ""
  }
`;

installFrameworkMetadataFixtures();

if (import.meta.env.DEV || import.meta.env.VITE_DRAWOVER === "true") {
  void import("drawover").then(({ init }) => {
    init({ position: "bottom-right", theme: "auto" });
  });
}

function isFixtureName(value: string | null): value is FixtureName {
  return ["framework", "hostile", "max-z", "normal"].includes(value ?? "");
}

function installFrameworkMetadataFixtures(): void {
  const reactTarget = document.querySelector<HTMLElement>(
    '[data-framework-target="react"]',
  );
  const vueTarget = document.querySelector<HTMLElement>(
    '[data-framework-target="vue"]',
  );

  if (!reactTarget || !vueTarget) {
    throw new Error("Framework metadata fixture targets were not found.");
  }

  Object.defineProperty(reactTarget, "__reactFiber$drawoverFixture", {
    configurable: true,
    enumerable: true,
    value: {
      _debugSource: {
        fileName: "src/components/CheckoutForm.tsx",
        lineNumber: 42,
      },
      type: { displayName: "CheckoutForm" },
    },
  });
  Object.defineProperty(vueTarget, "__vueParentComponent", {
    configurable: true,
    enumerable: true,
    value: {
      type: {
        __file: "src/components/CheckoutAction.vue",
        name: "CheckoutAction",
      },
    },
  });
}
