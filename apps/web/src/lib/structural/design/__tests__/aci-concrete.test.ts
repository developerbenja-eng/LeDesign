/**
 * ACI 318-19 Concrete Design Tests
 *
 * Validated examples from:
 * - ACI 318-19 Commentary
 * - PCI Design Handbook 8th Edition
 * - Design of Concrete Structures (Nilson, Darwin, Dolan)
 * - CRSI Design Handbook
 */

import { describe, it, expect } from 'vitest';
import {
  calculateModulusOfRupture,
  calculateConcreteModulus,
  calculateBeta1,
  calculatePhi,
  calculateFlexuralCapacitySingly,
  calculateFlexuralCapacityDoubly,
  calculateVc,
  calculateVs,
  calculateVsMax,
  calculateShearCapacity,
  calculateColumnAxialCapacity,
  calculateColumnInteractionPoint,
  calculateDevelopmentLengthTension,
  calculateDevelopmentLengthCompression,
  calculateMinFlexuralReinforcement,
  calculateMaxReinforcementRatio,
  calculateMinShearReinforcement,
  calculateMaxStirrupSpacing,
  REBAR_DATABASE,
} from '../aci-concrete';

// Helper function for approximate comparison
function approx(value: number, expected: number, tolerance: number = 0.02) {
  const percentDiff = Math.abs(value - expected) / Math.abs(expected);
  return percentDiff <= tolerance;
}

describe('ACI 318-19 Material Properties', () => {
  describe('calculateModulusOfRupture', () => {
    it('should calculate fr for f\'c = 28 MPa normal weight concrete', () => {
      // fr = 0.62 * λ * √f'c = 0.62 * 1.0 * √28 = 3.28 MPa
      const fr = calculateModulusOfRupture(28, 1.0);
      expect(approx(fr, 3.28, 0.01)).toBe(true);
    });

    it('should calculate fr for f\'c = 35 MPa with λ = 0.85 (sand-lightweight)', () => {
      // fr = 0.62 * 0.85 * √35 = 3.12 MPa
      const fr = calculateModulusOfRupture(35, 0.85);
      expect(approx(fr, 3.12, 0.01)).toBe(true);
    });

    it('should calculate fr for f\'c = 40 MPa normal weight', () => {
      // fr = 0.62 * 1.0 * √40 = 3.92 MPa
      const fr = calculateModulusOfRupture(40, 1.0);
      expect(approx(fr, 3.92, 0.01)).toBe(true);
    });
  });

  describe('calculateConcreteModulus', () => {
    it('should calculate Ec for f\'c = 28 MPa normal weight concrete (wc = 2400)', () => {
      // For wc in range [1440, 2560]: Ec = wc^1.5 * 0.043 * √f'c
      // Ec = 2400^1.5 * 0.043 * √28 ≈ 26,752 MPa
      const Ec = calculateConcreteModulus(28, 2400);
      expect(Ec).toBeGreaterThan(20000);
      expect(Ec).toBeLessThan(35000);
    });

    it('should calculate Ec for f\'c = 35 MPa normal weight concrete', () => {
      const Ec = calculateConcreteModulus(35, 2400);
      expect(Ec).toBeGreaterThan(25000);
      expect(Ec).toBeLessThan(35000);
    });

    it('should calculate Ec for lightweight concrete wc = 1800 kg/m³', () => {
      // Ec = wc^1.5 * 0.043 * √f'c = 1800^1.5 * 0.043 * √28 ≈ 17,375 MPa
      const Ec = calculateConcreteModulus(28, 1800);
      expect(approx(Ec, 17375, 0.02)).toBe(true);
    });
  });

  describe('calculateBeta1', () => {
    it('should return 0.85 for f\'c = 28 MPa', () => {
      expect(calculateBeta1(28)).toBe(0.85);
    });

    it('should return 0.85 for f\'c ≤ 28 MPa', () => {
      expect(calculateBeta1(20)).toBe(0.85);
      expect(calculateBeta1(28)).toBe(0.85);
    });

    it('should return 0.65 for f\'c ≥ 55 MPa', () => {
      expect(calculateBeta1(55)).toBe(0.65);
      expect(calculateBeta1(60)).toBe(0.65);
    });

    it('should interpolate for f\'c between 28 and 55 MPa', () => {
      // β1 = 0.85 - 0.05*(fc - 28)/7
      // For fc = 35 MPa: β1 = 0.85 - 0.05*(35-28)/7 = 0.85 - 0.05 = 0.80
      const beta1 = calculateBeta1(35);
      expect(approx(beta1, 0.80, 0.01)).toBe(true);
    });

    it('should calculate β1 = 0.80 for f\'c = 35 MPa (ACI example)', () => {
      const beta1 = calculateBeta1(35);
      expect(approx(beta1, 0.80, 0.01)).toBe(true);
    });
  });

  describe('calculatePhi', () => {
    it('should return 0.90 for tension-controlled sections (εt ≥ 0.005)', () => {
      expect(calculatePhi(0.005)).toBe(0.90);
      expect(calculatePhi(0.010)).toBe(0.90);
    });

    it('should return 0.65 for compression-controlled tied columns (εt ≤ 0.002)', () => {
      expect(calculatePhi(0.002, 'column', 'tied')).toBe(0.65);
      expect(calculatePhi(0.001, 'column', 'tied')).toBe(0.65);
    });

    it('should return 0.75 for compression-controlled spiral columns', () => {
      expect(calculatePhi(0.002, 'column', 'spiral')).toBe(0.75);
    });

    it('should interpolate in transition zone', () => {
      // For εt = 0.0035 (midpoint between 0.002 and 0.005)
      // φ = 0.65 + (0.90 - 0.65) * (0.0035 - 0.002) / (0.005 - 0.002)
      // φ = 0.65 + 0.25 * 0.5 = 0.775
      const phi = calculatePhi(0.0035, 'beam', 'tied');
      expect(approx(phi, 0.775, 0.01)).toBe(true);
    });
  });
});

