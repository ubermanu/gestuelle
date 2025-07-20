import {
  type GestuelleConfig,
  type GestuelleEventMap,
  GestureState,
  type PointerType,
  type SwipeDirection,
} from './types'

interface ActivePointer {
  /** The unique ID of the pointer. */
  id: number
  /** Initial X coordinate when pointerdown occurred. */
  startX: number
  /** Initial Y coordinate when pointerdown occurred. */
  startY: number
  /** Current X coordinate. */
  currentX: number
  /** Current Y coordinate. */
  currentY: number
  /** Type of pointer (mouse, touch, pen). */
  pointerType: PointerType
  /** Timestamp of pointerdown for duration calculations. */
  downTime: number
}

/**
 * The core handler class for Gestuelle. Manages event listeners and gesture recognition
 * for a single DOM element.
 */
class Gestuelle {
  readonly element: HTMLElement
  readonly config: GestuelleConfig

  private activePointers: Map<number, ActivePointer> = new Map()
  private currentGestureState: GestureState = GestureState.IDLE

  private pressTimeoutId: number | null = null

  // Initial coordinates for gesture start (used for pan, tap, press distance calculations)
  private gestureStartX: number = 0
  private gestureStartY: number = 0

  constructor(element: HTMLElement, config: GestuelleConfig) {
    this.element = element
    this.config = config
    this.addEventListeners()
  }

  private addEventListeners(): void {
    this.element.addEventListener('pointerdown', this.onPointerDown)
    this.element.addEventListener('pointermove', this.onPointerMove)
    this.element.addEventListener('pointerup', this.onPointerUp)
    this.element.addEventListener('pointercancel', this.onPointerCancel)
  }

