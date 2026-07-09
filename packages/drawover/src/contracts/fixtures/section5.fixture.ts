import type { PageContext, SceneSnapshot, SerializedReview } from "../index.js";

export const section5PageContext = {
  url: "http://localhost:5173/checkout",
  pathname: "/checkout",
  viewport: { width: 1440, height: 900, devicePixelRatio: 2 },
  capturedAt: "2026-07-09T14:32:00Z",
} as const satisfies PageContext;

export const section5Scene = {
  version: 1,
  annotations: [
    {
      id: "annotation-1",
      type: "element-pin",
      geometry: { x: 812, y: 772, width: 24, height: 24 },
      z: 10,
      rotation: 0,
      comment: "This button should be disabled until the form validates",
      elementOffset: { x: 200, y: 24 },
      spatialDescription: 'bottom of <form id="checkout">',
      element: {
        selector: {
          primary: '[data-testid="checkout-submit"]',
          fallbacks: ['#checkout button[type="submit"]'],
        },
        facts: {
          tag: "button",
          role: "button",
          accessibleName: "Place order",
          text: "Place order",
          attributes: { type: "submit" },
          bbox: { x: 612, y: 748, width: 216, height: 48 },
        },
        component: {
          framework: "react",
          name: "CheckoutForm",
          source: { file: "src/components/CheckoutForm.tsx" },
        },
      },
    },
    {
      id: "annotation-2",
      type: "element-pin",
      geometry: { x: 394, y: 350, width: 24, height: 24 },
      z: 11,
      rotation: 0,
      comment: "Use the full card number label instead of an abbreviation",
      elementOffset: { x: 8, y: 8 },
      element: {
        selector: {
          primary: "#card-number",
          fallbacks: ['input[name="cardNumber"]'],
        },
        facts: {
          tag: "input",
          role: "textbox",
          accessibleName: "Card number",
          attributes: { type: "text", name: "cardNumber" },
          bbox: { x: 386, y: 342, width: 420, height: 44 },
        },
      },
    },
    {
      id: "annotation-3",
      type: "element-pin",
      geometry: { x: 394, y: 430, width: 24, height: 24 },
      z: 12,
      rotation: 0,
      comment: "Keep the validation message aligned with this field",
      elementOffset: { x: 8, y: 8 },
      element: {
        selector: {
          primary: '[data-testid="expiry-date"]',
          fallbacks: ['#checkout input[name="expiry"]'],
        },
        facts: {
          tag: "input",
          role: "textbox",
          accessibleName: "Expiry date",
          attributes: { type: "text", name: "expiry" },
          bbox: { x: 386, y: 422, width: 200, height: 44 },
        },
      },
    },
    {
      id: "annotation-4",
      type: "element-pin",
      geometry: { x: 614, y: 430, width: 24, height: 24 },
      z: 13,
      rotation: 0,
      comment: "Match the width of the neighboring expiry field",
      elementOffset: { x: 8, y: 8 },
      element: {
        selector: {
          primary: '[data-testid="security-code"]',
          fallbacks: ['#checkout input[name="securityCode"]'],
        },
        facts: {
          tag: "input",
          role: "textbox",
          accessibleName: "Security code",
          attributes: { type: "text", name: "securityCode" },
          bbox: { x: 606, y: 422, width: 200, height: 44 },
        },
      },
    },
    {
      id: "annotation-5",
      type: "rect",
      geometry: { x: 0, y: 0, width: 1440, height: 64 },
      z: 5,
      rotation: 0,
      stroke: "#2563eb",
      fill: "#dbeafe",
      strokeWidth: 2,
      label: "Home",
      labelAlign: "left",
      spatialDescription:
        "Full-width bar at top of page, ~64px tall, above <main>",
    },
    {
      id: "annotation-6",
      type: "text",
      geometry: { x: 1320, y: 18, width: 88, height: 28 },
      z: 6,
      rotation: 0,
      text: "Log out",
      color: "#111827",
      fontSize: 16,
      align: "right",
      spatialDescription:
        "Anchored near right edge of drawing [5], right-aligned",
      intent: "place alongside the proposed header",
    },
    {
      id: "annotation-7",
      type: "note",
      geometry: { x: 0, y: 0, width: 0, height: 0 },
      z: 0,
      rotation: 0,
      text: "Overall spacing feels cramped on mobile widths",
    },
  ],
} as const satisfies SceneSnapshot;

const jsonPayload = {
  drawoverVersion: 1,
  page: section5PageContext,
  annotations: section5Scene.annotations,
};

export const section5Expected = {
  markdown: `# UI Review — /checkout (drawover)

- URL: http://localhost:5173/checkout
- Viewport: 1440×900 @2x
- Captured: 2026-07-09T14:32:00Z
- Annotations: 4 element comments, 2 drawings, 1 note

## Element comments

### [1] "This button should be disabled until the form validates"
- Element: <button type="submit"> "Place order"
- Selector: [data-testid="checkout-submit"]
- Component: <CheckoutForm> (src/components/CheckoutForm.tsx)
- Position: 612,748 → 828,796 (doc coords); bottom of <form id="checkout">

### [2] "Use the full card number label instead of an abbreviation"
- Element: <input type="text" name="cardNumber"> "Card number"
- Selector: #card-number
- Position: 386,342 → 806,386 (doc coords)

### [3] "Keep the validation message aligned with this field"
- Element: <input type="text" name="expiry"> "Expiry date"
- Selector: [data-testid="expiry-date"]
- Position: 386,422 → 586,466 (doc coords)

### [4] "Match the width of the neighboring expiry field"
- Element: <input type="text" name="securityCode"> "Security code"
- Selector: [data-testid="security-code"]
- Position: 606,422 → 806,466 (doc coords)

## Drawings (proposed UI — these elements do NOT exist yet)

### [5] Rectangle: "Home"
- Full-width bar at top of page, ~64px tall, above <main>
- Doc coords: 0,0 → 1440,64
- Contains label text: "Home" (left side)

### [6] Text: "Log out"
- Anchored near right edge of drawing [5], right-aligned
- Intent: place alongside the proposed header

## General notes
- "Overall spacing feels cramped on mobile widths"`,
  json: JSON.stringify(jsonPayload, null, 2),
} as const satisfies SerializedReview;
