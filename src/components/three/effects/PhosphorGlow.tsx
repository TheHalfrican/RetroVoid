import { forwardRef, useMemo } from 'react';
import { Effect } from 'postprocessing';
import { Uniform, Color } from 'three';

// GLSL fragment shader for phosphor glow effect
// Creates a soft, diffuse halo around bright areas simulating CRT phosphor bleed
const fragmentShader = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float radius;

  // Sample offsets for blur (9-tap gaussian-like pattern)
  const vec2 offsets[9] = vec2[](
    vec2(-1.0, -1.0), vec2(0.0, -1.0), vec2(1.0, -1.0),
    vec2(-1.0,  0.0), vec2(0.0,  0.0), vec2(1.0,  0.0),
    vec2(-1.0,  1.0), vec2(0.0,  1.0), vec2(1.0,  1.0)
  );

  // Weights for gaussian blur approximation
  const float weights[9] = float[](
    0.0625, 0.125, 0.0625,
    0.125,  0.25,  0.125,
    0.0625, 0.125, 0.0625
  );

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 texelSize = 1.0 / resolution;

    // Calculate luminance of original pixel
    float luminance = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

    // Sample surrounding pixels for blur
    vec3 blurredColor = vec3(0.0);
    float blurredLuminance = 0.0;

    for (int i = 0; i < 9; i++) {
      vec2 sampleUV = uv + offsets[i] * texelSize * radius;
      vec4 sampleColor = texture2D(inputBuffer, sampleUV);
      float sampleLuminance = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));

      blurredColor += sampleColor.rgb * weights[i];
      blurredLuminance += sampleLuminance * weights[i];
    }

    // Create phosphor glow based on brightness
    // Brighter areas get more glow
    float glowAmount = smoothstep(0.2, 0.8, blurredLuminance) * intensity;

    // Mix the glow color with the blurred scene color
    vec3 phosphorGlow = mix(blurredColor, glowColor, 0.3) * glowAmount;

    // Add the phosphor glow to the original image
    // Using additive blending for that light-emitting effect
    vec3 finalColor = inputColor.rgb + phosphorGlow;

    // Slight color tinting toward the glow color for that phosphor feel
    finalColor = mix(finalColor, finalColor * (glowColor * 0.5 + 0.5), glowAmount * 0.15);

    outputColor = vec4(finalColor, inputColor.a);
  }
`;

/**
 * PhosphorGlow Effect
 *
 * Simulates the phosphor glow/bleed effect of CRT monitors.
 * Bright areas emit a soft, colored halo that bleeds into surrounding dark areas.
 */
class PhosphorGlowEffect extends Effect {
  constructor({
    glowColor = '#ff6b35',
    intensity = 0.4,
    radius = 3.0
  }: {
    glowColor?: string;
    intensity?: number;
    radius?: number;
  } = {}) {
    const color = new Color(glowColor);

    super('PhosphorGlowEffect', fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ['glowColor', new Uniform(color)],
        ['intensity', new Uniform(intensity)],
        ['radius', new Uniform(radius)]
      ])
    });
  }

  get glowColor(): Color {
    return this.uniforms.get('glowColor')!.value;
  }

  set glowColor(value: Color | string) {
    if (typeof value === 'string') {
      this.uniforms.get('glowColor')!.value.set(value);
    } else {
      this.uniforms.get('glowColor')!.value = value;
    }
  }

  get intensity(): number {
    return this.uniforms.get('intensity')!.value;
  }

  set intensity(value: number) {
    this.uniforms.get('intensity')!.value = value;
  }

  get radius(): number {
    return this.uniforms.get('radius')!.value;
  }

  set radius(value: number) {
    this.uniforms.get('radius')!.value = value;
  }
}

// React component wrapper for the effect
export interface PhosphorGlowProps {
  /** Color of the phosphor glow (hex string) */
  glowColor?: string;
  /** Intensity of the glow effect (0-1) */
  intensity?: number;
  /** Blur radius for the glow spread (1-10) */
  radius?: number;
}

export const PhosphorGlow = forwardRef<PhosphorGlowEffect, PhosphorGlowProps>(
  function PhosphorGlow({ glowColor = '#ff6b35', intensity = 0.4, radius = 3.0 }, ref) {
    const effect = useMemo(
      () => new PhosphorGlowEffect({ glowColor, intensity, radius }),
      [glowColor, intensity, radius]
    );

    return <primitive ref={ref} object={effect} dispose={null} />;
  }
);

export default PhosphorGlow;
