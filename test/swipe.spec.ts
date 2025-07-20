import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGestuelle } from '../src/gestuelle'

describe('Swipe', () => {
  let gestuelleInstance: ReturnType<typeof createGestuelle>
  let swipeListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    swipeListener = vi.fn()
    document.body.addEventListener('swipe', swipeListener)
    gestuelleInstance = createGestuelle(document.body)
  })

  afterEach(() => {
    document.body.removeEventListener('swipe', swipeListener)
    gestuelleInstance.destroy()
  })

  it('should swipe', async () => {
    const user = userEvent.setup()

    await user.pointer([
      { keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 } },
      { coords: { clientX: 20, clientY: 10 } },
      { coords: { clientX: 40, clientY: 10 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(swipeListener).toHaveBeenCalledTimes(1)
  })
})
