# Wheel Orientation Troubleshooting Guide

If the wheels still don't look right, you can adjust the orientation in `src/vehicle/vehicle-controller.ts` in the `loadAssets()` function.

## Current Settings (lines 137-146)

```typescript
wheelModel.scale.setScalar(0.08); // Size
wheelModel.rotation.x = Math.PI / 2; // 90° rotation on X-axis

// Right-side wheels flipped
if (placeholderWheel.position.x > 0) {
  wheelModel.rotation.y = Math.PI;
}
```

## Try These Alternatives

### If wheels are too big:
```typescript
wheelModel.scale.setScalar(0.05); // Try smaller values: 0.05, 0.06, 0.07, etc.
```

### If wheels face the wrong direction:

**Option A - No rotation:**
```typescript
// wheelModel.rotation.x = Math.PI / 2; // Comment this out
wheelModel.rotation.set(0, 0, 0);
```

**Option B - Rotate 90° on Z-axis:**
```typescript
wheelModel.rotation.x = 0;
wheelModel.rotation.z = Math.PI / 2;
```

**Option C - Rotate 90° on Y-axis:**
```typescript
wheelModel.rotation.x = 0;
wheelModel.rotation.y = Math.PI / 2;
```

**Option D - Rotate -90° on X-axis:**
```typescript
wheelModel.rotation.x = -Math.PI / 2; // Negative rotation
```

**Option E - Combine rotations:**
```typescript
wheelModel.rotation.x = Math.PI / 2;
wheelModel.rotation.y = Math.PI / 2;
```

### If right-side wheels are wrong:

**Remove the flip:**
```typescript
// Comment out or remove this block:
// if (placeholderWheel.position.x > 0) {
//   wheelModel.rotation.y = Math.PI;
// }
```

**Or flip left-side instead:**
```typescript
if (placeholderWheel.position.x < 0) {
  wheelModel.rotation.y = Math.PI;
}
```

## Wheel Rolling Animation

If wheels roll the wrong way, check `animateWheels()` (line 297):

```typescript
wheelContainer.rotation.z -= rotationSpeed * deltaTime;
```

**Try these alternatives:**

**Roll on X-axis:**
```typescript
wheelContainer.rotation.x -= rotationSpeed * deltaTime;
```

**Roll on Y-axis:**
```typescript
wheelContainer.rotation.y -= rotationSpeed * deltaTime;
```

**Reverse direction (add instead of subtract):**
```typescript
wheelContainer.rotation.z += rotationSpeed * deltaTime;
```

## Quick Test Process

1. Start the dev server: `npm run dev`
2. Make a change to the wheel orientation
3. Save the file (Vite will hot-reload)
4. Check the wheels in the browser
5. Repeat until correct

## What To Look For

- **Size**: Wheels should be roughly 1/4 the height of the car body
- **Orientation**: Wheel tread should face forward/backward (parallel to car)
- **Position**: Wheels should be at the corners of the car
- **Rolling**: Wheels should roll forward when driving forward
- **Steering**: Front wheels should turn left/right when steering

## Still Not Working?

The wheel GLB model might be exported with a non-standard orientation. You may need to:
1. Open the GLB in Blender or a 3D viewer to see its default orientation
2. Or try all combinations of 90° rotations on X, Y, and Z axes
3. Document which one works for future reference

