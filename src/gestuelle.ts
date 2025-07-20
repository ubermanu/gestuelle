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
  private state: GestureState = GestureState.IDLE

  private pressTimeoutId: number | null = null

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

    this.activePointers.set(event.pointerId, {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      currentY: event.clientY,
      pointerType: event.pointerType,
      downTime: performance.now(),
    })

    if (this.activePointers.size === 1) {
      // First pointer down: potential single-touch gestures
      this.state = GestureState.POSSIBLE_TAP

      const pressConfig = this.config.press
      const minPressDuration = pressConfig?.minDuration ?? 500
      this.pressTimeoutId = window.setTimeout(this.onPressTimeout, minPressDuration)
    } else if (this.activePointers.size === 2) {
      // Second pointer down: potential multi-touch gestures
      this.clearPressTimeout()

      // Cancel any ongoing panning gesture
      if (this.state === GestureState.PANNING) {
        const primaryPointer = this.activePointers.values().next().value
        if (primaryPointer) {
          this.dispatchGestureEvent('pancancel', {
            x: primaryPointer.currentX,
            y: primaryPointer.currentY,
            deltaX: 0,
            deltaY: 0,
            offsetX: primaryPointer.currentX - primaryPointer.startX,
            offsetY: primaryPointer.currentY - primaryPointer.startY,
            pointerType: primaryPointer.pointerType,
          })
        }
      }

      this.state = GestureState.POSSIBLE_MULTI_TOUCH
    } else {
      return
    }

    // Request pointer capture. This ensures that subsequent `pointermove`,
    // `pointerup`, and `pointercancel` events for this pointerId will be
    // dispatched to *this* element, even if the pointer moves outside its bounds.
    this.element.setPointerCapture(event.pointerId)
  }

  private onPressTimeout = (): void => {
    if (this.state === GestureState.POSSIBLE_TAP) {
      const pointer = this.activePointers.values().next().value
      if (pointer) {
        const pressConfig = this.config.press
        const maxPressDistance = pressConfig?.maxDistance ?? 10
        const distance = Math.sqrt((pointer.currentX - pointer.startX) ** 2 + (pointer.currentY - pointer.startY) ** 2)

        if (distance <= maxPressDistance) {
          this.state = GestureState.PRESSING
          this.dispatchGestureEvent('pressstart', {
            x: pointer.currentX,
            y: pointer.currentY,
            pointerType: pointer.pointerType,
            duration: performance.now() - pointer.downTime,
          })
        } else {
          this.resetGestureState()
        }
      }
    }
    this.pressTimeoutId = null
  }

  private onPointerMove = (event: PointerEvent): void => {
    const pointer = this.activePointers.get(event.pointerId)

    if (!pointer) {
      return
    }

    // Update the values of the moved pointer
    pointer.currentX = event.clientX
    pointer.currentY = event.clientY
    this.activePointers.set(pointer.id, pointer)

    if (this.activePointers.size === 2) {
      const otherPointer = Array.from(this.activePointers.values()).find((p) => p.id !== event.pointerId)!

      const centerX = (pointer.startX + otherPointer.startX) / 2
      const centerY = (pointer.startY + otherPointer.startY) / 2
      const distance = Math.sqrt(
        (otherPointer.currentX - pointer.currentX) ** 2 + (otherPointer.currentY - pointer.currentY) ** 2,
      )

      if (this.state === GestureState.POSSIBLE_MULTI_TOUCH) {
        const pinchConfig = this.config.pinch
        const pinchThreshold = pinchConfig?.threshold ?? 5

        if (distance >= pinchThreshold) {
          this.state = GestureState.PINCHING
          this.dispatchGestureEvent('pinchstart', {
            x: centerX,
            y: centerY,
            pointerType: pointer.pointerType,
            centerX: centerX,
            centerY: centerY,
            distance: distance,
          })
        }
      }

      if (this.state === GestureState.PINCHING) {
        this.dispatchGestureEvent('pinchmove', {
          x: centerX,
          y: centerY,
          pointerType: pointer.pointerType,
          centerX: centerX,
          centerY: centerY,
          distance: distance,
        })
      }

      return
    }

    const deltaX = event.clientX - pointer.currentX
    const deltaY = event.clientY - pointer.currentY

    pointer.currentX = event.clientX
    pointer.currentY = event.clientY

    const offsetX = pointer.currentX - pointer.startX
    const offsetY = pointer.currentY - pointer.startY
    const distance = Math.sqrt(offsetX ** 2 + offsetY ** 2)

    switch (this.state) {
      case GestureState.POSSIBLE_TAP: {
        const panConfig = this.config.pan
        const panThreshold = panConfig?.threshold ?? 5

        // If movement exceeds the pan threshold, starts it
        if (distance >= panThreshold) {
          this.clearPressTimeout()
          this.state = GestureState.PANNING
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

      case GestureState.PRESSING: {
        const pressConfig = this.config.press
        const maxPressDistance = pressConfig?.maxDistance ?? 10

        // If a press moves too far, it cancels the press and might become a pan
        if (distance >= maxPressDistance) {
          this.dispatchGestureEvent('presscancel', {
            x: pointer.currentX,
            y: pointer.currentY,
            pointerType: pointer.pointerType,
            duration: performance.now() - pointer.downTime,
          })
          this.state = GestureState.PANNING
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

    // Handle multi-touch pointer up first (if one pointer remains)
    if (this.activePointers.size === 1) {
      const [otherPointer] = this.activePointers.values()

      const centerX = (pointer.startX + otherPointer.startX) / 2
      const centerY = (pointer.startY + otherPointer.startY) / 2

      const distance = Math.sqrt(
        (otherPointer.currentX - pointer.currentX) ** 2 + (otherPointer.currentY - pointer.currentY) ** 2,
      )

      switch (this.state) {
        case GestureState.PINCHING: {
          this.dispatchGestureEvent('pinchend', {
            x: pointer.currentX,
            y: pointer.currentY,
            pointerType: pointer.pointerType,
            centerX: centerX,
            centerY: centerY,
            distance: distance,
          })
          break
        }
      }

      return
    } else if (this.activePointers.size === 0) {
      const offsetX = pointer.currentX - pointer.startX
      const offsetY = pointer.currentY - pointer.startY
      const distance = Math.sqrt(offsetX ** 2 + offsetY ** 2)
      const duration = performance.now() - pointer.downTime

      switch (this.state) {
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
          const velocity = Math.sqrt(velocityX ** 2 + velocityY ** 2)

          if (velocity >= minSwipeVelocity && distance >= minSwipeDistance && duration <= maxSwipeDuration) {
            let direction: SwipeDirection | undefined

            if (Math.abs(offsetX) > Math.abs(offsetY)) {
              direction = offsetX > 0 ? 'right' : 'left'
            } else {
              direction = offsetY > 0 ? 'down' : 'up'
            }

            this.state = GestureState.SWIPING

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
      }
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

    switch (this.state) {
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
          offsetX: pointer.currentX - pointer.startX,
          offsetY: pointer.currentY - pointer.startY,
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
    this.state = GestureState.IDLE
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
