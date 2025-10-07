# Vehicle Physics & Camera Improvements

## Latest Fixes v2 (Asset Scaling & Driving Physics)

### 🔧 **Fixed Asset Issues (Attempt 2)**

1. **Wheel Size**: Further reduced to **0.08x** scale (even smaller, more realistic)
2. **Wheel Structure**: 
   - Created container groups for proper rotation hierarchy
   - Wheel model rotated 90° on X-axis inside container
   - Right-side wheels flipped 180° on Y-axis
   - Container handles steering (Y) and rolling (Z) rotations separately
3. **Steering Wheel Size**: Set to **0.9x** scale (properly visible)
4. **Steering Wheel Rotation**: 
   - Rotates around **Y-axis** (like a real steering wheel)
   - **2.5 full rotations** lock-to-lock
   - Correct direction matching steering input

### 🚗 **Fixed Driving Physics (Complete Rewrite)**

**Problem**: Original code used unsigned speed, breaking forward/backward detection

**Solution**: Complete physics rewrite with signed speed

1. **Signed Speed Tracking**:
   - Calculate forward speed using dot product with forward vector
   - Preserves direction (positive = forward, negative = reverse)
   - Proper acceleration/deceleration in both directions

2. **Improved Input Handling**:
   - Throttle only: Accelerate forward
   - Brake only: Brake if moving, reverse if stopped
   - Coasting: Natural deceleration with drag
   - Prevents simultaneous throttle + brake conflicts

3. **Reverse Functionality**:
   - Hold S/Down when stopped to reverse
   - Max reverse speed: 54 km/h (~15 m/s)
   - Steering correctly reversed when backing up
   - Smooth braking in both directions

4. **Better Physics**:
   - Drag works in both directions
   - Proper deceleration when coasting
   - Handbrake works forward and backward
   - Turn radius calculated correctly for reverse

### 📋 **See WHEEL_ORIENTATION_GUIDE.md**

If wheels still don't look right, check `WHEEL_ORIENTATION_GUIDE.md` for:
- Different rotation options to try
- Scale adjustments
- Rolling axis alternatives
- Quick testing process

## Changes Made

### 🚗 **Fixed Vehicle Physics**

The original implementation had issues with turning and forward movement. Here's what was fixed:

#### Problems with Original:
- Force-based physics was inconsistent and felt "floaty"
- Turning applied torque incorrectly, making it feel delayed and weird
- Forward movement used power/speed calculations that didn't feel responsive
- No lateral grip model, causing excessive sliding

#### New Implementation:
1. **Direct Velocity Control**: Instead of applying forces, we now directly set the velocity vector based on input and physics constraints. This gives much more predictable, arcade-style handling.

2. **Improved Steering**:
   - Smooth interpolation of steering angle (no instant turns)
   - Bicycle model for realistic turn radius calculation
   - Direct angular velocity setting for responsive turning
   - Front wheels visually rotate with steering input

3. **Better Acceleration/Braking**:
   - Acceleration: 25 m/s² with speed limiting at 200 km/h
   - Braking: 40 m/s² deceleration
   - Drag coefficient: 0.4 (realistic air resistance)
   - Speed-based drag increases quadratically

4. **Lateral Grip System**:
   - 95% lateral grip prevents excessive sliding
   - Maintains some lateral velocity for realistic drifting
   - Handbrake reduces speed smoothly

5. **Physics Stability**:
   - Locked X and Z rotation axes (prevents car flipping)
   - Only Y-axis rotation allowed (turning)
   - More stable at high speeds

### 🎥 **First-Person Camera Mode**

Added a toggleable first-person view:

- **Press C** to toggle between third-person and first-person views
- **First-Person Features**:
  - Camera positioned at driver's eye level (1.5m high, 0.3m forward)
  - Looks straight ahead from vehicle
  - Slightly more responsive camera movement (20% smoothing vs 10% for third-person)
  - Perfect for seeing the steering wheel in action!

- **Third-Person** (default):
  - Classic chase camera behind the vehicle
  - Smooth follow with 10% interpolation
  - Good overview of surroundings

### 🎨 **Visual Improvements**

1. **Steering Wheel Integration**:
   - Loads `/assets/steering_wheel_l505.glb`
   - Animates with steering input (realistic 2.5-turn lock-to-lock)
   - Visible in first-person view
   - Scaled to 0.4x and positioned properly

2. **Wheel Models**:
   - Loads `/assets/wheel.glb` for all 4 wheels
   - Front wheels rotate with steering
   - All wheels rotate based on vehicle speed
   - Fallback to simple cylinder geometry if models fail to load

3. **Enhanced Car Model**:
   - Added windshield with transparency
   - Blue-tinted glass material (88ccff, 30% opacity)
   - High metalness (0.9) and low roughness (0.1) for realistic glass
   - Positioned and angled correctly

4. **UI Additions**:
   - Controls hint in bottom-right corner
   - Semi-transparent overlay
   - Shows WASD, SPACE, and C key functions

## Technical Details

### Vehicle Parameters
```typescript
mass: 1200 kg
wheelBase: 2.5 m
maxSteerAngle: 0.5 rad (~28 degrees)
maxSpeed: 200 km/h
acceleration: 25 m/s²
brakeForce: 40 m/s²
dragCoefficient: 0.4
lateralGrip: 0.95
```

### Physics Approach
- **Method**: Kinematic velocity control (not force-based)
- **Pros**: Predictable, responsive, arcade-like feel
- **Cons**: Less realistic than full force simulation, but much more fun to drive

### Camera Modes
| Mode | Offset | Smoothness | Use Case |
|------|--------|------------|----------|
| Third-Person | (0, 6, -12) | 10% | Default, best for navigation |
| First-Person | (0, 1.5, 0.3) | 20% | Immersive, see steering wheel |

## How to Test

1. **Start the game**: `npm run dev`
2. **Drive around**: Use WASD or arrow keys
3. **Press C**: Toggle to first-person view
4. **Watch**: The steering wheel rotates as you turn!
5. **Notice**: Much smoother, more predictable driving

## What Should Feel Better

✅ **Forward Movement**: Smooth acceleration with clear speed limiting  
✅ **Turning**: Responsive and predictable, no weird delays  
✅ **Braking**: Strong, effective deceleration  
✅ **Grip**: Less sliding, more control (especially at speed)  
✅ **Steering Wheel**: Realistic animation in first-person  
✅ **Overall Feel**: More arcade-like, fun to drive  

## Known Limitations

- Physics is simplified (not a full racing sim)
- Wheel models might need position/scale tweaking based on actual GLB structure
- No suspension simulation (rigid body)
- No wheel colliders (single body collision)

These are intentional trade-offs for the MVP to prioritize fun driving feel over ultra-realism.

