import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGestuelle } from '../src/gestuelle'

describe('Pinch', () => {
  let g: ReturnType<typeof createGestuelle>

  let pinchStart: ReturnType<typeof vi.fn>
  let pinchMove: ReturnType<typeof vi.fn>
  let pinchEnd: ReturnType<typeof vi.fn>

  beforeEach(() => {
    pinchStart = vi.fn()
    pinchMove = vi.fn()
    pinchEnd = vi.fn()

    document.body.addEventListener('pinchstart', pinchStart)
    document.body.addEventListener('pinchmove', pinchMove)
    document.body.addEventListener('pinchend', pinchEnd)

    g = createGestuelle(document.body)
  })

  afterEach(() => {
    document.body.removeEventListener('pinchstart', pinchStart)
    document.body.removeEventListener('pinchmove', pinchMove)
    document.body.removeEventListener('pinchend', pinchEnd)
    g.destroy()
  })

  it('should pinch', async () => {
    const user = userEvent.setup()

    await user.pointer([
      { keys: '[TouchA>]', target: document.body, coords: { clientX: 50, clientY: 10 } },
      { keys: '[TouchB>]', target: document.body, coords: { clientX: 60, clientY: 10 } },
      { pointerName: 'TouchA', coords: { clientX: 20, clientY: 10 } },
      { pointerName: 'TouchB', coords: { clientX: 80, clientY: 10 } },
    ])

    expect(pinchStart).toHaveBeenCalledTimes(1)
    expect(pinchMove).toHaveBeenCalledTimes(2)
    expect(pinchEnd).toHaveBeenCalledTimes(0)

    await user.pointer([{ keys: '[/TouchA]' }, { keys: '[/TouchB]' }])

    expect(pinchEnd).toHaveBeenCalledTimes(1)
  })
})
