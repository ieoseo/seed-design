#!/usr/bin/env node
// seed-design 생성기 — tokens/icons 단일 소스 → dist/{css,dart,web,svg}
// 무의존(순수 Node). 실행: `npm run build`.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const readJson = (p) => JSON.parse(read(p));

// ── 색 헬퍼 ────────────────────────────────────────────────
// #RGB / #RRGGBB / #RRGGBBAA(alpha last) → {r,g,b,a(0..1)}
function parseHex(hex) {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}
const round2 = (n) => Math.round(n * 100) / 100;
function toCss({ r, g, b, a }) {
  if (a >= 1) {
    return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  return `rgba(${r}, ${g}, ${b}, ${round2(a)})`;
}
function toDart({ r, g, b, a }) {
  const A = Math.round(a * 255);
  const argb = ((A << 24) >>> 0) | (r << 16) | (g << 8) | b;
  return `Color(0x${(argb >>> 0).toString(16).toUpperCase().padStart(8, "0")})`;
}
// Flutter Color.lerp(a,b,t) 미러(채널 선형). _mix(a,b,pct)=lerp(a,b,1-pct/100).
function mix(aHex, bHex, pct) {
  const a = parseHex(aHex), b = parseHex(bHex), t = 1 - pct / 100;
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
    a: a.a + (b.a - a.a) * t,
  };
}
const camelToKebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

// ── 소스 로드 ──────────────────────────────────────────────
const T = readJson("tokens/tokens.json");
const ICONS = readJson("icons/lucide.json").icons;

const BLACK = "#000000", WHITE = "#FFFFFF";
const primary = T.brand.primary;
const derived = {
  light: {
    primary,
    primaryHover: mix(primary, BLACK, 88),
    primarySubtle: mix(primary, WHITE, 11),
  },
  dark: {
    primary,
    primaryHover: mix(primary, BLACK, 88),
    primarySubtle: mix(primary, T.color.dark.bg, 26),
  },
};
const scheme = (mode) => {
  const base = {};
  for (const [k, v] of Object.entries(T.color[mode])) base[k] = parseHex(v);
  for (const [k, v] of Object.entries(derived[mode]))
    base[k] = typeof v === "string" ? parseHex(v) : v;
  return base;
};
const SCHEME = { light: scheme("light"), dark: scheme("dark") };
const SCHEME_KEYS = Object.keys(SCHEME.light);

// ── 1) CSS ────────────────────────────────────────────────
function buildCss() {
  const v = [];
  v.push(`  --primary: ${toCss(SCHEME.light.primary)};`);
  v.push(`  --primary-hover: ${toCss(SCHEME.light.primaryHover)};`);
  v.push(`  --primary-subtle: ${toCss(SCHEME.light.primarySubtle)};`);
  v.push(`  --radius: ${T.radius.base}px;`);
  v.push(`  --radius-lg: ${T.radius.lg}px;`);
  v.push(`  --radius-chip: ${T.radius.chip}px;`);
  v.push(`  --radius-button: ${T.radius.button}px;`);
  v.push(`  --font-sans: "${T.type.sans}";`);
  v.push(`  --font-brand: "${T.type.brand}";`);
  v.push(`  --base-size: ${T.type.baseSize}px;`);
  v.push(`  --ease-production: ${T.motion.easing.production};`);
  v.push(`  --ease-spring: ${T.motion.easing.spring};`);
  for (const [k, val] of Object.entries(T.motion.duration)) v.push(`  --duration-${k}: ${val};`);
  for (const [name, h] of Object.entries(T.hue)) {
    v.push(`  --hue-${name}: ${toCss(parseHex(h.color))};`);
    v.push(`  --hue-${name}-subtle: ${toCss(parseHex(h.subtle))};`);
  }
  for (const [name, c] of Object.entries(T.source)) v.push(`  --source-${name}: ${toCss(parseHex(c))};`);
  for (const k of SCHEME_KEYS) {
    if (k.startsWith("primary")) continue;
    v.push(`  --${camelToKebab(k)}: ${toCss(SCHEME.light[k])};`);
  }
  for (const [k, val] of Object.entries(T.shadow.light)) v.push(`  --shadow-${k}: ${val};`);

  const d = [];
  d.push(`  --primary-subtle: ${toCss(SCHEME.dark.primarySubtle)};`);
  for (const k of SCHEME_KEYS) {
    if (k.startsWith("primary")) continue;
    d.push(`  --${camelToKebab(k)}: ${toCss(SCHEME.dark[k])};`);
  }
  for (const [k, val] of Object.entries(T.shadow.dark)) d.push(`  --shadow-${k}: ${val};`);

  return [
    "/* GENERATED — do not edit. Source: tokens/tokens.json (run `npm run build`). */",
    ":root {",
    v.join("\n"),
    "}",
    "",
    '[data-theme="dark"],',
    ".dark {",
    d.join("\n"),
    "}",
    "",
  ].join("\n");
}

