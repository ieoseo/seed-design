# seed-design — 이어서 공유 디자인 프리미티브 (Claude 작업 가이드)

이어서(ieoseo)의 **디자인 토큰·아이콘 단일 소스**. 한 곳에서 정의 → Flutter(Dart)·웹(CSS/TS) 자동 생성. `ieoseo` 멀티레포(client/server/docs/landing/seed-design)의 한 축이며 독립 git 저장소다.

## 핵심 규칙 (반드시 지킨다)

- **`dist/` 는 생성물 — 직접 수정 금지.** 소스(`tokens/tokens.json`, `icons/*`)만 고치고 **`npm run build`** 로 재생성한다.
- 소스를 바꾸면 **같은 커밋에 `dist/` 를 함께** 넣는다. CI(`ci.yml`)가 `dist` 일치를 강제한다.
- 생성기 `scripts/build.mjs` 는 **무의존(순수 Node)**. 의존성 추가는 신중히(ADR 고려).
- 공유하는 건 **토큰 + 아이콘(프리미티브)** 뿐. **컴포넌트는 공유하지 않는다**(Flutter 위젯 ≠ React) — 각 repo가 프리미티브를 소비해 따로 구현.

## 명령어

```bash
npm run build    # 소스 → dist/ (css·dart·web·svg)
npm run check    # 빌드 + dist 일치 검증
```

## 진실의 출처 / 충실도

- 토큰 값의 권위는 client `DkTokens`(`client/lib/theme/tokens.dart`)와 `docs/01-디자인분석/디자인시스템-토큰.md`. 이 repo 는 그 값을 중립 JSON 으로 보유한다.
- 색: `#RRGGBB` 또는 `#RRGGBBAA`(alpha last). 생성기가 CSS(rgba/hex)·Dart(`Color(0xAARRGGBB)`)로 변환.
- `primaryHover`/`primarySubtle` 은 `brand.primary` 에서 **Flutter `Color.lerp` 미러**로 파생(앱/웹 동일값). 직접 적지 않는다.

## 토큰/아이콘 추가하기

- 토큰: `tokens/tokens.json` 의 해당 그룹(`color.light`/`color.dark`/`hue`/`source`/`radius`/`type`/`motion`/`shadow`)에 키 추가 → `npm run build`.
- 아이콘(기능): `icons/lucide.json` 의 `icons` 에 `name: "path d"` 추가(24-grid, 서브패스는 ' M').
- 아이콘(브랜드/프로바이더): `icons/brand|provider/*.svg` 추가 → 생성기가 `dist/svg/` 로 복사 + 필요 시 path 맵 확장.

## 워크플로우

- **v0.1 까지**: `main` 직접 푸시.
- **v0.1 이후**: 이슈 → 브랜치(`<type>/<slug>`) → PR → squash 머지 → **`docs` 갱신**. 커밋은 한국어 Conventional Commits, 시큐리티 게이트(`git diff --cached`) 통과 후 커밋.
- **docs 동기화(MUST)**: 토큰/아이콘/구조를 바꾸면 `docs`(`01-디자인분석`·`02-아키텍처`·필요 시 ADR)를 같은 작업에서 갱신.

## 소비처 연동(후속)

- landing: `dist/css/tokens.css` → `landing/src/styles/tokens.css`, `dist/web/icons.ts` → 아이콘.
- client: `dist/dart/seed_tokens.dart`/`seed_icons.dart` → `DkTokens`/`kDkIcons` 출처.
