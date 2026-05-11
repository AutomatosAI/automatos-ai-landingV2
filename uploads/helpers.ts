/**
 * BudStack Template Generator - Helper Functions
 *
 * Utility functions for template generation:
 * - Color conversion (HEX → HSL → RGB)
 * - Color scale generation
 * - Theme asset generation (shadows, gradients)
 * - Validation
 * - Find and replace
 */

/**
 * Convert HEX color to HSL format (without hsl() wrapper)
 * @param hex - Color in HEX format (e.g., "#3B82F6" or "3B82F6")
 * @returns HSL string in format "H S% L%" (e.g., "217 91% 60%")
 */
export function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Find min and max
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Convert to degrees and percentages
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  const lPercent = Math.round(l * 100);

  return `${h} ${s}% ${lPercent}%`;
}

/**
 * Convert HSL to RGB (for shadows and gradients)
 * @param hsl - HSL string in format "H S% L%" (e.g., "217 91% 60%")
 * @returns RGB object {r, g, b} with values 0-255
 */
export function hslToRGB(hsl: string): { r: number; g: number; b: number } {
  // Parse HSL values
  const parts = hsl.split(' ');
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Generate full color scale (50-900) from base HSL
 * @param baseHSL - Base HSL in format "H S% L%" (should be the 500 value)
 * @returns Object with keys 50-900 and HSL values
 */
export function generateColorScale(baseHSL: string): Record<string, string> {
  // Parse base HSL
  const parts = baseHSL.split(' ');
  const h = parts[0];
  const s = parts[1];
  const baseL = parseInt(parts[2]);

  // Lightness values for each scale
  const lightness = {
    '50': 97,
    '100': 92,
    '200': 82,
    '300': 72,
    '400': 66,
    '500': baseL, // Use provided base
    '600': Math.max(baseL - 10, 40),
    '700': Math.max(baseL - 20, 30),
    '800': Math.max(baseL - 30, 20),
    '900': Math.max(baseL - 40, 14)
  };

  const scale: Record<string, string> = {};
  for (const [key, value] of Object.entries(lightness)) {
    scale[key] = `${h} ${s} ${value}%`;
  }

  return scale;
}

/**
 * Generate theme-specific shadow values with brand color
 * @param hsl - Primary color in HSL format
 * @returns Object with shadow definitions
 */
export function generateShadows(hsl: string): Record<string, string> {
  const rgb = hslToRGB(hsl);

  return {
    'theme-sm': `0 2px 8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08)`,
    'theme-md': `0 4px 16px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)`,
    'theme-lg': `0 8px 32px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.16)`,
    'theme-xl': `0 12px 48px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.20)`,
    'theme-2xl': `0 20px 64px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.24)`
  };
}

/**
 * Generate brand gradients using color scale
 * @param hsl - Primary color in HSL format
 * @returns Object with gradient definitions
 */
export function generateGradients(hsl: string): Record<string, string> {
  const scale = generateColorScale(hsl);
  const rgb = hslToRGB(hsl);

  return {
    'primary': `linear-gradient(135deg, hsl(${scale['500']}) 0%, hsl(${scale['700']}) 100%)`,
    'secondary': `linear-gradient(135deg, hsl(${scale['700']}) 0%, hsl(${scale['900']}) 100%)`,
    'hero-overlay': `linear-gradient(180deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8) 100%)`,
    'card-hover': `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05) 100%)`
  };
}

/**
 * Validate HSL format
 * @param hsl - HSL string to validate
 * @returns true if valid HSL format
 */
export function validateHSL(hsl: string): boolean {
  // Check for hsl() wrapper (should NOT be present)
  if (hsl.includes('hsl(')) {
    console.error('❌ HSL should NOT include hsl() wrapper');
    return false;
  }

  // Check format: "H S% L%"
  const pattern = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
  if (!pattern.test(hsl)) {
    console.error('❌ Invalid HSL format. Expected: "H S% L%" (e.g., "217 91% 60%")');
    return false;
  }

  // Parse values
  const parts = hsl.split(' ');
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1]);
  const l = parseInt(parts[2]);

  // Validate ranges
  if (h < 0 || h > 360) {
    console.error('❌ Hue must be 0-360');
    return false;
  }
  if (s < 0 || s > 100) {
    console.error('❌ Saturation must be 0-100');
    return false;
  }
  if (l < 0 || l > 100) {
    console.error('❌ Lightness must be 0-100');
    return false;
  }

  return true;
}

/**
 * Bulk find and replace in content
 * @param content - String content to process
 * @param replacements - Object with find-replace pairs
 * @returns Processed content with replacements
 */
export function findAndReplace(
  content: string,
  replacements: Record<string, string>
): string {
  let result = content;

  for (const [find, replace] of Object.entries(replacements)) {
    // Escape special regex characters in find string
    const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedFind, 'g');
    result = result.replace(regex, replace);
  }

  return result;
}

