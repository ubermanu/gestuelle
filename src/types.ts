export type PointerType = 'mouse' | 'touch' | 'pen' | string

/**
 * Defines the states of our gesture recognition FSM.
 * This helps prevent conflicting gestures from being recognized simultaneously.
 */
export enum GestureState {
  IDLE = 'IDLE',
  POSSIBLE_TAP = 'POSSIBLE_TAP',
  PRESSING = 'PRESSING',
  PANNING = 'PANNING',
  SWIPING = 'SWIPING',
  CANCELED = 'CANCELED',
}

interface GestureEventDetail {
  /** The current X coordinate of the primary pointer relative to the viewport. */
  x: number
  /** The current Y coordinate of the primary pointer relative to the viewport. */
  y: number
  /** The type of pointer that triggered the event (e.g., "mouse", "touch", "pen"). */
  pointerType: PointerType
  /** The DOM element on which the gesture started. */
  target: EventTarget | null
}

/**
 * Defines the detailed data provided with each pan gesture event.
 */
export interface PanEventDetail extends GestureEventDetail {
  /** The change in X coordinate since the last pan event. */
  deltaX: number
  /** The change in Y coordinate since the last pan event. */
  deltaY: number
  /** The total change in X coordinate from the pan start point. */
  offsetX: number
  /** The total change in Y coordinate from the pan start point. */
  offsetY: number
}

/**
 * Defines the detailed data provided with tap gesture events.
 */
export interface TapEventDetail extends GestureEventDetail {}

/**
 * Defines the detailed data provided with press gesture events.
 */
export interface PressEventDetail extends GestureEventDetail {
  /** The duration (in milliseconds) the pointer was held down for a press. */
  duration: number
}

/**
 * Defines the detailed data provided with swipe gesture events.
 */
export interface SwipeEventDetail extends GestureEventDetail {
  /** The velocity of the swipe in pixels per millisecond along the X axis. */
  velocityX: number
  /** The velocity of the swipe in pixels per millisecond along the Y axis. */
  velocityY: number
  /** The overall magnitude of the swipe velocity. */
  velocity: number
  /** The direction of the swipe ('up', 'down', 'left', 'right'). */
  direction: SwipeDirection
  /** The total distance moved during the swipe. */
  distance: number
}

export type SwipeDirection = 'up' | 'down' | 'left' | 'right'

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
 * Configuration options for the tap gesture.
 */
export interface TapGestureConfig {
  /**
   * The maximum duration (in milliseconds) between pointerdown and pointerup for a tap to be recognized.
   * @default 250
   */
  maxDuration?: number
  /**
   * The maximum distance (in pixels) the pointer can move during a tap.
   * @default 10
   */
  maxDistance?: number
}

/**
 * Configuration options for the press (long press) gesture.
 */
export interface PressGestureConfig {
  /**
   * The minimum duration (in milliseconds) the pointer must be held down for a press to be recognized.
   * @default 500
   */
  minDuration?: number
  /**
   * The maximum distance (in pixels) the pointer can move during a press without canceling it.
   * @default 10
   */
  maxDistance?: number
}

/**
 * Configuration options for the swipe gesture.
 */
export interface SwipeGestureConfig {
  /**
   * The minimum velocity (pixels per millisecond) required for a swipe to be recognized.
   * @default 0.3
   */
  minVelocity?: number
  /**
   * The minimum distance (in pixels) the pointer must move for a swipe to be recognized.
   * @default 30
   */
  minDistance?: number
  /**
   * The maximum duration (in milliseconds) for a swipe gesture.
   * @default 300
   */
  maxDuration?: number
}

/**
 * Overall configuration for the Gestuelle library, specifying options for each gesture.
 */
export interface GestuelleConfig {
  /** Configuration specific to the pan gesture. */
  pan?: PanGestureConfig
  /** Configuration specific to the tap gesture. */
  tap?: TapGestureConfig
  /** Configuration specific to the press (long press) gesture. */
  press?: PressGestureConfig
  /** Configuration specific to the swipe gesture. */
  swipe?: SwipeGestureConfig
}

export interface GestuelleEventMap {
  panstart: CustomEvent<PanEventDetail>
  panmove: CustomEvent<PanEventDetail>
  panend: CustomEvent<PanEventDetail>
  pancancel: CustomEvent<PanEventDetail>
  tap: CustomEvent<TapEventDetail>
  pressstart: CustomEvent<PressEventDetail>
  pressend: CustomEvent<PressEventDetail>
  presscancel: CustomEvent<PressEventDetail>
  swipe: CustomEvent<SwipeEventDetail>
}
