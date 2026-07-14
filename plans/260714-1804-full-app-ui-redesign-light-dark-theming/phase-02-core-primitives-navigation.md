# Phase 02 — Core Primitives + Navigation Theming

**Priority:** HIGH | **Status:** ⬜ Pending | **Depends:** Phase 01

## Overview
Chuyển các primitive dùng chung + navigation + StatusBar sang `useTheme()`. Đây là nhóm "đòn bẩy": làm xong thì khung app đã đổi màu đồng bộ trước khi đụng từng screen.

## Key Insights
- `ScreenContainer` là file ảnh hưởng lớn nhất — mọi screen bọc nó.
- `App.js` là consumer nhưng Provider bọc ngoài → tách 1 inner component (`AppContent`) gọi `useTheme()` để set StatusBar style + màu loading screen.
- Tab bar: thay `TabIcon` chữ bằng Ionicons; set `tabBarStyle` (background, borderTop), active/inactive tint từ theme.
- React Navigation có `DefaultTheme`/`DarkTheme` cho `NavigationContainer` → set `theme` prop theo resolvedScheme để nền stack + header đúng màu.

## Requirements
- `ScreenContainer`, `PrimaryButton`, `SecondaryButton` dùng useTheme (StyleSheet tạo trong render qua `useMemo(() => makeStyles(theme), [theme])`).
- `StatusBar style` = resolvedScheme==='dark' ? 'light' : 'dark'.
- Tab bar icon vector, có nhãn, active state rõ (màu + đậm), đạt touch target.
- `NavigationContainer` nhận theme phù hợp (nền không chớp trắng khi chuyển screen ở dark mode).

## Icon mapping (Ionicons)
```
Alarms   → 'alarm' / 'alarm-outline'
Sleep    → 'moon' / 'moon-outline'
Progress → 'stats-chart' / 'stats-chart-outline'
Settings → 'settings' / 'settings-outline'
```
(focused = filled, unfocused = outline)

## Related Code Files
**Modify:**
- `src/components/common/ScreenContainer.js` — useTheme, bg động; thêm optional `edges`/`padded` prop nếu cần (KISS: giữ API cũ).
- `src/components/common/PrimaryButton.js`, `SecondaryButton.js` — useTheme, radius token, press feedback (opacity/scale nhẹ), disabled semantics.
- `src/navigation/MainTabNavigator.js` — Ionicons, tabBarStyle theo theme, bỏ TAB_ICONS chữ.
- `src/navigation/RootNavigator.js` — loading ActivityIndicator + bg dùng theme; truyền theme cho NavigationContainer nếu đặt ở đây (hiện NavigationContainer ở App.js → set theme ở App.js).
- `src/navigation/MainStackNavigator.js` — `contentStyle.backgroundColor` động; header style nếu có.
- `src/navigation/AuthNavigator.js`, `ActiveAlarmNavigator.js` — contentStyle/header động nếu có set màu.
- `App.js` — tách `AppContent` inner để useTheme (StatusBar + loading colors + NavigationContainer theme). Provider bọc ngoài.

## Implementation Steps
1. Viết helper `makeStyles`/pattern chuẩn (mẫu để phase 03 copy): component gọi `const theme = useTheme(); const styles = useMemo(() => createStyles(theme), [theme]);`.
2. ScreenContainer → useTheme.
3. PrimaryButton/SecondaryButton → useTheme + radius + press feedback.
4. App.js: tạo `AppContent` (chứa toàn bộ logic hiện tại của App), App chỉ render `<ThemeProvider><SafeAreaProvider><AppContent/></SafeAreaProvider></ThemeProvider>`. Trong AppContent: `const { resolvedScheme, colors } = useTheme()` → StatusBar style động, NavigationContainer `theme={navTheme}`.
5. MainTabNavigator: import `Ionicons`, map icon, tabBarStyle động, active/inactive tint.
6. Stack/Auth/ActiveAlarm navigators: contentStyle bg động.
7. Bundle check + mở app thử chuyển tab, đổi OS scheme.

## Todo
- [ ] Pattern makeStyles chuẩn hóa
- [ ] ScreenContainer useTheme
- [ ] Primary/Secondary buttons useTheme + press feedback
- [ ] App.js tách AppContent + StatusBar động + NavigationContainer theme
- [ ] MainTabNavigator Ionicons + tabBarStyle
- [ ] Stack/Auth/ActiveAlarm navigators bg động
- [ ] Bundle OK, thử 2 mode

## Success Criteria
- Chuyển tab, chuyển screen không chớp nền sai màu ở dark.
- Tab bar icon vector, active/inactive phân biệt rõ.
- StatusBar đổi light/dark đúng theo mode.
- Nút có phản hồi khi nhấn (≤150ms), touch target ≥44pt.

## Risk & Mitigation
- **App.js phức tạp (nhiều effect)**: chỉ *di chuyển* logic vào AppContent, KHÔNG sửa logic → giảm rủi ro regression. Diff cẩn thận.
- **NavigationContainer theme fonts**: React Navigation theme cần `fonts` (v7) → dùng spread từ DefaultTheme/DarkTheme rồi override colors.

## Security
- Không liên quan.

## Next
→ Phase 03 (screens + feature components).