/**
 * Generate RGB string from HSL for CSS
 * @param hsl - HSL string
 * @returns RGB string in format "R, G, B"
 */
export function hslToRGBString(hsl: string): string {
  const rgb = hslToRGB(hsl);
  return `${rgb.r}, ${rgb.g}, ${rgb.b}`;
}

/**
 * Validate template name/slug
 * @param slug - Template slug to validate
 * @returns true if valid slug format
 */
export function validateSlug(slug: string): boolean {
  // Slug should be lowercase, hyphen-separated
  const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  if (!pattern.test(slug)) {
    console.error('❌ Invalid slug format. Use lowercase with hyphens (e.g., "modern-medical")');
    return false;
  }

  // Check for reserved words
  const reserved = ['template-slug', 'template-base', 'base-template'];
  if (reserved.includes(slug)) {
    console.error('❌ Slug cannot be a reserved word');
    return false;
  }

  return true;
}

/**
 * Generate template config from requirements
 * @param requirements - User requirements object
 * @returns Template config object
 */
export function generateTemplateConfig(requirements: {
  name: string;
  slug: string;
  description: string;
  category: string;
  tags: string[];
  styleKeywords: string[];
}): Record<string, any> {
  return {
    id: requirements.slug,
    slug: requirements.slug,
    name: requirements.name,
    description: requirements.description,
    category: requirements.category,
    tags: requirements.tags,
    styleKeywords: requirements.styleKeywords,
    features: [
      'Responsive hero section',
      'Brand color theming',
      'Professional layout',
      'Call-to-action sections',
      'Mobile-optimized'
    ],
    author: 'BudStack Platform',
    version: '1.0.0',
    compatibility: {
      nextjs: '14.x',
      react: '18.x',
      tailwind: '3.x'
    },
    accessibility: {
      wcagLevel: 'AA',
      features: ['Semantic HTML', 'ARIA labels', 'Keyboard navigation']
    }
  };
}

/**
 * Generate value propositions based on style keywords and audience
 * @param styleKeywords - Array of style keywords
 * @param targetAudience - Target audience description
 * @returns Array of 4 value propositions
 */
export function generateValueProps(
  styleKeywords: string[],
  targetAudience: string
): Array<{ title: string; description: string; icon: string }> {
  // Default props that work for medical cannabis
  const defaultProps = [
    {
      title: 'Expert Guidance',
      description: 'Professional support throughout your wellness journey',
      icon: 'Shield'
    },
    {
      title: 'Quality Products',
      description: 'Premium medical cannabis solutions for your needs',
      icon: 'Star'
    },
    {
      title: 'Trusted Care',
      description: 'Compassionate service in a safe, welcoming environment',
      icon: 'Heart'
    },
    {
      title: 'Easy Access',
      description: 'Simple consultation and prescription process',
      icon: 'Check'
    }
  ];

  // Could customize based on keywords/audience in future
  // For now, return professional defaults
  return defaultProps;
}

/**
 * Check if file contains placeholder values
 * @param content - File content to check
 * @returns Array of found placeholders
 */
export function findPlaceholders(content: string): string[] {
  const placeholders = [
    'template-slug',
    'template-base',
    'Template Name',
    'Your Main Hero Title',
    'Your compelling subtitle',
    'Value Proposition 1',
    'Description of first value proposition'
  ];

  const found: string[] = [];
  for (const placeholder of placeholders) {
    if (content.includes(placeholder)) {
      found.push(placeholder);
    }
  }

  return found;
}

/**
 * Validation summary for generated template
 * @param templatePath - Path to template directory
 * @returns Validation report
 */
export async function validateTemplate(templatePath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required files exist
  const requiredFiles = [
    'index.tsx',
    'template.config.json',
    'defaults.json',
    'styles.css',
    'components/Hero.tsx',
    'components/ConsultationCTA.tsx'
  ];

  // Note: Actual file checking would require fs operations
  // This is a template for the validation structure

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Editor-parity validators
//
// These mirror nextjs_space/lib/types/template-layout.ts and
// nextjs_space/app/tenant-admin/branding/types.ts. Use during template
// generation to keep emitted JSON round-trip-safe with the Store Editor.
// See references/editor-parity.md and scripts/validate-layout.ts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate raw-HSL channel format (no `hsl()` wrapper).
 * Examples:
 *   validateHsl("178 48% 21%")      // true
 *   validateHsl("hsl(178 48% 21%)") // false  (wrapper)
 *   validateHsl("#0E5C56")           // false  (hex)
 *
 * Lower-case alias of validateHSL for the API contract documented
 * in references/design-tokens.md.
 *
 * @param value - candidate raw-HSL string
 * @returns true if value matches "H S% L%" with valid ranges
 */
export function validateHsl(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.includes('hsl(') || value.includes(')')) return false;

  const pattern = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
  if (!pattern.test(value.trim())) return false;

  const parts = value.trim().split(/\s+/);
  const h = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  const l = parseInt(parts[2], 10);

  if (Number.isNaN(h) || h < 0 || h > 360) return false;
  if (Number.isNaN(s) || s < 0 || s > 100) return false;
  if (Number.isNaN(l) || l < 0 || l > 100) return false;

  return true;
}

