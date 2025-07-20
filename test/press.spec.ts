import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGestuelle } from '../src/gestuelle'
import type { PressEventDetail } from '../src/types'

describe('Press', () => {
  let gestuelleInstance: ReturnType<typeof createGestuelle>
  let pressStartListener: ReturnType<typeof vi.fn>
  let pressEndListener: ReturnType<typeof vi.fn>
  let pressCancelListener: ReturnType<typeof vi.fn>

  beforeEach(() => {
    pressStartListener = vi.fn()
    pressEndListener = vi.fn()
    pressCancelListener = vi.fn()

    document.body.addEventListener('pressstart', pressStartListener)
    document.body.addEventListener('pressend', pressEndListener)
    document.body.addEventListener('presscancel', pressCancelListener)

    gestuelleInstance = createGestuelle(document.body, {
      press: { minDuration: 500, maxDistance: 10 },
      pan: { threshold: 15 },
    })
  })

  afterEach(() => {
    document.body.removeEventListener('pressstart', pressStartListener)
    document.body.removeEventListener('pressend', pressEndListener)
    document.body.removeEventListener('presscancel', pressCancelListener)
    gestuelleInstance.destroy()
  })

  it('should trigger pressstart and pressend on holding long enough', async () => {
    vi.useFakeTimers()

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.pointer([{ keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 } }])
    expect(pressStartListener).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(pressStartListener).toHaveBeenCalledTimes(1)
    const pressStartDetail: PressEventDetail = pressStartListener.mock.calls[0][0].detail
    expect(pressStartDetail.duration).toBe(500)
    expect(pressStartDetail.x).toBe(10)
    expect(pressStartDetail.y).toBe(10)

    vi.advanceTimersByTime(200)
    expect(pressStartListener).toHaveBeenCalledTimes(1)

    await user.pointer([{ keys: '[/MouseLeft]', coords: { clientX: 10, clientY: 10 } }])
    expect(pressEndListener).toHaveBeenCalledTimes(1)
    const pressEndDetail: PressEventDetail = pressEndListener.mock.calls[0][0].detail
    expect(pressEndDetail.duration).toBe(700)
    expect(pressEndDetail.x).toBe(10)
    expect(pressEndDetail.y).toBe(10)

    expect(pressCancelListener).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('should NOT trigger press if NOT holding long enough', async () => {
    vi.useFakeTimers()

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.pointer([{ keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 } }])
    vi.advanceTimersByTime(499)
    await user.pointer([{ keys: '[/MouseLeft]', coords: { clientX: 10, clientY: 10 } }])

    expect(pressStartListener).not.toHaveBeenCalled()
    expect(pressEndListener).not.toHaveBeenCalled()
    expect(pressCancelListener).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('should trigger presscancel if movement exceeds maxDistance after pressstart', async () => {
    vi.useFakeTimers()

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.pointer([{ keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 } }])
    vi.advanceTimersByTime(500)
    expect(pressStartListener).toHaveBeenCalledTimes(1)

    await user.pointer([{ coords: { clientX: 10, clientY: 25 } }])
    expect(pressCancelListener).toHaveBeenCalledTimes(1)

    const pressCancelDetail: PressEventDetail = pressCancelListener.mock.calls[0][0].detail
    expect(pressCancelDetail.duration).toBeGreaterThanOrEqual(500)
    expect(pressCancelDetail.x).toBe(10)
    expect(pressCancelDetail.y).toBe(25)

    expect(pressEndListener).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('should NOT trigger press if movement exceeds maxDistance before pressstart', async () => {
    vi.useFakeTimers()

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.pointer([{ keys: '[MouseLeft>]', coords: { clientX: 10, clientY: 10 } }])
    await user.pointer([{ coords: { clientX: 10, clientY: 25 } }])
    vi.advanceTimersByTime(500)

    expect(pressStartListener).not.toHaveBeenCalled()
    expect(pressEndListener).not.toHaveBeenCalled()
    expect(pressCancelListener).not.toHaveBeenCalled()

    vi.useRealTimers()
  })
})