describe('ACI 318-19 Flexural Design', () => {
  describe('calculateFlexuralCapacitySingly - Validated Example 1', () => {
    /**
     * Example from Design of Concrete Structures (Nilson)
     * Beam: b = 300 mm, d = 540 mm
     * As = 3-#25 = 3 * 509 = 1527 mm²
     * f'c = 28 MPa, fy = 420 MPa
     *
     * Expected:
     * a = As*fy / (0.85*f'c*b) = 1527*420 / (0.85*28*300) = 89.8 mm
     * c = a/β1 = 89.8/0.85 = 105.6 mm
     * εt = 0.003*(540-105.6)/105.6 = 0.0123 > 0.005 (tension controlled)
     * φ = 0.90
     * Mn = As*fy*(d - a/2) = 1527*420*(540 - 44.9) / 10^6 = 317.4 kN·m
     * φMn = 0.90 * 317.4 = 285.7 kN·m
     */
    it('should calculate capacity for tension-controlled beam', () => {
      const result = calculateFlexuralCapacitySingly(300, 540, 1527, 28, 420);

      // Check stress block depth
      expect(approx(result.a, 89.8, 0.02)).toBe(true);

      // Check neutral axis depth
      expect(approx(result.c, 105.6, 0.02)).toBe(true);

      // Check tension steel strain (tension controlled)
      expect(result.epsilon_t).toBeGreaterThan(0.005);
      expect(result.controlMode).toBe('tension');

      // Check phi factor
      expect(result.phi).toBe(0.90);

      // Check moment capacity
      expect(approx(result.Mn, 317.4, 0.02)).toBe(true);
      expect(approx(result.phi_Mn, 285.7, 0.02)).toBe(true);
    });
  });

  describe('calculateFlexuralCapacitySingly - Validated Example 2', () => {
    /**
     * Standard beam design check
     * b = 350 mm, d = 600 mm
     * As = 4-#22 = 4 * 387 = 1548 mm²
     * f'c = 35 MPa, fy = 420 MPa
     *
     * β1 = 0.80 (for f'c = 35 MPa)
     * a = 1548*420 / (0.85*35*350) = 62.4 mm
     * c = 62.4/0.80 = 78.0 mm
     * εt = 0.003*(600-78)/78 = 0.0201 > 0.005 (tension controlled)
     * Mn = 1548*420*(600 - 31.2) / 10^6 = 369.8 kN·m
     */
    it('should calculate capacity for beam with f\'c = 35 MPa', () => {
      const result = calculateFlexuralCapacitySingly(350, 600, 1548, 35, 420);

      expect(approx(result.a, 62.4, 0.03)).toBe(true);
      expect(result.controlMode).toBe('tension');
      expect(result.phi).toBe(0.90);
      expect(approx(result.Mn, 369.8, 0.03)).toBe(true);
    });
  });

  describe('calculateFlexuralCapacitySingly - High Reinforcement Ratio', () => {
    /**
     * Heavily reinforced beam (transition zone)
     * b = 300 mm, d = 400 mm
     * As = 8-#25 = 4072 mm²
     * f'c = 28 MPa, fy = 420 MPa
     *
     * a = 4072*420 / (0.85*28*300) = 239.6 mm
     * c = 239.6/0.85 = 281.9 mm
     * εt = 0.003*(400-281.9)/281.9 = 0.00126 < 0.005
     */
    it('should identify compression/transition control mode', () => {
      const result = calculateFlexuralCapacitySingly(300, 400, 4072, 28, 420);

      expect(result.epsilon_t).toBeLessThan(0.005);
      expect(result.controlMode).not.toBe('tension');
      expect(result.phi).toBeLessThan(0.90);
    });
  });

  describe('calculateFlexuralCapacityDoubly', () => {
    /**
     * Doubly reinforced beam
     * b = 300 mm, d = 540 mm, d' = 60 mm
     * As = 2036 mm² (4-#25), As' = 1018 mm² (2-#25)
     * f'c = 28 MPa, fy = 420 MPa
     */
    it('should calculate doubly reinforced beam capacity', () => {
      const result = calculateFlexuralCapacityDoubly(300, 540, 60, 2036, 1018, 28, 420);

      // Verify compression steel contributes
      expect(result.Mn).toBeGreaterThan(0);
      expect(result.phi_Mn).toBeGreaterThan(0);

      // Should be tension controlled with doubly reinforced section
      expect(result.controlMode).toBe('tension');
    });
  });
});

