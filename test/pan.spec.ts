import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGestuelle } from '../src/gestuelle'

describe('Pan', () => {
  let gestuelleInstance: ReturnType<typeof createGestuelle>

  let panStartListener: ReturnType<typeof vi.fn>
  let panMoveListener: ReturnType<typeof vi.fn>
  let panEndListener: ReturnType<typeof vi.fn>
  let panCancelListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    panStartListener = vi.fn()
    panMoveListener = vi.fn()
    panEndListener = vi.fn()
    panCancelListener = vi.fn()

    document.body.addEventListener('panstart', panStartListener)
    document.body.addEventListener('panmove', panMoveListener)
    document.body.addEventListener('panend', panEndListener)

    gestuelleInstance = createGestuelle(document.body, { pan: { threshold: 5 } })
  })

  afterEach(() => {
    document.body.removeEventListener('panstart', panStartListener)
    document.body.removeEventListener('panmove', panMoveListener)
    document.body.removeEventListener('panend', panEndListener)
    gestuelleInstance.destroy()
  })

  it('should NOT send an implicit pointerup event after only pointerdown', async () => {
    const user = userEvent.setup()

    await user.pointer('[MouseLeft]')

    expect(panEndListener).not.toHaveBeenCalled()
    expect(panCancelListener).not.toHaveBeenCalled()
  })

  it('should trigger panstart and panmove events on drag', async () => {
    const user = userEvent.setup()

    await user.pointer([
      { keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 }, pointerName: 'mouse' },
      { coords: { clientX: 10, clientY: 20 } },
      { coords: { clientX: 10, clientY: 30 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(panStartListener).toHaveBeenCalledTimes(1)
    expect(panMoveListener).toHaveBeenCalledTimes(1)
    expect(panEndListener).toHaveBeenCalledTimes(1)
  })

  it('should not dispatch panstart if movement is below threshold', async () => {
    const user = userEvent.setup()

    await user.pointer([
      { keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 } },
      { coords: { clientX: 12, clientY: 12 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(panStartListener).not.toHaveBeenCalled()
    expect(panMoveListener).not.toHaveBeenCalled()
    expect(panEndListener).not.toHaveBeenCalled()
  })
})
