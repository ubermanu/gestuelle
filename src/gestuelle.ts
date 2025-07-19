import type { GestuelleConfig, PanEventDetail, PointerType } from './types'

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
}

/**
 * The core handler class for Gestuelle. Manages event listeners and gesture recognition
 * for a single DOM element.
 */
class Gestuelle {
  readonly element: HTMLElement
  readonly config: GestuelleConfig

  private activePointers: Map<number, ActivePointer> = new Map()
  private isPanning: boolean = false

  // Store the initial clientX/Y of the primary pointer when `panstart` is first considered.
  private panStartX: number = 0
  private panStartY: number = 0

  constructor(element: HTMLElement, config: GestuelleConfig) {
    this.element = element
    this.config = config
    this.addEventListeners()
    // TODO: Make this optional (check the computed styles of the element).
    this.element.style.touchAction = 'none'
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

  /**
   * Entry point for starting a potential gesture.
   */
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
    })

    this.panStartX = event.clientX
    this.panStartY = event.clientY

    // Request pointer capture. This ensures that subsequent `pointermove`,
    // `pointerup`, and `pointercancel` events for this pointerId will be
    // dispatched to *this* element, even if the pointer moves outside its bounds.
    this.element.setPointerCapture(event.pointerId)
  }

  /**
   * Detect if a gesture has started and update its progress.
   */
  private onPointerMove = (event: PointerEvent): void => {
    const primaryPointerId = this.activePointers.keys().next().value
    const primaryPointer = this.activePointers.get(primaryPointerId!)

    if (!primaryPointer || event.pointerId !== primaryPointer.id) {
      return
    }

    const deltaX = event.clientX - primaryPointer.currentX
    const deltaY = event.clientY - primaryPointer.currentY

    primaryPointer.currentX = event.clientX
    primaryPointer.currentY = event.clientY

    const offsetX = primaryPointer.currentX - this.panStartX
    const offsetY = primaryPointer.currentY - this.panStartY

    const panConfig = this.config.pan
    const threshold = panConfig?.threshold ?? 5

    // If pan has not started yet, check if the movement threshold has been met.
    if (!this.isPanning) {
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY)
      if (distance >= threshold) {
        this.isPanning = true
        this.dispatchPanEvent('panstart', primaryPointer, deltaX, deltaY, offsetX, offsetY)
      }
    }

    // If pan is active (or just started), dispatch the `panmove` event.
    if (this.isPanning) {
      this.dispatchPanEvent('panmove', primaryPointer, deltaX, deltaY, offsetX, offsetY)
    }
  }

  /**
   * This signals the end of a pointer interaction and potentially a pan gesture.
   */
  private onPointerUp = (event: PointerEvent): void => {
    // Check if the released pointer was one we were tracking.
    if (this.activePointers.has(event.pointerId)) {
      // Release pointer capture for this specific pointer.
      this.element.releasePointerCapture(event.pointerId)
      this.activePointers.delete(event.pointerId)

      // If a pan gesture was active, dispatch the `panend` event.
      if (this.isPanning) {
        this.dispatchPanEvent(
          'panend',
          {
            id: event.pointerId,
            startX: this.panStartX,
            startY: this.panStartY,
            currentX: event.clientX,
            currentY: event.clientY,
            pointerType: event.pointerType,
          },
          0,
          0,
          event.clientX - this.panStartX,
          event.clientY - this.panStartY,
        )
        this.isPanning = false
      }
    }
  }

  private onPointerCancel = (event: PointerEvent): void => {
    // Similar to `pointerup`, but indicates an interruption.
    if (this.activePointers.has(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId)
      this.activePointers.delete(event.pointerId)

      // If a pan gesture was active, dispatch the `pancancel` event.
      if (this.isPanning) {
        this.dispatchPanEvent(
          'pancancel',
          {
            id: event.pointerId,
            startX: this.panStartX,
            startY: this.panStartY,
            currentX: event.clientX,
            currentY: event.clientY,
            pointerType: event.pointerType,
          },
          0,
          0,
          event.clientX - this.panStartX,
          event.clientY - this.panStartY,
        )
        this.isPanning = false
      }
    }
  }

  /**
   * Dispatches a custom pan event from the target element.
   */
  private dispatchPanEvent(
    type: 'panstart' | 'panmove' | 'panend' | 'pancancel',
    pointer: ActivePointer,
    dx: number,
    dy: number,
    offsetX: number,
    offsetY: number,
  ): void {
    this.element.dispatchEvent(
      new CustomEvent<PanEventDetail>(type, {
        detail: {
          x: pointer.currentX,
          y: pointer.currentY,
          deltaX: dx,
          deltaY: dy,
          offsetX: offsetX,
          offsetY: offsetY,
          pointerType: pointer.pointerType,
          target: this.element,
        },
      }),
    )
  }

  public destroy() {
    this.removeEventListeners()

    // Release captured pointers.
    this.activePointers.forEach((pointer) => {
      this.element.releasePointerCapture(pointer.id)
    })

    this.activePointers.clear()
    this.isPanning = false
    this.element.style.touchAction = ''
  }
}

export function createGestuelle(element: HTMLElement, config?: GestuelleConfig): Gestuelle {
  return new Gestuelle(element, config ?? {})
}