describe('ACI 318-19 Shear Design', () => {
  describe('calculateVc - Basic shear strength', () => {
    /**
     * Basic Vc calculation
     * Vc = 0.17 * λ * √f'c * bw * d
     * For b = 300 mm, d = 540 mm, f'c = 28 MPa, λ = 1.0
     * Vc = 0.17 * 1.0 * √28 * 300 * 540 / 1000 = 145.8 kN
     */
    it('should calculate basic Vc without axial load', () => {
      const Vc = calculateVc(28, 300, 540, 0, 0, 1.0);
      expect(approx(Vc, 145.8, 0.02)).toBe(true);
    });

    it('should calculate Vc with compression (increased)', () => {
      const Vc_basic = calculateVc(28, 300, 540, 0, 0, 1.0);
      const Ag = 300 * 600;
      const Vc_compression = calculateVc(28, 300, 540, 100, Ag, 1.0);

      expect(Vc_compression).toBeGreaterThan(Vc_basic);
    });

    it('should calculate Vc with tension (decreased)', () => {
      const Vc_basic = calculateVc(28, 300, 540, 0, 0, 1.0);
      const Ag = 300 * 600;
      const Vc_tension = calculateVc(28, 300, 540, -50, Ag, 1.0);

      expect(Vc_tension).toBeLessThan(Vc_basic);
    });

    it('should calculate Vc for lightweight concrete (λ = 0.75)', () => {
      const Vc_normal = calculateVc(28, 300, 540, 0, 0, 1.0);
      const Vc_lwc = calculateVc(28, 300, 540, 0, 0, 0.75);

      expect(approx(Vc_lwc / Vc_normal, 0.75, 0.01)).toBe(true);
    });
  });

  describe('calculateVs - Steel contribution', () => {
    /**
     * Vs = Av * fy * d / s
     * For Av = 142 mm² (2-#4), fy = 420 MPa, d = 540 mm, s = 200 mm
     * Vs = 142 * 420 * 540 / (200 * 1000) = 161.0 kN
     */
    it('should calculate Vs for typical stirrup configuration', () => {
      const Vs = calculateVs(142, 420, 540, 200);
      expect(approx(Vs, 161.0, 0.02)).toBe(true);
    });

    it('should calculate Vs for closer spacing', () => {
      const Vs_200 = calculateVs(142, 420, 540, 200);
      const Vs_100 = calculateVs(142, 420, 540, 100);

      expect(approx(Vs_100 / Vs_200, 2.0, 0.01)).toBe(true);
    });
  });

  describe('calculateVsMax', () => {
    /**
     * Vs,max = 0.66 * √f'c * bw * d
     * For b = 300 mm, d = 540 mm, f'c = 28 MPa
     * Vs,max = 0.66 * √28 * 300 * 540 / 1000 = 565.8 kN
     */
    it('should calculate maximum Vs', () => {
      const VsMax = calculateVsMax(28, 300, 540);
      expect(approx(VsMax, 565.8, 0.02)).toBe(true);
    });
  });

  describe('calculateShearCapacity - Complete check', () => {
    it('should calculate total shear capacity', () => {
      const result = calculateShearCapacity(28, 420, 300, 540, 142, 200, 0, 0, 1.0);

      const expectedVc = 145.8;
      const expectedVs = 161.0;
      const expectedVn = expectedVc + expectedVs;

      expect(approx(result.Vc, expectedVc, 0.03)).toBe(true);
      expect(approx(result.Vs, expectedVs, 0.03)).toBe(true);
      expect(approx(result.Vn, expectedVn, 0.03)).toBe(true);
      expect(approx(result.phi_Vn, 0.75 * expectedVn, 0.03)).toBe(true);
    });
  });
});

