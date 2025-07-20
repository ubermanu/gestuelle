import { beforeAll } from 'vitest'

beforeAll(() => {
  const capturedPointers = new Set<number>()

  window.HTMLElement.prototype.hasPointerCapture = (pointerId: number) => capturedPointers.has(pointerId)
  window.HTMLElement.prototype.setPointerCapture = (pointerId: number) => capturedPointers.add(pointerId)
  window.HTMLElement.prototype.releasePointerCapture = (pointerId: number) => capturedPointers.delete(pointerId)
})
