import { forwardRef, useMemo } from 'react';
import { Effect } from 'postprocessing';
import { Uniform } from 'three';

// GLSL fragment shader for barrel distortion (CRT screen curvature)
const fragmentShader = /* glsl */ `
  uniform float distortion;
  uniform float distortionScale;

  void mainUv(inout vec2 uv) {
    // Convert UV to centered coordinates (-1 to 1)
    vec2 centered = uv * 2.0 - 1.0;

    // Calculate radial distance from center
    float r2 = dot(centered, centered);
    float r4 = r2 * r2;

    // Apply barrel distortion formula
    // Positive distortion = barrel (CRT bulge), negative = pincushion
    float distortionAmount = 1.0 + r2 * distortion + r4 * distortion * 0.5;

    // Apply distortion
    vec2 distorted = centered * distortionAmount;

    // Scale to keep edges visible
    distorted *= distortionScale;

    // Convert back to UV coordinates
    uv = distorted * 0.5 + 0.5;
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Check if UV is outside bounds (creates the rounded corner effect)
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      outputColor = inputColor;
    }
  }
`;

/**
 * BarrelDistortion Effect
 *
 * Simulates the curved glass of CRT monitors by applying barrel distortion
 * to the rendered scene. Creates that classic "bulging screen" look.
 */
class BarrelDistortionEffect extends Effect {
  constructor({
    distortion = 0.1,
    distortionScale = 0.95
  }: {
    distortion?: number;
    distortionScale?: number;
  } = {}) {
    super('BarrelDistortionEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['distortion', new Uniform(distortion)],
        ['distortionScale', new Uniform(distortionScale)]
      ])
    });
  }

  get distortion(): number {
    return this.uniforms.get('distortion')!.value;
  }

  set distortion(value: number) {
    this.uniforms.get('distortion')!.value = value;
  }

  get distortionScale(): number {
    return this.uniforms.get('distortionScale')!.value;
  }

  set distortionScale(value: number) {
    this.uniforms.get('distortionScale')!.value = value;
  }
}

// React component wrapper for the effect
export interface BarrelDistortionProps {
  /** Amount of barrel distortion (0 = none, 0.1 = subtle, 0.3 = strong) */
  distortion?: number;
  /** Scale factor to keep edges visible (0.9-1.0 recommended) */
  distortionScale?: number;
}

export const BarrelDistortion = forwardRef<BarrelDistortionEffect, BarrelDistortionProps>(
  function BarrelDistortion({ distortion = 0.1, distortionScale = 0.95 }, ref) {
    const effect = useMemo(
      () => new BarrelDistortionEffect({ distortion, distortionScale }),
      [distortion, distortionScale]
    );

    return <primitive ref={ref} object={effect} dispose={null} />;
  }
);

export default BarrelDistortion;
