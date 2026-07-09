import "./styles.css";

const hostile = new URLSearchParams(window.location.search).has("hostile");

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
  <div class="host-max-z" aria-hidden="true"></div>
`;

if (import.meta.env.DEV || import.meta.env.VITE_DRAWOVER === "true") {
  void import("drawover").then(({ init }) => {
    init({ position: "bottom-right", theme: "auto" });
  });
}
