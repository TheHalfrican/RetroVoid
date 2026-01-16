import { useFrame, useThree } from '@react-three/fiber';
import { useTheme } from '../../hooks/useTheme';

/**
 * Applies barrel distortion correction to convert screen coordinates
 * to undistorted 3D space coordinates for accurate raycasting.
 *
 * The barrel distortion shader transforms coordinates like this:
 *   source = destination * factor(destination) * distortionScale
 *
 * Where factor = 1 + r² * distortion + r⁴ * distortion * 0.5
 *
 * Content at undistorted position 'source' appears at screen position 'destination'.
 * So when the user clicks at 'destination', we apply the same formula to get 'source'.
 */
function correctForBarrelDistortion(
  screenX: number,
  screenY: number,
  distortion: number,
  distortionScale: number
): { x: number; y: number } {
  if (distortion === 0 || distortionScale === 0) {
    return { x: screenX, y: screenY };
  }

  // Calculate radial distance from center (same as shader)
  const r2 = screenX * screenX + screenY * screenY;
  const r4 = r2 * r2;

  // Apply the same barrel distortion formula as the shader
  const distortionAmount = 1.0 + r2 * distortion + r4 * distortion * 0.5;

  // Multiply by factor and scale (forward transformation)
  const x = screenX * distortionAmount * distortionScale;
  const y = screenY * distortionAmount * distortionScale;

  return { x, y };
}

/**
 * BarrelDistortionPointerCorrection
 *
 * This component corrects R3F's pointer coordinates to account for barrel distortion.
 * It must be placed inside the Canvas, and it modifies the internal pointer state
 * before raycasting occurs each frame.
 *
 * Without this correction, clicking on objects near the edges of the screen
 * won't work correctly because the visual position (distorted) doesn't match
 * the 3D position (undistorted) that the raycaster uses.
 */
export function BarrelDistortionPointerCorrection() {
  const { pointer } = useThree();
  const theme = useTheme();

  useFrame(() => {
    // Only apply correction if barrel distortion is enabled
    if (!theme.scene.enableBarrelDistortion) {
      return;
    }

    const distortion = theme.scene.barrelDistortion;
    const distortionScale = theme.scene.barrelDistortionScale;

    // Get the current (distorted) pointer position
    const distortedX = pointer.x;
    const distortedY = pointer.y;

    // Apply barrel distortion correction
    const corrected = correctForBarrelDistortion(
      distortedX,
      distortedY,
      distortion,
      distortionScale
    );

    // Update the pointer with corrected coordinates
    // This affects all subsequent raycasting this frame
    pointer.x = corrected.x;
    pointer.y = corrected.y;
  }, -100); // Run before other useFrame callbacks (negative priority = earlier)

  return null;
}

export default BarrelDistortionPointerCorrection;