describe('ACI 318-19 Column Design', () => {
  describe('calculateColumnAxialCapacity', () => {
    /**
     * Tied column: 400 x 400 mm
     * As = 8-#25 = 4072 mm²
     * f'c = 35 MPa, fy = 420 MPa
     *
     * Ag = 160,000 mm²
     * Pn,max = 0.80 * [0.85*f'c*(Ag - Ast) + fy*Ast] / 1000
     * = 0.80 * [0.85*35*(160000-4072) + 420*4072] / 1000
     * = 0.80 * [4636800 + 1710240] / 1000
     * = 0.80 * 6347.04 = 5077.6 kN
     * φPn,max = 0.65 * 5077.6 = 3300.4 kN
     */
    it('should calculate tied column axial capacity', () => {
      // Function signature: calculateColumnAxialCapacity(fc, fy, Ag, Ast, confinement)
      const result = calculateColumnAxialCapacity(35, 420, 160000, 4072, 'tied');

      expect(result.Pn_max).toBeGreaterThan(0);
      expect(result.phi_Pn_max).toBeLessThan(result.Pn_max);
      // Allow 5% tolerance for calculation differences
      expect(approx(result.phi_Pn_max, 3300, 0.05)).toBe(true);
    });

    it('should give higher capacity for spiral columns', () => {
      const tied = calculateColumnAxialCapacity(35, 420, 160000, 4072, 'tied');
      const spiral = calculateColumnAxialCapacity(35, 420, 160000, 4072, 'spiral');

      // Spiral columns have higher φ factor (0.75 vs 0.65)
      expect(spiral.phi_Pn_max).toBeGreaterThan(tied.phi_Pn_max);
    });
  });

  describe('calculateColumnInteractionPoint', () => {
    /**
     * Test column interaction point calculation
     * Column: 400 x 400 mm
     * d' = 60 mm, d = 340 mm
     * As (tension) = 2036 mm², As' (compression) = 2036 mm²
     * f'c = 35 MPa, fy = 420 MPa
     * c = 200 mm (neutral axis depth)
     */
    it('should calculate interaction point correctly', () => {
      // Function signature: calculateColumnInteractionPoint(b, h, d, d_prime, As, As_prime, fc, fy, c)
      const result = calculateColumnInteractionPoint(
        400,   // b
        400,   // h
        340,   // d
        60,    // d_prime
        2036,  // As (tension)
        2036,  // As_prime (compression)
        35,    // fc
        420,   // fy
        200    // c (neutral axis depth)
      );

      expect(result.Pn).toBeGreaterThan(0);
      expect(result.Mn).toBeGreaterThan(0);
      expect(result.phi).toBeGreaterThan(0);
      expect(result.phi).toBeLessThanOrEqual(0.90);
    });

    it('should give pure compression when c is very large', () => {
      // Large c = most of section in compression
      const result = calculateColumnInteractionPoint(400, 400, 340, 60, 2036, 2036, 35, 420, 800);
      expect(result.Pn).toBeGreaterThan(0);
      expect(result.phi).toBeLessThan(0.90); // Compression controlled
    });
  });
});

