import type { PageContext, SceneSnapshot } from "../../contracts/index.js";

export const allAnnotationsPageContext = {
  url: "https://example.com/review?fixture=output",
  pathname: "/review",
  viewport: { width: 1280, height: 720, devicePixelRatio: 1.5 },
  capturedAt: "2026-07-09T18:45:30Z",
} as const satisfies PageContext;

export const allAnnotationsScene = {
  version: 1,
  annotations: [
    {
      id: "image-second",
      type: "image",
      geometry: { x: 840, y: 96, width: 320, height: 180 },
      z: 30,
      rotation: -5,
      dataUrl: "data:image/png;base64,ZmFrZQ==",
      alt: 'Account "empty state"',
      opacity: 0.75,
      spatialDescription: "Below <nav>, aligned with the right edge of <main>",
    },
    {
      id: "pin-third",
      type: "element-pin",
      geometry: { x: 120, y: 220, width: 24, height: 24 },
      z: 1,
      rotation: 0,
      comment: 'Rename "Save"\nto avoid ambiguity',
      elementOffset: { x: 12, y: 18 },
      spatialDescription: 'right side of <form id="profile">',
      element: {
        selector: {
          primary: "#profile-save",
          fallbacks: ['form#profile button[type="submit"]'],
        },
        facts: {
          tag: "button",
          text: "Save draft",
          attributes: {
            type: "submit",
            name: 'save"profile',
          },
          bbox: { x: 96, y: 196, width: 144, height: 48 },
        },
      },
    },
    {
      id: "arrow-fourth",
      type: "arrow",
      geometry: { x: 240, y: 128, width: 220, height: 96 },
      z: 20,
      rotation: 15,
      start: { x: 240, y: 224 },
      end: { x: 460, y: 128 },
      color: "#d92d20",
      strokeWidth: 3,
      spatialDescription: "From <aside> toward the new summary region",
    },
    {
      id: "rect-fifth",
      type: "rect",
      geometry: { x: 32, y: 80, width: 640, height: 72 },
      z: 0,
      rotation: 0,
      stroke: "#2563eb",
      fill: "#dbeafe",
      strokeWidth: 2,
    },
    {
      id: "text-sixth",
      type: "text",
      geometry: { x: 64, y: 98, width: 260, height: 32 },
      z: 10,
      rotation: 0,
      text: 'Welcome, "Ada"',
      color: "#111827",
      fontSize: 24,
      align: "left",
      intent: "Use as the proposed page heading",
    },
  ],
} as const satisfies SceneSnapshot;
