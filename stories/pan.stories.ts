import type { Meta, StoryObj } from '@storybook/html-vite'
import { createGestuelle } from '../src/gestuelle'

interface ElementProps {
  threshold?: number
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
    `

  setTimeout(() => {
    createGestuelle(box, {
      pan: {
        threshold: args.threshold,
      },
    })

    let currentX = box.offsetLeft
    let currentY = box.offsetTop

    box.addEventListener('panstart', (event) => {
      const rect = box.getBoundingClientRect()
      currentX = rect.left
      currentY = rect.top
    })

    box.addEventListener('panmove', (event) => {
      currentX += event.detail.deltaX
      currentY += event.detail.deltaY

      box.style.left = `${currentX}px`
      box.style.top = `${currentY}px`
      box.style.transform = 'none'
    })
  }, 0)

  return box
}

const meta: Meta = {
  title: 'Pan',
  render: (args: ElementProps) => createElement(args),
  argTypes: {
    threshold: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Minimum movement (pixels) before pan starts.',
      defaultValue: 5,
    },
  },
  args: {
    threshold: 5,
  },
}

export default meta

export const Default: StoryObj = {
  args: {},
}
