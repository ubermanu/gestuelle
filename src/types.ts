// TODO: type Gesture = "tap" | "press" | "pan" | "pinch" | "rotate" | "swipe";

export type PointerType = 'mouse' | 'touch' | 'pen' | string

/**
 * Defines the detailed data provided with each pan gesture event.
 */
export interface PanEventDetail {
  /** The current X coordinate of the primary pointer relative to the viewport. */
  x: number
  /** The current Y coordinate of the primary pointer relative to the viewport. */
  y: number
  /** The change in X coordinate since the last pan event. */
  deltaX: number
  /** The change in Y coordinate since the last pan event. */
  deltaY: number
  /** The total change in X coordinate from the pan start point. */
  offsetX: number
  /** The total change in Y coordinate from the pan start point. */
  offsetY: number
  /** The type of pointer that triggered the event. */
  pointerType: PointerType
  /** The DOM element on which the gesture started. */
  target: EventTarget | null
}

/**
 * Configuration options for the pan gesture.
 */
export interface PanGestureConfig {
  /**
   * The minimum distance (in pixels) the pointer must move before 'panstart' fires.
   * @default 5
   */
  threshold?: number
}

/**
 * Overall configuration for the Gestuelle library, specifying options for each gesture.
 */
export interface GestuelleConfig {
  /** Configuration specific to the pan gesture. */
  pan?: PanGestureConfig
}

declare global {
  interface HTMLElementEventMap {
    panstart: CustomEvent<PanEventDetail>
    panmove: CustomEvent<PanEventDetail>
    panend: CustomEvent<PanEventDetail>
    pancancel: CustomEvent<PanEventDetail>
  }
}