// ── 2) Dart ───────────────────────────────────────────────
function buildDart() {
  const fields = SCHEME_KEYS.map((k) => `  final Color ${k};`).join("\n");
  const ctor = SCHEME_KEYS.map((k) => `    required this.${k},`).join("\n");
  const inst = (mode) =>
    SCHEME_KEYS.map((k) => `    ${k}: ${toDart(SCHEME[mode][k])},`).join("\n");
  const hue = Object.entries(T.hue)
    .map(([n, h]) => `  static const SeedHue ${n} = SeedHue(${toDart(parseHex(h.color))}, ${toDart(parseHex(h.subtle))});`)
    .join("\n");
  const source = Object.entries(T.source)
    .map(([n, c]) => `  static const Color ${n} = ${toDart(parseHex(c))};`)
    .join("\n");
  return `// GENERATED — do not edit. Source: tokens/tokens.json (run \`npm run build\`).
import 'package:flutter/widgets.dart';

/// 라이트/다크 시맨틱 컬러 스킴(단일 소스). client \`DkTokens\` 의 기본값 출처.
@immutable
class SeedScheme {
  const SeedScheme({
${ctor}
  });

${fields}

  static const SeedScheme light = SeedScheme(
${inst("light")}
  );

  static const SeedScheme dark = SeedScheme(
${inst("dark")}
  );
}

/// 카테고리/출처 hue.
@immutable
class SeedHue {
  const SeedHue(this.color, this.subtle);
  final Color color;
  final Color subtle;

${hue}
}

/// 외부 출처 색(캘린더 소스 등).
abstract final class SeedSource {
${source}
}

abstract final class SeedRadius {
  static const double base = ${T.radius.base};
  static const double lg = ${T.radius.lg};
  static const double chip = ${T.radius.chip};
  static const double button = ${T.radius.button};
}

abstract final class SeedType {
  static const String sans = '${T.type.sans}';
  static const String brand = '${T.type.brand}';
  static const double baseSize = ${T.type.baseSize};
}
`;
}

// ── 3) 아이콘 (Dart + Web) ────────────────────────────────
function buildIconsDart() {
  const entries = Object.entries(ICONS)
    .map(([n, d]) => `  '${n}': '${d}',`)
    .join("\n");
  return `// GENERATED — do not edit. Source: icons/lucide.json (run \`npm run build\`).
/// Lucide 스타일 24-grid 아이콘 path 맵. flutter_svg 로 렌더.
const Map<String, String> kSeedIcons = <String, String>{
${entries}
};
`;
}
function buildIconsTs() {
  const entries = Object.entries(ICONS)
    .map(([n, d]) => `  ${JSON.stringify(n)}: ${JSON.stringify(d)},`)
    .join("\n");
  return `// GENERATED — do not edit. Source: icons/lucide.json (run \`npm run build\`).
// Lucide 스타일 24-grid 아이콘 path 맵 (서브패스는 ' M' 으로 이어짐).
export const seedIcons: Record<string, string> = {
${entries}
};

export type SeedIconName = keyof typeof seedIcons;
`;
}

// ── SVG 복사 ──────────────────────────────────────────────
function copySvgs(srcDir, outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(join(ROOT, srcDir))) {
    if (f.endsWith(".svg")) copyFileSync(join(ROOT, srcDir, f), join(outDir, basename(f)));
  }
}

// ── 실행 ──────────────────────────────────────────────────
rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "css"), { recursive: true });
mkdirSync(join(DIST, "dart"), { recursive: true });
mkdirSync(join(DIST, "web"), { recursive: true });

writeFileSync(join(DIST, "css", "tokens.css"), buildCss());
writeFileSync(join(DIST, "dart", "seed_tokens.dart"), buildDart());
writeFileSync(join(DIST, "dart", "seed_icons.dart"), buildIconsDart());
writeFileSync(join(DIST, "web", "icons.ts"), buildIconsTs());
copySvgs("icons/brand", join(DIST, "svg", "brand"));
copySvgs("icons/provider", join(DIST, "svg", "provider"));

console.log("seed-design built → dist/ (css·dart·web·svg)");
console.log(`  tokens: ${SCHEME_KEYS.length} colors × light/dark, ${Object.keys(T.hue).length} hue`);
console.log(`  icons:  ${Object.keys(ICONS).length} lucide + brand/provider svg`);
