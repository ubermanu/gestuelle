import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGestuelle } from '../src/gestuelle'

describe('Tap', () => {
  let gestuelleInstance: ReturnType<typeof createGestuelle>
  let tapListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    tapListener = vi.fn()
    document.body.addEventListener('tap', tapListener)
    gestuelleInstance = createGestuelle(document.body)
  })

  afterEach(() => {
    document.body.removeEventListener('tap', tapListener)
    gestuelleInstance.destroy()
  })

  it('should trigger tap', async () => {
    const user = userEvent.setup()

    await user.pointer('[MouseLeft]')

    expect(tapListener).toHaveBeenCalledTimes(1)
  })

  it('should NOT trigger tap if holding for too long', async () => {
    vi.useFakeTimers()

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.pointer('[MouseLeft>]')
    vi.advanceTimersByTime(1000)
    await user.pointer('[/MouseLeft]')

    expect(tapListener).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
