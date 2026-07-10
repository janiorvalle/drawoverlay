/** A point measured from the document's top-left corner in CSS pixels. */
export interface DocumentPoint {
  x: number;
  y: number;
}

/** A rectangle measured in document coordinates in CSS pixels. */
export interface DocumentRect extends DocumentPoint {
  width: number;
  height: number;
}

/** Fields shared by every persisted annotation. */
export interface AnnotationBase {
  id: string;
  /** Bounding geometry in document coordinates, never viewport coordinates. */
  geometry: DocumentRect;
  /** Stacking order within the SVG scene. */
  z: number;
  /** Clockwise rotation in degrees around the annotation center. */
  rotation: number;
}

/** A best-effort source location reported by a framework's development metadata. */
export interface SourceLocation {
  file: string;
  line?: number;
  column?: number;
}

/** Optional framework component information. It must be omitted when unknown. */
export interface ComponentRef {
  framework: "react" | "vue";
  name: string;
  source?: SourceLocation;
}

/** Stable selector candidates ordered from most to least precise. */
export interface SelectorChain {
  primary: string;
  fallbacks: readonly string[];
}

/** Read-only facts captured from a host-page element. */
export interface ElementFacts {
  tag: string;
  role?: string;
  accessibleName?: string;
  /** Trimmed text content, limited to 120 characters by the producer. */
  text?: string;
  attributes: Readonly<
    Partial<Record<"type" | "name" | "placeholder" | "href", string>>
  >;
  /** Element bounds in document coordinates at capture time. */
  bbox: DocumentRect;
}

/**
 * Portable reference produced by element targeting and consumed by pins and
 * output. Producers must never guess component or source information.
 */
export interface ElementRef {
  selector: SelectorChain;
  facts: ElementFacts;
  component?: ComponentRef;
}

/** A proposed rectangle drawing. */
export interface RectAnnotation extends AnnotationBase {
  type: "rect";
  stroke: string;
  fill: string;
  strokeWidth: number;
  label?: string;
  labelAlign?: "left" | "center" | "right";
  spatialDescription?: string;
}

/** A proposed straight arrow with document-coordinate endpoints. */
export interface ArrowAnnotation extends AnnotationBase {
  type: "arrow";
  start: DocumentPoint;
  end: DocumentPoint;
  color: string;
  strokeWidth: number;
  spatialDescription?: string;
}

/** A proposed freestanding text drawing. */
export interface TextAnnotation extends AnnotationBase {
  type: "text";
  text: string;
  color: string;
  fontSize: number;
  align: "left" | "center" | "right";
  spatialDescription?: string;
  intent?: string;
}

/** A proposed image stored wholly in the scene as a data URL. */
export interface ImageAnnotation extends AnnotationBase {
  type: "image";
  dataUrl: string;
  alt: string;
  opacity: number;
  spatialDescription?: string;
}

/** A numbered comment attached to a host-page element. */
export interface ElementPinAnnotation extends AnnotationBase {
  type: "element-pin";
  comment: string;
  element: ElementRef;
  /** Pin position relative to the referenced element's top-left corner. */
  elementOffset: DocumentPoint;
  spatialDescription?: string;
}

/** Frozen scene annotation contract shared by all product domains. */
export type Annotation =
  | RectAnnotation
  | ArrowAnnotation
  | TextAnnotation
  | ImageAnnotation
  | ElementPinAnnotation;

/** Versioned, serializable scene snapshot. */
export interface SceneSnapshot {
  version: 1;
  annotations: readonly Annotation[];
}