/**
 * The 8 keys the editor's per-section colour panel allows. Anything else in
 * a `colorOverrides` object is silently dropped on save and indicates a
 * generation bug — the operator will lose those overrides on the next save.
 *
 * Source of truth: nextjs_space/lib/types/template-layout.ts::SectionColorOverrides
 */
export const SECTION_COLOR_OVERRIDE_KEYS = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
  'heading',
  'border'
] as const;

export type SectionColorOverrideKey = typeof SECTION_COLOR_OVERRIDE_KEYS[number];

/**
 * Validate a section-level `colorOverrides` object.
 * Returns a list of issue strings — empty array means valid.
 *
 *   validateColorOverrides({ primary: "150 40% 30%" })            // []
 *   validateColorOverrides({ primary: "#0E5C56" })                 // []  (hex tolerated)
 *   validateColorOverrides({ heroBackground: "150 40% 30%" })      // ["Unknown key: heroBackground..."]
 *   validateColorOverrides({ primary: "hsl(150 40% 30%)" })        // ["primary: ..."]
 *
 * Hex (`#RRGGBB`) is accepted because the editor's TenantThemeProvider
 * auto-converts hex to channel format at render time. Generators should
 * still prefer raw-HSL — see references/design-tokens.md.
 *
 * @param obj - the section's `colorOverrides` value
 * @returns array of human-readable error strings (empty if valid)
 */
export function validateColorOverrides(obj: unknown): string[] {
  const errors: string[] = [];
  const allowed = new Set<string>(SECTION_COLOR_OVERRIDE_KEYS);

  if (obj === null || obj === undefined) return errors;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return ['colorOverrides must be a plain object'];
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (!allowed.has(key)) {
      errors.push(
        `Unknown key: ${key}. Allowed: ${SECTION_COLOR_OVERRIDE_KEYS.join(', ')}`
      );
      continue;
    }
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value !== 'string') {
      errors.push(`${key}: must be string, got ${typeof value}`);
      continue;
    }
    const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
    if (!isHex && !validateHsl(value)) {
      errors.push(
        `${key}: "${value}" is not a valid raw-HSL or #RRGGBB value`
      );
    }
  }

  return errors;
}

/**
 * Validate a `logoPlacement` object against the editor's BrandTab ranges.
 * Returns a list of issue strings — empty array means valid.
 *
 * Source of truth: nextjs_space/app/tenant-admin/branding/types.ts::LogoPlacement
 * and brand-tab.tsx slider min/max values.
 *
 * Numeric ranges:
 *   navSize    24–120 px
 *   heroX      0–100  %
 *   heroY      0–100  %
 *   heroSize   24–400 px
 *
 * Enum values:
 *   navPosition    "left" | "center" | "right"
 *   heroStyle      "plain" | "circular" | "badge"
 *
 * @param obj - the `logoPlacement` value
 * @returns array of human-readable error strings (empty if valid)
 */
export function validateLogoPlacement(obj: unknown): string[] {
  const errors: string[] = [];

  if (obj === null || obj === undefined) return errors;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return ['logoPlacement must be a plain object'];
  }

  const lp = obj as Record<string, unknown>;
  const validNavPositions = ['left', 'center', 'right'];
  const validHeroStyles = ['plain', 'circular', 'badge'];

  if (lp.navPosition !== undefined && !validNavPositions.includes(lp.navPosition as string)) {
    errors.push(
      `navPosition: "${lp.navPosition}" must be one of ${validNavPositions.join(', ')}`
    );
  }
  if (lp.heroStyle !== undefined && !validHeroStyles.includes(lp.heroStyle as string)) {
    errors.push(
      `heroStyle: "${lp.heroStyle}" must be one of ${validHeroStyles.join(', ')}`
    );
  }

  const numericRanges: Array<[string, number, number]> = [
    ['navSize', 24, 120],
    ['heroX', 0, 100],
    ['heroY', 0, 100],
    ['heroSize', 24, 400]
  ];
  for (const [key, min, max] of numericRanges) {
    if (lp[key] === undefined) continue;
    const value = lp[key];
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`${key}: must be number, got ${typeof value}`);
      continue;
    }
    if (value < min || value > max) {
      errors.push(`${key}: ${value} out of range (${min}–${max})`);
    }
  }

  const booleanKeys = ['showBusinessName', 'heroShowLogo', 'footerShowLogo'];
  for (const key of booleanKeys) {
    if (lp[key] !== undefined && typeof lp[key] !== 'boolean') {
      errors.push(`${key}: must be boolean, got ${typeof lp[key]}`);
    }
  }

  return errors;
}
