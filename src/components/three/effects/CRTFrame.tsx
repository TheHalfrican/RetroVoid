import { forwardRef, useMemo } from 'react';
import { Effect } from 'postprocessing';
import { Uniform } from 'three';

// GLSL fragment shader for hard-edge CRT frame/border
// Creates an absolute black border that nothing can bleed past
const fragmentShader = /* glsl */ `
  uniform float borderRadius;
  uniform float borderSoftness;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    // Convert UV to centered coordinates (-1 to 1)
    vec2 centered = uv * 2.0 - 1.0;

    // Calculate distance from center using rounded rectangle formula
    // This creates a CRT-like rounded rectangle shape
    vec2 absCoord = abs(centered);

    // Rounded rectangle distance (higher power = more rectangular, lower = more circular)
    float dist = pow(absCoord.x, 2.5) + pow(absCoord.y, 2.5);

    // Create hard edge with small softness for anti-aliasing
    // borderRadius controls where the black border starts (0.8 = 80% from center)
    float edge = smoothstep(borderRadius - borderSoftness, borderRadius, dist);

    // Mix between input color and black based on edge
    vec3 finalColor = mix(inputColor.rgb, vec3(0.0), edge);

    outputColor = vec4(finalColor, inputColor.a);
  }
`;

/**
 * CRTFrame Effect
 *
 * Creates a hard-edge black border/frame around the viewport,
 * simulating the bezel of a CRT monitor. Nothing can bleed past this border.
 */
class CRTFrameEffect extends Effect {
  constructor({
    borderRadius = 0.85,
    borderSoftness = 0.02
  }: {
    borderRadius?: number;
    borderSoftness?: number;
  } = {}) {
    super('CRTFrameEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['borderRadius', new Uniform(borderRadius)],
        ['borderSoftness', new Uniform(borderSoftness)]
      ])
    });
  }

  get borderRadius(): number {
    return this.uniforms.get('borderRadius')!.value;
  }

  set borderRadius(value: number) {
    this.uniforms.get('borderRadius')!.value = value;
  }

  get borderSoftness(): number {
    return this.uniforms.get('borderSoftness')!.value;
  }

  set borderSoftness(value: number) {
    this.uniforms.get('borderSoftness')!.value = value;
  }
}

// React component wrapper
export interface CRTFrameProps {
  /** Where the black border starts (0-1, lower = larger visible area). Default 0.85 */
  borderRadius?: number;
  /** Softness of the edge for anti-aliasing (0.01-0.1). Default 0.02 */
  borderSoftness?: number;
  /** Set to true to enable the effect */
  enabled?: boolean;
}

export const CRTFrame = forwardRef<CRTFrameEffect, CRTFrameProps>(
  function CRTFrame({ borderRadius = 0.85, borderSoftness = 0.02, enabled = true }, ref) {
    const effect = useMemo(
      () => new CRTFrameEffect({
        borderRadius: enabled ? borderRadius : 999, // 999 effectively disables it
        borderSoftness
      }),
      [borderRadius, borderSoftness, enabled]
    );

    return <primitive ref={ref} object={effect} dispose={null} />;
  }
);

export default CRTFrame;