describe('ACI 318-19 Development Length', () => {
  describe('calculateDevelopmentLengthTension', () => {
    /**
     * Development length for #8 bar in 28 MPa concrete
     * Function signature: calculateDevelopmentLengthTension(db, fy, fc, cover, spacing, isTopBar, isEpoxyCoated, isLightweight)
     */
    it('should calculate tension development length for bottom bars', () => {
      // db = 25.4 mm, fy = 420 MPa, fc = 28 MPa, cover = 40 mm, spacing = 50 mm
      const result = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, false, false, false);

      expect(result.ld).toBeGreaterThan(0);
      expect(result.ld_min).toBeGreaterThanOrEqual(300); // ACI minimum
    });

    it('should increase ld for top bars', () => {
      const result_bottom = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, false, false, false);
      const result_top = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, true, false, false);

      expect(result_top.ld).toBeGreaterThan(result_bottom.ld);
    });

    it('should increase ld for epoxy-coated bars', () => {
      const result_uncoated = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, false, false, false);
      const result_epoxy = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, false, true, false);

      expect(result_epoxy.ld).toBeGreaterThan(result_uncoated.ld);
    });

    it('should increase ld for lightweight concrete', () => {
      const result_normal = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, false, false, false);
      const result_lwc = calculateDevelopmentLengthTension(25.4, 420, 28, 40, 50, false, false, true);

      expect(result_lwc.ld).toBeGreaterThan(result_normal.ld);
    });
  });

  describe('calculateDevelopmentLengthCompression', () => {
    /**
     * Compression development length for #8 bar
     * ldc = greater of (0.24*fy*db/√f'c) or (0.043*fy*db)
     *
     * For db = 25.4 mm, fy = 420 MPa, f'c = 28 MPa:
     * ldc1 = 0.24 * 420 * 25.4 / √28 = 484.3 mm
     * ldc2 = 0.043 * 420 * 25.4 = 458.7 mm
     * ldc = max(484.3, 458.7) = 484.3 mm ≥ 200 mm minimum
     */
    it('should calculate compression development length', () => {
      // Function signature: calculateDevelopmentLengthCompression(db, fy, fc)
      const result = calculateDevelopmentLengthCompression(25.4, 420, 28);

      expect(result.ldc).toBeGreaterThan(0);
      expect(result.ldc_min).toBeGreaterThanOrEqual(200); // ACI minimum
      expect(approx(result.ldc, 484, 0.05)).toBe(true);
    });

    it('should decrease ldc with higher concrete strength', () => {
      const result_28 = calculateDevelopmentLengthCompression(25.4, 420, 28);
      const result_40 = calculateDevelopmentLengthCompression(25.4, 420, 40);

      expect(result_40.ldc).toBeLessThan(result_28.ldc);
    });
  });
});

