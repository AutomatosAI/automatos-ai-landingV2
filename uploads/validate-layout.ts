/**
 * BudStack Template Layout Validator
 *
 * Validates a generated layout.json against the round-trip contract:
 * - Section types exist in the registry (50 total)
 * - colorOverrides keys ⊆ 8-key whitelist
 * - navigationConfig + footerConfig + settings shapes
 * - logoPlacement ranges
 * - sectionPadding pattern
 * - Asset URLs are path-only
 *
 * Usage:
 *   ts-node scripts/validate-layout.ts <path-to-layout.json> [<path-to-defaults.json>]
 *   node --loader ts-node/esm scripts/validate-layout.ts <path-to-layout.json>
 *
 * Exits 0 on pass, 1 on any error. Warnings do not affect exit code.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Source-of-truth constants (mirror budstack-saas) ────────────────

const VALID_HERO_TYPES = [
  'HeroFullScreen', 'HeroSplit', 'HeroVideo', 'HeroMinimal',
  'HeroWarpShader', 'HeroMeshGradient', 'HeroAurora', 'HeroShaderGlass',
  'HeroDesignali', 'HeroSplitImages', 'HeroFuturistic',
  'HeroCollage', 'HeroFramed',
] as const;

const VALID_CONTENT_TYPES = [
  'ValueProps', 'ProductShowcase', 'Testimonials', 'About', 'Gallery',
  'Stats', 'FAQ', 'BlogFeed', 'Features', 'ImageShowcase', 'LogoMarquee',
  'BentoGrid', 'Pricing', 'TeamGrid', 'Timeline', 'ComparisonTable',
  'Parallax', 'SocialProof', 'TabsShowcase', 'VideoGallery', 'ProcessSteps',
  'StatsCounter', 'TextMarquee', 'FeaturesShowcase',
] as const;

const VALID_CTA_TYPES = ['CTABanner', 'CTAWithImage', 'CTASplit', 'Newsletter'] as const;

const VALID_NAV_TYPES = [
  'NavMinimal', 'NavFull', 'NavTransparent', 'NavDark',
  'NavHealingBuds', 'NavPill',
] as const;

const VALID_FOOTER_TYPES = ['FooterSimple', 'FooterFull', 'FooterBrand'] as const;

const VALID_SECTION_TYPES = new Set<string>([
  ...VALID_HERO_TYPES,
  ...VALID_CONTENT_TYPES,
  ...VALID_CTA_TYPES,
]);

const COLOR_OVERRIDE_KEYS = new Set<string>([
  'primary', 'secondary', 'accent', 'background',
  'surface', 'text', 'heading', 'border',
]);

const SECTION_ASSET_KEYS = new Set<string>([
  'imageUrl', 'imageUrl2', 'imageUrl3',
  'videoUrl', 'watermarkUrl', 'rightImageUrl',
  'backgroundImageUrl',
]);

const VALID_SOCIAL_PLATFORMS = new Set<string>([
  'instagram', 'facebook', 'twitter', 'linkedin',
  'youtube', 'tiktok', 'pinterest', 'discord',
  'telegram', 'whatsapp',
]);

// ─── Result types ────────────────────────────────────────────────────

interface ValidationIssue {
  level: 'error' | 'warning';
  path: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ─── Validators ──────────────────────────────────────────────────────

function isHexColor(value: unknown): boolean {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function isPathOnlyUrl(value: unknown): boolean {
  return typeof value === 'string' && !value.includes('?');
}

function isSectionPaddingPattern(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  // <rem>[/<rem>[/<rem>]] — accept rem, px, em
  return /^(\d+(\.\d+)?(rem|px|em))(\/(\d+(\.\d+)?(rem|px|em))){0,2}$/.test(value);
}

function validateColorOverrides(
  obj: unknown,
  basePath: string,
): ValidationIssue[] {
  if (obj === undefined || obj === null) return [];
  const issues: ValidationIssue[] = [];

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    issues.push({
      level: 'error',
      path: basePath,
      message: 'colorOverrides must be an object',
    });
    return issues;
  }

  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = `${basePath}.${key}`;
    if (!COLOR_OVERRIDE_KEYS.has(key)) {
      issues.push({
        level: 'error',
        path: fieldPath,
        message: `Unknown colorOverride key "${key}". Allowed: ${[...COLOR_OVERRIDE_KEYS].join(', ')}`,
      });
    }
    if (!isHexColor(value)) {
      issues.push({
        level: 'error',
        path: fieldPath,
        message: `colorOverride value must be a 7-char hex like "#0F4C2E", got: ${JSON.stringify(value)}`,
      });
    }
  }

  return issues;
}

function validateLogoPlacement(
  obj: unknown,
  basePath: string,
): ValidationIssue[] {
  if (obj === undefined || obj === null) return [];
  const issues: ValidationIssue[] = [];

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    issues.push({
      level: 'error',
      path: basePath,
      message: 'logoPlacement must be an object',
    });
    return issues;
  }

  const lp = obj as Record<string, unknown>;

  // navPosition
  if (lp.navPosition !== undefined && !['left', 'center', 'right'].includes(lp.navPosition as string)) {
    issues.push({
      level: 'error',
      path: `${basePath}.navPosition`,
      message: `Must be "left" | "center" | "right", got: ${JSON.stringify(lp.navPosition)}`,
    });
  }

  // navSize
  if (lp.navSize !== undefined) {
    const v = typeof lp.navSize === 'number' ? lp.navSize : NaN;
    if (typeof lp.navSize !== 'number' && !['small', 'medium', 'large'].includes(lp.navSize as string)) {
      issues.push({
        level: 'error',
        path: `${basePath}.navSize`,
        message: `Must be a number 24–120, got: ${JSON.stringify(lp.navSize)}`,
      });
    } else if (typeof lp.navSize === 'number' && (v < 24 || v > 120)) {
      issues.push({
        level: 'error',
        path: `${basePath}.navSize`,
        message: `navSize ${v} out of range 24–120`,
      });
    }
  }

  // showBusinessName
  if (lp.showBusinessName !== undefined && typeof lp.showBusinessName !== 'boolean') {
    issues.push({
      level: 'error',
      path: `${basePath}.showBusinessName`,
      message: `Must be boolean, got: ${typeof lp.showBusinessName}`,
    });
  }

  // heroShowLogo
  if (lp.heroShowLogo !== undefined && typeof lp.heroShowLogo !== 'boolean') {
    issues.push({
      level: 'error',
      path: `${basePath}.heroShowLogo`,
      message: `Must be boolean, got: ${typeof lp.heroShowLogo}`,
    });
  }

  // heroX, heroY
  for (const axis of ['heroX', 'heroY'] as const) {
    if (lp[axis] !== undefined) {
      const v = lp[axis];
      if (typeof v !== 'number' || v < 0 || v > 100) {
        issues.push({
          level: 'error',
          path: `${basePath}.${axis}`,
          message: `Must be a number 0–100, got: ${JSON.stringify(v)}`,
        });
      }
    }
  }

  // heroSize
  if (lp.heroSize !== undefined) {
    const v = typeof lp.heroSize === 'number' ? lp.heroSize : NaN;
    if (typeof lp.heroSize !== 'number' && !['small', 'medium', 'large', 'watermark'].includes(lp.heroSize as string)) {
      issues.push({
        level: 'error',
        path: `${basePath}.heroSize`,
        message: `Must be a number 24–400, got: ${JSON.stringify(lp.heroSize)}`,
      });
    } else if (typeof lp.heroSize === 'number' && (v < 24 || v > 400)) {
      issues.push({
        level: 'error',
        path: `${basePath}.heroSize`,
        message: `heroSize ${v} out of range 24–400`,
      });
    }
  }

  // heroStyle
  if (lp.heroStyle !== undefined && !['plain', 'circular', 'badge'].includes(lp.heroStyle as string)) {
    issues.push({
      level: 'error',
      path: `${basePath}.heroStyle`,
      message: `Must be "plain" | "circular" | "badge", got: ${JSON.stringify(lp.heroStyle)}`,
    });
  }

  // footerShowLogo
  if (lp.footerShowLogo !== undefined && typeof lp.footerShowLogo !== 'boolean') {
    issues.push({
      level: 'error',
      path: `${basePath}.footerShowLogo`,
      message: `Must be boolean, got: ${typeof lp.footerShowLogo}`,
    });
  }

  return issues;
}

function validateNavigationConfig(
  obj: unknown,
  basePath: string,
): ValidationIssue[] {
  if (obj === undefined || obj === null) return [];
  const issues: ValidationIssue[] = [];

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    issues.push({
      level: 'error',
      path: basePath,
      message: 'navigationConfig must be an object',
    });
    return issues;
  }

  const nc = obj as Record<string, unknown>;

  if (!Array.isArray(nc.links)) {
    issues.push({
      level: 'error',
      path: `${basePath}.links`,
      message: 'navigationConfig.links must be an array',
    });
  } else {
    nc.links.forEach((link: unknown, i: number) => {
      if (typeof link !== 'object' || link === null) {
        issues.push({
          level: 'error',
          path: `${basePath}.links[${i}]`,
          message: 'Each link must be an object with label + href',
        });
        return;
      }
      const l = link as Record<string, unknown>;
      if (typeof l.label !== 'string') {
        issues.push({ level: 'error', path: `${basePath}.links[${i}].label`, message: 'label must be string' });
      }
      if (typeof l.href !== 'string') {
        issues.push({ level: 'error', path: `${basePath}.links[${i}].href`, message: 'href must be string' });
      }
    });
  }

  if (nc.cta !== undefined) {
    if (typeof nc.cta !== 'object' || nc.cta === null) {
      issues.push({ level: 'error', path: `${basePath}.cta`, message: 'cta must be { label, href }' });
    } else {
      const cta = nc.cta as Record<string, unknown>;
      if (typeof cta.label !== 'string') issues.push({ level: 'error', path: `${basePath}.cta.label`, message: 'must be string' });
      if (typeof cta.href !== 'string') issues.push({ level: 'error', path: `${basePath}.cta.href`, message: 'must be string' });
    }
  } else {
    issues.push({ level: 'warning', path: `${basePath}.cta`, message: 'navigationConfig.cta missing — recommend a primary CTA' });
  }

  if (nc.showCart !== undefined && typeof nc.showCart !== 'boolean') {
    issues.push({ level: 'error', path: `${basePath}.showCart`, message: 'must be boolean' });
  }

  return issues;
}

function validateFooterConfig(
  obj: unknown,
  basePath: string,
): ValidationIssue[] {
  if (obj === undefined || obj === null) return [];
  const issues: ValidationIssue[] = [];

  if (typeof obj !== 'object' || Array.isArray(obj)) {
    issues.push({ level: 'error', path: basePath, message: 'footerConfig must be an object' });
    return issues;
  }

  const fc = obj as Record<string, unknown>;

  for (const required of ['tagline', 'disclaimer', 'address', 'email'] as const) {
    if (typeof fc[required] !== 'string') {
      issues.push({
        level: 'error',
        path: `${basePath}.${required}`,
        message: `must be a string`,
      });
    }
  }

  if (!Array.isArray(fc.sections)) {
    issues.push({ level: 'error', path: `${basePath}.sections`, message: 'must be an array' });
  } else {
    fc.sections.forEach((sec: unknown, i: number) => {
      if (typeof sec !== 'object' || sec === null) {
        issues.push({ level: 'error', path: `${basePath}.sections[${i}]`, message: 'must be { title, links }' });
        return;
      }
      const s = sec as Record<string, unknown>;
      if (typeof s.title !== 'string') {
        issues.push({ level: 'error', path: `${basePath}.sections[${i}].title`, message: 'must be string' });
      }
      if (!Array.isArray(s.links)) {
        issues.push({ level: 'error', path: `${basePath}.sections[${i}].links`, message: 'must be an array' });
      }
    });
  }

  if (!Array.isArray(fc.socialLinks)) {
    issues.push({ level: 'error', path: `${basePath}.socialLinks`, message: 'must be an array' });
  } else {
    fc.socialLinks.forEach((sl: unknown, i: number) => {
      if (typeof sl !== 'object' || sl === null) {
        issues.push({ level: 'error', path: `${basePath}.socialLinks[${i}]`, message: 'must be { platform, url }' });
        return;
      }
      const s = sl as Record<string, unknown>;
      if (typeof s.platform !== 'string' || !VALID_SOCIAL_PLATFORMS.has(s.platform)) {
        issues.push({
          level: 'error',
          path: `${basePath}.socialLinks[${i}].platform`,
          message: `must be one of: ${[...VALID_SOCIAL_PLATFORMS].join(', ')}`,
        });
      }
      if (typeof s.url !== 'string') {
        issues.push({ level: 'error', path: `${basePath}.socialLinks[${i}].url`, message: 'must be string' });
      }
    });
  }

  return issues;
}

function validateAssetUrls(config: unknown, sectionPath: string): ValidationIssue[] {
  if (typeof config !== 'object' || config === null) return [];
  const issues: ValidationIssue[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (SECTION_ASSET_KEYS.has(key) && value !== '' && value != null) {
      if (!isPathOnlyUrl(value)) {
        issues.push({
          level: 'error',
          path: `${sectionPath}.config.${key}`,
          message: `Asset URLs must be path-only (no query string), got: ${JSON.stringify(value)}`,
        });
      }
    }
  }

  return issues;
}

function validateLayout(layout: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (typeof layout !== 'object' || layout === null) {
    errors.push({ level: 'error', path: '$', message: 'layout must be an object' });
    return { valid: false, errors, warnings };
  }

  const l = layout as Record<string, unknown>;

  // version
  if (typeof l.version !== 'string' || !/^\d+(\.\d+){1,2}$/.test(l.version)) {
    warnings.push({
      level: 'warning',
      path: '$.version',
      message: `version should be a semver-like string ("1.0" or "1.0.0"), got: ${JSON.stringify(l.version)}`,
    });
  }

  // navigation
  if (typeof l.navigation !== 'string') {
    errors.push({ level: 'error', path: '$.navigation', message: 'must be a string (component type name)' });
  } else if (!VALID_NAV_TYPES.includes(l.navigation as typeof VALID_NAV_TYPES[number])) {
    errors.push({
      level: 'error',
      path: '$.navigation',
      message: `Unknown nav type "${l.navigation}". Valid: ${VALID_NAV_TYPES.join(', ')}`,
    });
  }

  // navigationConfig
  errors.push(...validateNavigationConfig(l.navigationConfig, '$.navigationConfig')
    .filter((i) => i.level === 'error'));
  warnings.push(...validateNavigationConfig(l.navigationConfig, '$.navigationConfig')
    .filter((i) => i.level === 'warning'));

  // footer
  if (typeof l.footer !== 'string') {
    errors.push({ level: 'error', path: '$.footer', message: 'must be a string (component type name)' });
  } else if (!VALID_FOOTER_TYPES.includes(l.footer as typeof VALID_FOOTER_TYPES[number])) {
    errors.push({
      level: 'error',
      path: '$.footer',
      message: `Unknown footer type "${l.footer}". Valid: ${VALID_FOOTER_TYPES.join(', ')}`,
    });
  }

  // footerConfig
  for (const issue of validateFooterConfig(l.footerConfig, '$.footerConfig')) {
    if (issue.level === 'error') errors.push(issue);
    else warnings.push(issue);
  }

  // sections
  if (!Array.isArray(l.sections)) {
    errors.push({ level: 'error', path: '$.sections', message: 'must be an array' });
  } else {
    const seenIds = new Set<string>();

    l.sections.forEach((section: unknown, i: number) => {
      const sectionPath = `$.sections[${i}]`;

      if (typeof section !== 'object' || section === null) {
        errors.push({ level: 'error', path: sectionPath, message: 'must be an object' });
        return;
      }

      const s = section as Record<string, unknown>;

      // type
      if (typeof s.type !== 'string') {
        errors.push({ level: 'error', path: `${sectionPath}.type`, message: 'must be a string' });
      } else if (!VALID_SECTION_TYPES.has(s.type)) {
        errors.push({
          level: 'error',
          path: `${sectionPath}.type`,
          message: `Unknown section type "${s.type}". Must be a hero / content / cta type from section-registry.ts.`,
        });
      }

      // id
      if (typeof s.id !== 'string') {
        errors.push({ level: 'error', path: `${sectionPath}.id`, message: 'must be a string' });
      } else if (seenIds.has(s.id)) {
        errors.push({ level: 'error', path: `${sectionPath}.id`, message: `duplicate id "${s.id}"` });
      } else {
        seenIds.add(s.id);
      }

      // visible
      if (s.visible !== undefined && typeof s.visible !== 'boolean') {
        errors.push({ level: 'error', path: `${sectionPath}.visible`, message: 'must be boolean' });
      }

      // colorOverrides
      for (const issue of validateColorOverrides(s.colorOverrides, `${sectionPath}.colorOverrides`)) {
        if (issue.level === 'error') errors.push(issue);
        else warnings.push(issue);
      }

      // asset URL paths inside config
      for (const issue of validateAssetUrls(s.config, sectionPath)) {
        if (issue.level === 'error') errors.push(issue);
        else warnings.push(issue);
      }
    });

    if (l.sections.length === 0) {
      warnings.push({ level: 'warning', path: '$.sections', message: 'sections array is empty' });
    }
  }

  // settings.sectionPadding
  if (l.settings && typeof l.settings === 'object') {
    const settings = l.settings as Record<string, unknown>;
    if (settings.sectionPadding !== undefined && !isSectionPaddingPattern(settings.sectionPadding)) {
      errors.push({
        level: 'error',
        path: '$.settings.sectionPadding',
        message: `Must match "<rem>" or "<rem>/<rem>" or "<rem>/<rem>/<rem>", got: ${JSON.stringify(settings.sectionPadding)}`,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function validateDefaults(defaults: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (typeof defaults !== 'object' || defaults === null) {
    errors.push({ level: 'error', path: '$', message: 'defaults must be an object' });
    return { valid: false, errors, warnings };
  }

  const d = defaults as Record<string, unknown>;

  // logoPlacement
  if (d.logoPlacement !== undefined) {
    for (const issue of validateLogoPlacement(d.logoPlacement, '$.logoPlacement')) {
      if (issue.level === 'error') errors.push(issue);
      else warnings.push(issue);
    }
  } else if (d.pageContent && typeof d.pageContent === 'object') {
    const pc = d.pageContent as Record<string, unknown>;
    if (pc.logoPlacement !== undefined) {
      for (const issue of validateLogoPlacement(pc.logoPlacement, '$.pageContent.logoPlacement')) {
        if (issue.level === 'error') errors.push(issue);
        else warnings.push(issue);
      }
    } else {
      warnings.push({ level: 'warning', path: '$.logoPlacement', message: 'logoPlacement missing — operators won\'t see logo controls' });
    }
  } else {
    warnings.push({ level: 'warning', path: '$.logoPlacement', message: 'logoPlacement missing — operators won\'t see logo controls' });
  }

  // global colours — accept either raw HSL ("178 48% 21%") OR hex ("#0E5C56").
  // The editor's TenantThemeProvider.formatColorValue auto-converts hex to channels at render.
  for (const colorKey of ['primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor', 'textColor', 'headingColor'] as const) {
    const value = d[colorKey];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      errors.push({
        level: 'error',
        path: `$.${colorKey}`,
        message: `must be string, got ${typeof value}`,
      });
      continue;
    }
    const isHex = isHexColor(value);
    const isHsl = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(value.trim());
    if (!isHex && !isHsl) {
      errors.push({
        level: 'error',
        path: `$.${colorKey}`,
        message: `must be raw HSL ("178 48% 21%") or 7-char hex ("#0E5C56"), got: ${JSON.stringify(value)}`,
      });
    }
  }

  // pageContent shape
  if (d.pageContent && typeof d.pageContent === 'object') {
    const pc = d.pageContent as Record<string, unknown>;

    if (!pc.home) warnings.push({ level: 'warning', path: '$.pageContent.home', message: 'pageContent.home missing' });
    if (!pc.about) warnings.push({ level: 'warning', path: '$.pageContent.about', message: 'pageContent.about missing' });
    if (!pc.contact) warnings.push({ level: 'warning', path: '$.pageContent.contact', message: 'pageContent.contact missing' });

    // contact + support mirror
    if (pc.contact && typeof pc.contact === 'object' && pc.support && typeof pc.support === 'object') {
      const c = pc.contact as Record<string, unknown>;
      const s = pc.support as Record<string, unknown>;
      if (c.email && s.contactEmail !== c.email) {
        warnings.push({
          level: 'warning',
          path: '$.pageContent.support.contactEmail',
          message: 'pageContent.support.contactEmail should mirror pageContent.contact.email — /contact route reads support.*',
        });
      }
      if (c.phone && s.contactPhone !== c.phone) {
        warnings.push({
          level: 'warning',
          path: '$.pageContent.support.contactPhone',
          message: 'pageContent.support.contactPhone should mirror pageContent.contact.phone',
        });
      }
    } else if (pc.contact) {
      warnings.push({
        level: 'warning',
        path: '$.pageContent.support',
        message: 'pageContent.support missing — /contact route reads support.contactEmail and support.contactPhone',
      });
    }
  } else {
    warnings.push({ level: 'warning', path: '$.pageContent', message: 'pageContent missing — operators can\'t edit page copy' });
  }

  // navColorOverrides + footerColorOverrides
  for (const issue of validateColorOverrides(d.navColorOverrides, '$.navColorOverrides')) {
    if (issue.level === 'error') errors.push(issue);
    else warnings.push(issue);
  }
  for (const issue of validateColorOverrides(d.footerColorOverrides, '$.footerColorOverrides')) {
    if (issue.level === 'error') errors.push(issue);
    else warnings.push(issue);
  }

  // sectionColorOverrides
  if (d.sectionColorOverrides && typeof d.sectionColorOverrides === 'object') {
    for (const [sectionId, overrides] of Object.entries(d.sectionColorOverrides)) {
      for (const issue of validateColorOverrides(overrides, `$.sectionColorOverrides.${sectionId}`)) {
        if (issue.level === 'error') errors.push(issue);
        else warnings.push(issue);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── CLI entry ───────────────────────────────────────────────────────

function readJson(filePath: string): unknown {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(2);
  }
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to parse JSON at ${abs}: ${msg}`);
    process.exit(2);
  }
}

function printIssues(label: string, issues: ValidationIssue[]): void {
  if (issues.length === 0) return;
  console.log(`\n${label}:`);
  for (const i of issues) {
    console.log(`  [${i.path}] ${i.message}`);
  }
}

function main(): void {
  const [, , layoutPath, defaultsPath] = process.argv;

  if (!layoutPath) {
    console.error('Usage: ts-node validate-layout.ts <layout.json> [<defaults.json>]');
    process.exit(2);
  }

  const layoutResult = validateLayout(readJson(layoutPath));
  let defaultsResult: ValidationResult | null = null;
  if (defaultsPath) {
    defaultsResult = validateDefaults(readJson(defaultsPath));
  }

  console.log(`\n=== layout.json validation: ${layoutPath} ===`);
  printIssues('Errors', layoutResult.errors);
  printIssues('Warnings', layoutResult.warnings);
  console.log(
    `\nResult: ${layoutResult.valid ? 'PASS' : 'FAIL'} — ${layoutResult.errors.length} errors, ${layoutResult.warnings.length} warnings`,
  );

  if (defaultsResult) {
    console.log(`\n=== defaults.json validation: ${defaultsPath} ===`);
    printIssues('Errors', defaultsResult.errors);
    printIssues('Warnings', defaultsResult.warnings);
    console.log(
      `\nResult: ${defaultsResult.valid ? 'PASS' : 'FAIL'} — ${defaultsResult.errors.length} errors, ${defaultsResult.warnings.length} warnings`,
    );
  }

  const allValid = layoutResult.valid && (defaultsResult ? defaultsResult.valid : true);
  process.exit(allValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

export {
  validateLayout,
  validateDefaults,
  validateColorOverrides,
  validateLogoPlacement,
  validateNavigationConfig,
  validateFooterConfig,
  isHexColor,
  isPathOnlyUrl,
  isSectionPaddingPattern,
  COLOR_OVERRIDE_KEYS,
  SECTION_ASSET_KEYS,
  VALID_SECTION_TYPES,
  VALID_NAV_TYPES,
  VALID_FOOTER_TYPES,
};
