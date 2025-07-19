import type { Meta, StoryObj } from '@storybook/html-vite'
import { createGestuelle } from '../src/gestuelle'
import type { PanGestureConfig, PressGestureConfig, SwipeGestureConfig, TapGestureConfig } from '../src/types'

interface ElementProps {
  panConfig?: PanGestureConfig
  tapConfig?: TapGestureConfig
  pressConfig?: PressGestureConfig
  swipeConfig?: SwipeGestureConfig
}

function createElement(args: ElementProps) {
  const box = document.createElement('div')
  box.style.cssText = `
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 150px;
    height: 150px;
    background-color: #4CAF50;
    border: 4px solid #388E3C;
    border-radius: 16px;
    cursor: grab;
    user-select: none;
    touch-action: none;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    font-size: 16px;
    font-weight: bold;
    color: white;
    text-align: center;
    box-sizing: border-box;
    transition: background-color 0.1s ease-out, border 0.1s ease-out;
  `
  box.textContent = 'Touch or Click Me!'

  setTimeout(() => {
    createGestuelle(box, {
      pan: args.panConfig,
      tap: args.tapConfig,
      press: args.pressConfig,
      swipe: args.swipeConfig,
    })

    let currentX = box.offsetLeft
    let currentY = box.offsetTop

    if (args.panConfig) {
      box.addEventListener('panstart', () => {
        const rect = box.getBoundingClientRect()
        currentX = rect.left
        currentY = rect.top
        box.textContent = `Pan Start!`
        box.style.backgroundColor = '#FFC107'
        box.style.border = '4px solid #FFA000'
        box.style.cursor = 'grabbing'
      })

      box.addEventListener('panmove', (event) => {
        currentX += event.detail.deltaX
        currentY += event.detail.deltaY

        box.style.left = `${currentX}px`
        box.style.top = `${currentY}px`
        box.style.transform = 'none'
        box.textContent = `Pan: dx=${event.detail.deltaX.toFixed(0)}, dy=${event.detail.deltaY.toFixed(0)}`
      })

      box.addEventListener('panend', () => {
        box.textContent = `Pan End!`
        box.style.backgroundColor = '#4CAF50'
        box.style.border = '4px solid #388E3C'
        box.style.cursor = 'grab'
        setTimeout(() => {
          box.textContent = 'Touch or Click Me!'
        }, 500)
      })

      box.addEventListener('pancancel', () => {
        box.textContent = `Pan Cancelled!`
        box.style.backgroundColor = '#F44336'
        box.style.border = '4px solid #D32F2F'
        box.style.cursor = 'grab'
        setTimeout(() => {
          box.textContent = 'Touch or Click Me!'
        }, 500)
      })
    }

    if (args.tapConfig) {
      box.addEventListener('tap', () => {
        box.textContent = `TAP!`
        box.style.backgroundColor = '#2196F3'
        box.style.border = '4px solid #1976D2'
        setTimeout(() => {
          box.textContent = 'Touch or Click Me!'
          box.style.backgroundColor = '#4CAF50'
          box.style.border = '4px solid #388E3C'
        }, 300)
      })
    }

    if (args.pressConfig) {
      box.addEventListener('pressstart', () => {
        box.textContent = `Pressing...`
        box.style.backgroundColor = '#FF5722'
        box.style.border = '4px solid #E64A19'
      })

      box.addEventListener('pressend', (event) => {
        box.textContent = `Press End! (Held: ${event.detail.duration.toFixed(0)}ms)`
        box.style.backgroundColor = '#4CAF50'
        box.style.border = '4px solid #388E3C'
        setTimeout(() => {
          box.textContent = 'Touch or Click Me!'
        }, 500)
      })

      box.addEventListener('presscancel', () => {
        box.textContent = `Press Cancelled!`
        box.style.backgroundColor = '#F44336'
        box.style.border = '4px solid #D32F2F'
        setTimeout(() => {
          box.textContent = 'Touch or Click Me!'
        }, 500)
      })
    }

    if (args.swipeConfig) {
      box.addEventListener('swipe', (event) => {
        box.textContent = `SWIPE ${event.detail.direction.toUpperCase()}! Vel: ${event.detail.velocity.toFixed(2)}`
        box.style.backgroundColor = '#9C27B0'
        box.style.border = '4px solid #7B1FA2'
        setTimeout(() => {
          box.textContent = 'Touch or Click Me!'
          box.style.backgroundColor = '#4CAF50'
          box.style.border = '4px solid #388E3C'
        }, 500)
      })
    }
  }, 0)

  return box
}

const meta: Meta<ElementProps> = {
  title: 'Gestures',
  render: (args: ElementProps) => createElement(args),
  argTypes: {
    panConfig: {
      control: 'object',
      description: 'Configuration for the Pan gesture (threshold).',
      defaultValue: { threshold: 5 },
    },
    tapConfig: {
      control: 'object',
      description: 'Configuration for the Tap gesture (maxDuration, maxDistance).',
      defaultValue: { maxDuration: 250, maxDistance: 10 },
    },
    pressConfig: {
      control: 'object',
      description: 'Configuration for the Press gesture (minDuration, maxDistance).',
      defaultValue: { minDuration: 500, maxDistance: 10 },
    },
    swipeConfig: {
      control: 'object',
      description: 'Configuration for the Swipe gesture (minVelocity, minDistance, maxDuration).',
      defaultValue: { minVelocity: 0.3, minDistance: 30, maxDuration: 300 },
    },
  },
}

export default meta

type Story = StoryObj<ElementProps>

export const Default: Story = {
  args: {
    panConfig: { threshold: 5 },
    tapConfig: { maxDuration: 250, maxDistance: 10 },
    pressConfig: { minDuration: 500, maxDistance: 10 },
    swipeConfig: { minVelocity: 0.3, minDistance: 30, maxDuration: 300 },
  },
}

export const Pan: Story = {
  args: {
    panConfig: { threshold: 5 },
  },
}

export const Tap: Story = {
  args: {
    tapConfig: { maxDuration: 250, maxDistance: 10 },
  },
}

export const Press: Story = {
  args: {
    pressConfig: { minDuration: 500, maxDistance: 10 },
  },
}

export const Swipe: Story = {
  args: {
    swipeConfig: { minVelocity: 0.3, minDistance: 30, maxDuration: 300 },
  },
}