describe('ACI 318-19 Minimum Reinforcement', () => {
  describe('calculateMinFlexuralReinforcement', () => {
    /**
     * As,min = max(0.25*√f'c/fy * bw*d, 1.4/fy * bw*d)
     *
     * For b = 300 mm, d = 540 mm, f'c = 28 MPa, fy = 420 MPa:
     * As1 = 0.25*√28/420 * 300 * 540 = 510.4 mm²
     * As2 = 1.4/420 * 300 * 540 = 540.0 mm²
     * As,min = 540.0 mm²
     *
     * Function signature: calculateMinFlexuralReinforcement(fc, fy, b, d)
     */
    it('should calculate minimum flexural reinforcement', () => {
      const As_min = calculateMinFlexuralReinforcement(28, 420, 300, 540);
      expect(approx(As_min, 540, 0.03)).toBe(true);
    });

    it('should increase As_min with larger section', () => {
      const As_min_small = calculateMinFlexuralReinforcement(28, 420, 300, 400);
      const As_min_large = calculateMinFlexuralReinforcement(28, 420, 300, 600);

      expect(As_min_large).toBeGreaterThan(As_min_small);
    });
  });

  describe('calculateMaxReinforcementRatio', () => {
    /**
     * Maximum reinforcement ratio for tension-controlled behavior
     * ρmax = 0.85 * β1 * f'c/fy * εcu/(εcu + 0.005)
     *
     * For f'c = 28 MPa, fy = 420 MPa, β1 = 0.85:
     * ρmax = 0.85 * 0.85 * 28/420 * 0.003/(0.003 + 0.005)
     *      = 0.7225 * 0.0667 * 0.375 = 0.0181
     */
    it('should calculate maximum reinforcement ratio', () => {
      const rho_max = calculateMaxReinforcementRatio(28, 420);
      // Using εcu/(εcu + 0.005) = 0.003/0.008 = 0.375
      expect(rho_max).toBeGreaterThan(0.01);
      expect(rho_max).toBeLessThan(0.03);
    });

    it('should increase rho_max with higher concrete strength', () => {
      const rho_max_28 = calculateMaxReinforcementRatio(28, 420);
      const rho_max_40 = calculateMaxReinforcementRatio(40, 420);

      expect(rho_max_40).toBeGreaterThan(rho_max_28);
    });
  });

  describe('calculateMinShearReinforcement', () => {
    /**
     * Av,min = max(0.062*√f'c*bw*s/fyt, 0.35*bw*s/fyt)
     *
     * For bw = 300 mm, s = 200 mm, f'c = 28 MPa, fyt = 420 MPa:
     * Av1 = 0.062*√28*300*200/420 = 46.9 mm²
     * Av2 = 0.35*300*200/420 = 50.0 mm²
     * Av,min = 50.0 mm²
     *
     * Function signature: calculateMinShearReinforcement(fc, fy, b, s)
     */
    it('should calculate minimum shear reinforcement', () => {
      const Av_min = calculateMinShearReinforcement(28, 420, 300, 200);
      expect(approx(Av_min, 50, 0.03)).toBe(true);
    });

    it('should increase Av_min with spacing', () => {
      const Av_min_100 = calculateMinShearReinforcement(28, 420, 300, 100);
      const Av_min_200 = calculateMinShearReinforcement(28, 420, 300, 200);

      expect(Av_min_200).toBeGreaterThan(Av_min_100);
    });
  });

  describe('calculateMaxStirrupSpacing', () => {
    /**
     * Maximum stirrup spacing (ACI 318-19 9.7.6.2.2):
     * If Vs ≤ Vs_limit/2: s_max = min(d/2, 600 mm)
     * If Vs > Vs_limit/2: s_max = min(d/4, 300 mm)
     *
     * Function signature: calculateMaxStirrupSpacing(d, Vs, Vs_limit)
     */
    it('should return d/2 or 600mm for low shear', () => {
      const d = 540;
      const Vs_limit = 500; // kN
      const Vs = 100; // kN (less than Vs_limit/2 = 250 kN)
      const s_max = calculateMaxStirrupSpacing(d, Vs, Vs_limit);

      expect(s_max).toBeLessThanOrEqual(Math.min(d / 2, 600));
      expect(s_max).toBe(270); // d/2 = 270 mm
    });

    it('should return d/4 or 300mm for high shear', () => {
      const d = 540;
      const Vs_limit = 500; // kN
      const Vs = 300; // kN (greater than Vs_limit/2 = 250 kN)
      const s_max = calculateMaxStirrupSpacing(d, Vs, Vs_limit);

      expect(s_max).toBeLessThanOrEqual(Math.min(d / 4, 300));
      expect(s_max).toBe(135); // d/4 = 135 mm
    });
  });
});

describe('REBAR_DATABASE', () => {
  it('should have correct #8 bar properties', () => {
    const bar = REBAR_DATABASE['#8'];
    expect(bar.diameter).toBe(25.4);
    expect(bar.area).toBe(509);
  });

  it('should have all standard bar sizes', () => {
    const sizes = ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11', '#14', '#18'];
    sizes.forEach(size => {
      expect(REBAR_DATABASE[size]).toBeDefined();
      expect(REBAR_DATABASE[size].diameter).toBeGreaterThan(0);
      expect(REBAR_DATABASE[size].area).toBeGreaterThan(0);
    });
  });

  it('should have increasing areas for larger bars', () => {
    const sizes = ['#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10', '#11'];
    for (let i = 0; i < sizes.length - 1; i++) {
      expect(REBAR_DATABASE[sizes[i + 1]].area).toBeGreaterThan(REBAR_DATABASE[sizes[i]].area);
    }
  });
});
