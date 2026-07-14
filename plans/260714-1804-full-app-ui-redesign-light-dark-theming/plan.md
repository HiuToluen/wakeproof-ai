# Full App UI Redesign — Light + Dark Theming (WakeProof AI)

**Created:** 2026-07-14 | **Branch:** main | **Stack:** React Native + Expo SDK 54

## Goal
Làm lại toàn bộ giao diện app báo thức WakeProof AI: nâng cấp design system, thêm dark mode + light mode (auto theo hệ thống + chỉnh tay trong Settings), thay icon chữ tab bar bằng icon vector, tinh chỉnh mọi màn hình (~20 screens, 7 components, 4 navigators) theo chuẩn UI/UX Pro Max (accessibility, touch targets, dark-mode contrast).

## Design Decisions (đã chốt với user)
- **Theme mode**: System default + manual override (`Light | Dark | System`) lưu trong AsyncStorage, chỉnh trong Settings.
- **Accent/palette**: Palette mới do agent đề xuất (xem phase-01). Giữ tinh thần tím-indigo nhưng bão hòa hơn/hiện đại hơn + neutral base riêng cho light/dark.
- **Icons**: `@expo/vector-icons` (Ionicons) thay icon chữ A/S/P/G.

## Key Constraints & Findings
- **node_modules CHƯA cài** (chỉ có package-lock.json) → phải `npm install` trước khi build/test.
- **31/73 file dùng chung theme, 0 hardcode hex** ngoài `theme/colors.js` → refactor sạch, đòn bẩy lớn.
- App hiện import theme **tĩnh** → cần chuyển sang hook `useTheme()` + StyleSheet factory để đổi màu runtime.
- `@expo/vector-icons` được Expo bundle sẵn → cài bằng `npx expo install`.
- Đọc docs Expo SDK 54 chính xác tại https://docs.expo.dev/versions/v54.0.0/ trước khi code (theo AGENTS.md).

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 01 | Theme foundation: palette light/dark + tokens + ThemeContext/useTheme | ✅ Done | [phase-01-theme-foundation.md](phase-01-theme-foundation.md) |
| 02 | Core primitives: ScreenContainer, buttons, StatusBar, navigators, tab icons | ✅ Done | [phase-02-core-primitives-navigation.md](phase-02-core-primitives-navigation.md) |
| 03 | Refactor 20 screens + feature components → useTheme (light+dark parity) | ✅ Done | [phase-03-screens-components-refactor.md](phase-03-screens-components-refactor.md) |
| 04 | Settings theme toggle UI + polish + a11y/contrast + smoke test both modes | ✅ Done (toggle + cleanup + Metro bundle verified; device smoke test = user) | [phase-04-settings-toggle-polish-test.md](phase-04-settings-toggle-polish-test.md) |

## Build Verification
- `npm install` ✅ · `npx expo install @expo/vector-icons` ✅ (v15.1.1)
- Metro bundle: `npx expo export --platform android` → exit 0, **1210/1210 modules**, Ionicons.ttf packaged ✅
- 0 static `colors` imports remain; `src/theme/colors.js` deleted.
- Remaining device-only step (user): visual smoke test both modes on a dev build.

## Dependencies
- Phase 01 → gates everything (theme API contract).
- Phase 02 depends on 01 (uses useTheme).
- Phase 03 depends on 01+02 (primitives + pattern established).
- Phase 04 depends on 03 (all screens done).
- `npm install` + `npx expo install @expo/vector-icons @react-native-async-storage/async-storage` at start of Phase 01 (async-storage already in package.json — verify).

## Success Criteria
- App chạy được ở cả light + dark, tự đổi theo OS, chỉnh tay được trong Settings, lựa chọn được lưu lại.
- Không còn icon chữ; tab bar dùng icon vector, active/inactive rõ ràng.
- Mọi text đạt tương phản WCAG AA (≥4.5:1 body) ở cả 2 mode.
- Không hardcode hex trong component (chỉ trong palette files).
- Không lỗi compile; `npx expo start` bundle thành công.

## Out of Scope
- Không đổi business logic (alarm scheduling, credits, challenge verification).
- Không đổi navigation flow/cấu trúc điều hướng.
- Không thêm animation library mới (chỉ dùng Animated/LayoutAnimation của RN nếu cần nhẹ).

## Unresolved Questions
- (none — tất cả đã chốt qua AskUserQuestion)
