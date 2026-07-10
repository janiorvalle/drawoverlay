/**
 * Hand-rolled inline SVG icon set (16×16 stroke icons + the 24×24 logo
 * mark, PLAN.md Phase 2.5). No icon dependency, no external requests —
 * geometry only, colored via currentColor so tokens theme it for free.
 */

const STROKE =
  'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

const ICON_PATHS: Record<string, string> = {
  comment: `<path d="M13 8a5 5 0 01-7.4 4.4L3 13l.7-2.5A5 5 0 1113 8z" ${STROKE}/>`,
  pen: `<path d="M3 13l1-3.5 6.5-6.5a1.4 1.4 0 012 2L6 11.5 3 13z" ${STROKE}/>`,
  select: `<path d="M3 2l10 4.5-4.2 1.6L7.2 12.5z" ${STROKE}/>`,
  rect: `<rect x="2.5" y="3.5" width="11" height="9" rx="1" ${STROKE}/>`,
  ellipse: `<circle cx="8" cy="8" r="5.5" ${STROKE}/>`,
  arrow: `<path d="M3 13L13 3m0 0H7m6 0v6" ${STROKE}/>`,
  line: `<path d="M3 13L13 3" ${STROKE}/>`,
  text: `<path d="M3 4h10M8 4v9" ${STROKE}/>`,
  image: `<rect x="2.5" y="3" width="11" height="10" rx="1" ${STROKE}/><circle cx="6" cy="6.5" r="1" fill="currentColor"/><path d="M4 11.5l3-3 2 2 2.5-2.5 2 2" fill="none" stroke="currentColor" stroke-width="1.3"/>`,
  undo: `<path d="M4 6h6a3.5 3.5 0 010 7H6M4 6l2.5-2.5M4 6l2.5 2.5" ${STROKE}/>`,
  redo: `<path d="M12 6H6a3.5 3.5 0 000 7h4M12 6L9.5 3.5M12 6l-2.5 2.5" ${STROKE}/>`,
  "send-back": `<rect x="6" y="2.5" width="7.5" height="7.5" rx="1" ${STROKE}/><rect x="2.5" y="7" width="6" height="6" rx="1" fill="currentColor" opacity="0.45"/>`,
  "send-backward": `<path d="M4 6.5L8 10l4-3.5" ${STROKE}/><path d="M4 3.5L8 7l4-3.5" ${STROKE} opacity="0.45"/>`,
  "bring-forward": `<path d="M4 9.5L8 6l4 3.5" ${STROKE}/><path d="M4 12.5L8 9l4 3.5" ${STROKE} opacity="0.45"/>`,
  "bring-front": `<rect x="6" y="2.5" width="7.5" height="7.5" rx="1" fill="currentColor" opacity="0.45"/><rect x="2.5" y="7" width="6" height="6" rx="1" ${STROKE}/>`,
  copy: `<rect x="5.5" y="5.5" width="8" height="8" rx="1.5" ${STROKE}/><path d="M3 10V4a1.5 1.5 0 011.5-1.5H10" ${STROKE}/>`,
  camera: `<rect x="2" y="4.5" width="12" height="9" rx="1.5" ${STROKE}/><circle cx="8" cy="9" r="2.4" ${STROKE}/><path d="M6 4.5L7 3h2l1 1.5" ${STROKE}/>`,
  trash: `<path d="M3 4.5h10M6.5 4V3h3v1M4.5 4.5l.6 8a1 1 0 001 .9h3.8a1 1 0 001-.9l.6-8" ${STROKE}/>`,
  close: `<path d="M4 4l8 8M12 4l-8 8" ${STROKE}/>`,
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** Create a 16×16 decorative icon. Buttons keep their aria-labels. */
export function icon(name: string): SVGSVGElement {
  const paths: string | undefined = ICON_PATHS[name];
  if (!paths) throw new Error(`Unknown drawover icon: ${name}`);
  return svgElement("0 0 16 16", paths);
}

/**
 * The "nib in frame" logo mark: a solid pen inside a viewport frame —
 * drawing over the page. Replaced the stroke-over-frame mark, whose thin
 * squiggle collapsed into a "disabled" slash at trigger size.
 */
export function logoMark(): SVGSVGElement {
  return svgElement(
    "0 0 24 24",
    `<rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
     <path d="M8.2 16.2l1-3.4 5.5-5.5a1.7 1.7 0 012.4 2.4l-5.5 5.5-3.4 1z" fill="currentColor"/>`,
  );
}

/** Replace a button's text content with an icon, preserving its aria-label. */
export function applyIcon(target: HTMLElement, name: string): void {
  target.textContent = "";
  target.append(icon(name));
}

function svgElement(viewBox: string, content: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  // Geometry is a fixed local literal, never user input.
  svg.innerHTML = content;
  return svg;
}
