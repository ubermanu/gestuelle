import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGestuelle } from '../src/gestuelle'

describe('Pan', () => {
  let element: HTMLElement
  let gestuelleInstance: ReturnType<typeof createGestuelle>

  let panStartListener: ReturnType<typeof vi.fn>
  let panMoveListener: ReturnType<typeof vi.fn>
  let panEndListener: ReturnType<typeof vi.fn>
  let panCancelListener: ReturnType<typeof vi.fn>

  const capturedPointers = new Set<number>()

  window.HTMLElement.prototype.hasPointerCapture = (pointerId: number) => capturedPointers.has(pointerId)
  window.HTMLElement.prototype.setPointerCapture = (pointerId: number) => capturedPointers.add(pointerId)
  window.HTMLElement.prototype.releasePointerCapture = (pointerId: number) => capturedPointers.delete(pointerId)

  beforeEach(() => {
    document.body.innerHTML = `
      <div data-testid="element" style="position:absolute; top:0; left:0; width:100px; height:100px;"></div>
    `
    element = screen.getByTestId('element')

    panStartListener = vi.fn()
    panMoveListener = vi.fn()
    panEndListener = vi.fn()
    panCancelListener = vi.fn()

    element.addEventListener('panstart', panStartListener)
    element.addEventListener('panmove', panMoveListener)
    element.addEventListener('panend', panEndListener)

    gestuelleInstance = createGestuelle(element, { pan: { threshold: 5 } })
  })

  afterEach(() => {
    gestuelleInstance.destroy()
  })

  it('should NOT send an implicit pointerup event after only pointerdown', async () => {
    const user = userEvent.setup()

    await user.pointer([{ keys: '[MouseLeft]', target: element, coords: { clientX: 10, clientY: 10 } }])

    expect(panEndListener).not.toHaveBeenCalled()
    expect(panCancelListener).not.toHaveBeenCalled()
  })

  it('should trigger panstart and panmove events on drag', async () => {
    const user = userEvent.setup()

    await user.pointer([
      { keys: '[MouseLeft>]', target: element, coords: { clientX: 10, clientY: 10 }, pointerName: 'mouse' },
      { coords: { clientX: 10, clientY: 20 } },
      { coords: { clientX: 10, clientY: 30 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(panStartListener).toHaveBeenCalledTimes(1)
    expect(panMoveListener).toHaveBeenCalledTimes(2)
    expect(panEndListener).toHaveBeenCalledTimes(1)
  })

  it('should not dispatch panstart if movement is below threshold', async () => {
    const user = userEvent.setup()

    await user.pointer([
      { keys: '[MouseLeft>]', target: element, coords: { clientX: 10, clientY: 10 } },
      { coords: { clientX: 12, clientY: 12 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(panStartListener).not.toHaveBeenCalled()
    expect(panMoveListener).not.toHaveBeenCalled()
    expect(panEndListener).not.toHaveBeenCalled()
  })
})
