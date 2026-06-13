# 이어서 seed-design (ieoseo/seed-design)

이어서(ieoseo)의 **공유 디자인 프리미티브** — 디자인 토큰·아이콘을 **한 곳(소스)** 에서 정의하고 Flutter 앱(Dart)·웹(CSS/TS)으로 **자동 생성**한다. 앱과 웹이 색·간격·아이콘을 따로 정의하던 중복을 없앤다.

> 멀티레포(`ieoseo` org)의 5번째 축: `client`(Flutter) · `server`(Spring Boot) · `docs` · `landing`(Next.js) · **`seed-design`**.

## 무엇을 공유하나

| 종류 | 공유 | 비고 |
|------|------|------|
| **토큰**(색·라운드·타이포·모션·hue·그림자) | ✅ | `tokens/tokens.json` → CSS·Dart |
| **아이콘**(Lucide 24-grid path + 브랜드/프로바이더 SVG) | ✅ | `icons/` → Dart 맵·웹 path 맵·SVG |
| **컴포넌트**(버튼·카드 등) | ❌ | Flutter 위젯 ≠ React. 각 플랫폼이 위 프리미티브를 **소비**해 따로 구현 |

진실의 출처는 Flutter `client` 의 `DkTokens`/`kDkIcons` 와 `docs/01-디자인분석/디자인시스템-토큰.md`. 그 값을 이 repo 가 중립 포맷으로 보유하고 양쪽으로 생성한다.

## 구조

```text
seed-design/
├── tokens/tokens.json        # 토큰 단일 소스 (색=#RRGGBB[AA], light/dark)
├── icons/
│   ├── lucide.json           # name → SVG path d (24-grid stroke)
│   ├── brand/ieoseo.svg
│   └── provider/apple.svg · google-play.svg
├── scripts/build.mjs         # 생성기 (무의존 Node)
└── dist/                     # 생성 산출물 (커밋함 — 소비처가 그대로 사용)
    ├── css/tokens.css        # CSS custom properties (:root + [data-theme=dark])
    ├── dart/seed_tokens.dart # SeedScheme(light/dark)·SeedHue·SeedSource·SeedRadius/Type
    ├── dart/seed_icons.dart  # kSeedIcons 맵 (flutter_svg)
    ├── web/icons.ts          # seedIcons path 맵
    └── svg/{brand,provider}/ # 원본 SVG
```

## 빌드

```bash
npm run build     # tokens/icons 소스 → dist/ 재생성
npm run check     # 빌드 후 dist 가 소스와 일치하는지 검증(CI 와 동일)
```

소스(`tokens/`·`icons/`)를 바꾸면 **반드시 `npm run build` 후 `dist/` 를 함께 커밋**한다(CI 가 일치를 강제).

## 소비처에서 쓰기 (계획)

- **landing**(웹): `dist/css/tokens.css` 를 `src/styles/tokens.css` 로 동기화, `dist/web/icons.ts` 로 아이콘.
- **client**(Flutter): `dist/dart/seed_tokens.dart` 를 `DkTokens` 기본값 출처로, `dist/dart/seed_icons.dart` 를 `kDkIcons` 로.

> v0.1 은 소스+생성기까지. 각 repo 연동은 후속 PR(아래 워크플로우)로 진행한다.

## 색 파생 규칙

`tokens.json` 은 `brand.primary` 만 두고, `primaryHover`/`primarySubtle` 은 생성기가 Flutter `Color.lerp`(= `DkTokens._mix`)를 그대로 미러해 파생한다 — 앱/웹 값이 정확히 일치한다.

## 워크플로우

- **v0.1 까지**: `main` 직접 푸시(초기 구축).
- **v0.1 이후**: 이슈 생성 → 브랜치 → PR → 머지 → `docs` 갱신 (`client`/`server`/`landing` 과 동일한 GitHub Flow). 커밋은 한국어 Conventional Commits.

결정 근거: `docs/04-ADR` 의 seed-design 채택 ADR.
