import { useCallback } from 'react';
import { useTheme } from './useTheme';

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
  // If no distortion, return as-is
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
 * Hook that provides a function to correct mouse coordinates for barrel distortion.
 *
 * When barrel distortion is enabled, 3D objects appear at different screen positions
 * than their actual 3D coordinates due to the visual warping. This hook provides a
 * correction function that converts screen click positions to the corresponding
 * undistorted 3D space coordinates for accurate raycasting.
 *
 * Usage:
 * ```
 * const correctCoordinates = useBarrelDistortionCorrection();
 *
 * // In your screenToNDC or similar function:
 * const ndc = {
 *   x: (screenX / width) * 2 - 1,
 *   y: -(screenY / height) * 2 + 1
 * };
 * const corrected = correctCoordinates(ndc.x, ndc.y);
 * // Use corrected.x and corrected.y for raycasting
 * ```
 */
export function useBarrelDistortionCorrection() {
  const theme = useTheme();

  const correctCoordinates = useCallback((ndcX: number, ndcY: number) => {
    // Only apply correction if barrel distortion is enabled
    if (!theme.scene.enableBarrelDistortion) {
      return { x: ndcX, y: ndcY };
    }

    const distortion = theme.scene.barrelDistortion;
    const distortionScale = theme.scene.barrelDistortionScale;

    return correctForBarrelDistortion(ndcX, ndcY, distortion, distortionScale);
  }, [
    theme.scene.enableBarrelDistortion,
    theme.scene.barrelDistortion,
    theme.scene.barrelDistortionScale
  ]);

  return correctCoordinates;
}

export default useBarrelDistortionCorrection;