  private removeEventListeners(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown)
    this.element.removeEventListener('pointermove', this.onPointerMove)
    this.element.removeEventListener('pointerup', this.onPointerUp)
    this.element.removeEventListener('pointercancel', this.onPointerCancel)
  }

  private onPointerDown = (event: PointerEvent): void => {
    event.preventDefault()

    // If there are already an active pointer (e.g., multi-touch scenario where another
    // finger is already down), ignore subsequent `pointerdown` events for pan.
    if (this.activePointers.size > 0) {
      return
    }

    this.activePointers.set(event.pointerId, {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      pointerType: event.pointerType,
      downTime: performance.now(),
    })

    this.gestureStartX = event.clientX
    this.gestureStartY = event.clientY

    this.currentGestureState = GestureState.POSSIBLE_TAP

    const pressConfig = this.config.press
    const minPressDuration = pressConfig?.minDuration ?? 500
    this.pressTimeoutId = window.setTimeout(this.onPressTimeout, minPressDuration)

    // Request pointer capture. This ensures that subsequent `pointermove`,
    // `pointerup`, and `pointercancel` events for this pointerId will be
    // dispatched to *this* element, even if the pointer moves outside its bounds.
    this.element.setPointerCapture(event.pointerId)
  }

  private onPressTimeout = (): void => {
    if (this.currentGestureState === GestureState.POSSIBLE_TAP) {
      this.currentGestureState = GestureState.PRESSING
      const primaryPointer = this.activePointers.values().next().value
      if (primaryPointer) {
        this.dispatchGestureEvent('pressstart', {
          x: primaryPointer.currentX,
          y: primaryPointer.currentY,
          pointerType: primaryPointer.pointerType,
          duration: performance.now() - primaryPointer.downTime,
        })
      }
    }
    this.pressTimeoutId = null
  }

  private onPointerMove = (event: PointerEvent): void => {
    const pointer = this.activePointers.get(event.pointerId)

    if (!pointer) {
      return
    }

    const deltaX = event.clientX - pointer.currentX
    const deltaY = event.clientY - pointer.currentY

    pointer.currentX = event.clientX
    pointer.currentY = event.clientY

    const offsetX = pointer.currentX - this.gestureStartX
    const offsetY = pointer.currentY - this.gestureStartY
    const currentDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

    const panConfig = this.config.pan
    const panThreshold = panConfig?.threshold ?? 5

    switch (this.currentGestureState) {
      case GestureState.POSSIBLE_TAP:
        // If movement exceeds tap/press max distance, it's no longer a tap/press
        if (currentDistance >= panThreshold) {
          this.clearPressTimeout()
          this.currentGestureState = GestureState.PANNING
          this.dispatchGestureEvent('panstart', {
            x: pointer.currentX,
            y: pointer.currentY,
            deltaX: deltaX,
            deltaY: deltaY,
            offsetX: offsetX,
            offsetY: offsetY,
            pointerType: pointer.pointerType,
          })
        }
        break

      case GestureState.PRESSING: {
        const pressConfig = this.config.press
        const maxPressDistance = pressConfig?.maxDistance ?? 10

        // If a press moves too far, it cancels the press and might become a pan
        if (currentDistance >= maxPressDistance) {
          this.dispatchGestureEvent('presscancel', {
            x: pointer.currentX,
            y: pointer.currentY,
            pointerType: pointer.pointerType,
            duration: performance.now() - pointer.downTime,
          })
          this.currentGestureState = GestureState.PANNING
          this.dispatchGestureEvent('panstart', {
            x: pointer.currentX,
            y: pointer.currentY,
            deltaX: deltaX,
            deltaY: deltaY,
            offsetX: offsetX,
            offsetY: offsetY,
            pointerType: pointer.pointerType,
          })
        }
        break
      }

      case GestureState.PANNING:
        this.dispatchGestureEvent('panmove', {
          x: pointer.currentX,
          y: pointer.currentY,
          deltaX: deltaX,
          deltaY: deltaY,
          offsetX: offsetX,
          offsetY: offsetY,
          pointerType: pointer.pointerType,
        })
        break

      case GestureState.IDLE:
      case GestureState.SWIPING:
      case GestureState.CANCELED:
        break
    }
  }

  private onPointerUp = (event: PointerEvent): void => {
    const pointer = this.activePointers.get(event.pointerId)

    if (!pointer) {
      return
    }

    // Release pointer capture immediately
    this.element.releasePointerCapture(event.pointerId)
    this.activePointers.delete(event.pointerId)

    const duration = performance.now() - pointer.downTime
    const offsetX = pointer.currentX - this.gestureStartX
    const offsetY = pointer.currentY - this.gestureStartY
    const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)

    switch (this.currentGestureState) {
      case GestureState.POSSIBLE_TAP: {
        this.clearPressTimeout()
        const tapConfig = this.config.tap
        const maxTapDuration = tapConfig?.maxDuration ?? 250
        const maxTapDistance = tapConfig?.maxDistance ?? 10

        if (duration <= maxTapDuration && distance <= maxTapDistance) {
          this.dispatchGestureEvent('tap', {
            x: pointer.currentX,
            y: pointer.currentY,
            pointerType: pointer.pointerType,
          })
        }
        break
      }

      case GestureState.PRESSING:
        this.clearPressTimeout()
        this.dispatchGestureEvent('pressend', {
          x: pointer.currentX,
          y: pointer.currentY,
          pointerType: pointer.pointerType,
          duration: duration,
        })
        break

      case GestureState.PANNING: {
        const swipeConfig = this.config.swipe
        const minSwipeVelocity = swipeConfig?.minVelocity ?? 0.3
        const minSwipeDistance = swipeConfig?.minDistance ?? 30
        const maxSwipeDuration = swipeConfig?.maxDuration ?? 300

        const velocityX = offsetX / duration
        const velocityY = offsetY / duration
        const velocity = Math.sqrt(velocityX * velocityX + velocityY * velocityY)

        if (velocity >= minSwipeVelocity && distance >= minSwipeDistance && duration <= maxSwipeDuration) {
          let direction: SwipeDirection | undefined

          if (Math.abs(offsetX) > Math.abs(offsetY)) {
            direction = offsetX > 0 ? 'right' : 'left'
          } else {
            direction = offsetY > 0 ? 'down' : 'up'
          }

          this.dispatchGestureEvent('swipe', {
            x: pointer.currentX,
            y: pointer.currentY,
            pointerType: pointer.pointerType,
            velocityX: velocityX,
            velocityY: velocityY,
            velocity: velocity,
            direction: direction,
            distance: distance,
          })

          this.currentGestureState = GestureState.SWIPING
        } else {
          // Not a swipe, just a regular pan end
          this.dispatchGestureEvent('panend', {
            x: pointer.currentX,
            y: pointer.currentY,
            deltaX: 0,
            deltaY: 0,
            offsetX: offsetX,
            offsetY: offsetY,
            pointerType: pointer.pointerType,
          })
        }
        break
      }

      case GestureState.IDLE:
      case GestureState.SWIPING:
      case GestureState.CANCELED:
        break
    }

    this.resetGestureState()
  }

  private onPointerCancel = (event: PointerEvent): void => {
    const pointer = this.activePointers.get(event.pointerId)

    if (!pointer) {
      return
    }

    this.element.releasePointerCapture(event.pointerId)
    this.activePointers.delete(event.pointerId)
    this.clearPressTimeout()

    switch (this.currentGestureState) {
      case GestureState.POSSIBLE_TAP:
      case GestureState.PRESSING:
        this.dispatchGestureEvent('presscancel', {
          x: pointer.currentX,
          y: pointer.currentY,
          pointerType: pointer.pointerType,
          duration: performance.now() - pointer.downTime,
        })
        break
      case GestureState.PANNING:
        this.dispatchGestureEvent('pancancel', {
          x: pointer.currentX,
          y: pointer.currentY,
          deltaX: 0,
          deltaY: 0,
          offsetX: pointer.currentX - this.gestureStartX,
          offsetY: pointer.currentY - this.gestureStartY,
          pointerType: pointer.pointerType,
        })
        break
    }

    this.resetGestureState()
  }

  /**
   * Dispatches a custom gesture event from the target element.
   */
  private dispatchGestureEvent<K extends keyof GestuelleEventMap>(
    type: K,
    detail: GestuelleEventMap[K]['detail'],
  ): void {
    this.element.dispatchEvent(new CustomEvent(type, { detail: detail }))
  }

  /**
   * Clears the press timeout if it's active.
   */
  private clearPressTimeout(): void {
    if (this.pressTimeoutId !== null) {
      window.clearTimeout(this.pressTimeoutId)
      this.pressTimeoutId = null
    }
  }

  /**
   * Resets the internal gesture state and clears any active pointers.
   */
  private resetGestureState(): void {
    this.currentGestureState = GestureState.IDLE
    this.activePointers.forEach((pointer) => {
      this.element.releasePointerCapture(pointer.id)
    })
    this.activePointers.clear()
    this.clearPressTimeout()
  }

  public destroy() {
    this.removeEventListeners()
    this.resetGestureState()
  }
}

export function createGestuelle(element: HTMLElement, config?: GestuelleConfig): Gestuelle {
  return new Gestuelle(element, config ?? {})
}

declare global {
  // Augment the HTMLElement events with the gesture ones
  interface HTMLElementEventMap extends GestuelleEventMap {}
}

export * from './types'
