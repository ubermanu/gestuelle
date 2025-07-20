# Gestuelle

Gestuelle is a small library that helps you listen to gestures on an element.

## Install

```shell
pnpm i gestuelle
```

## Usage

```ts
import { createGestuelle } from "gestuelle";

// Attach the handler on an element
const element = document.getElementById("my-element");
const instance = createGestuelle(element);

// Listen an event
element.addEventListener("swipe", handleSwipe);

// Remove all listeners
instance.destroy();
```

> [!NOTE]
> Remember to put `touch-action: none` and `user-select: none` styles on your element to avoid side effects on gesture.

## Gestures

List of supported gestures:

### Pan

Dragging across a surface.

#### Events

- `panstart`
- `panmove`
- `panend`
- `pancancel`

### Press

Holding down on a spot.

#### Events

- `pressstart`
- `pressend`
- `presscancel`

### Swipe

A quick, directional flick.

#### Events

- `swipe`

### Tap

A brief touch.

#### Events

- `tap`
