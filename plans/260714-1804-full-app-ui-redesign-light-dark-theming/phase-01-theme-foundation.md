# Phase 01 — Theme Foundation (Palette + Tokens + ThemeContext)

**Priority:** CRITICAL (gates all) | **Status:** ⬜ Pending

## Overview
Xây nền tảng theme: 2 palette (light/dark) đồng bộ, mở rộng token (radius, shadow/elevation), và context/hook cho phép đổi màu runtime. Đây là hợp đồng API mà mọi phase sau phụ thuộc.

## Key Insights
- Hiện `colors.js` chỉ 12 token, không radius/shadow token → thêm để chuẩn hóa.
- Component hiện `import { colors }` tĩnh → không đổi được runtime. Giải pháp: `useTheme()` trả về palette hiện hành + StyleSheet tạo trong render (factory `makeStyles(theme)` hoặc inline).
- Mode chọn: `system | light | dark`, lưu AsyncStorage key `@wakeproof/theme-mode`. Palette thực tế = mode==='system' ? OS scheme : mode.

## Proposed Palette (agent đề xuất — theo skill: accent <80% sat, neutral base, dark = tonal không invert)

### Light
```
background     #F4F5FB   surface xanh-xám rất nhạt (dịu hơn #F7F8FA)
surface        #FFFFFF
surfaceAlt     #EEF0F8   (card phụ, input bg)
primary        #5457E6   indigo bão hòa vừa (giữ nhận diện, đậm hơn #5B5FEF chút)
primaryPressed #4346C4
primaryMuted   #E4E5FB   (nền badge/nút phụ nhạt)
textPrimary    #14161F
textSecondary  #5A6072
textTertiary   #8B90A0   (meta, hint)
border         #E2E4EE
danger         #DC2626    success #16A34A   info #3B82F6   warning #F97316   premium #F59E0B
onPrimary      #FFFFFF    (text trên nền primary)
overlay        rgba(20,22,31,0.55)   (modal scrim)
```

### Dark (night — hợp app báo thức, đỡ chói)
```
background     #0E0F1A   (xanh đêm rất tối, không đen tuyền)
surface        #181A29
surfaceAlt     #21243A   (card nổi/input)
primary        #7C80FF   (indigo sáng hơn để đủ tương phản trên nền tối)
primaryPressed #6A6EF0
primaryMuted   #262A47
textPrimary    #F2F3F9
textSecondary  #A9AEC4   (≥4.5:1 trên background)
textTertiary   #7E8399
border         #2C2F48
danger         #F87171    success #4ADE80   info #60A5FA   warning #FB923C   premium #FBBF24
onPrimary      #0E0F1A    (text tối trên nền primary sáng — kiểm tra contrast)
overlay        rgba(0,0,0,0.66)
```
> Ghi chú: chốt giá trị cuối + kiểm tra WCAG AA khi implement. `textTertiary` dark viết lại là `#7E8399`. onPrimary dark có thể để `#0E0F1A` (nếu primary đủ sáng) hoặc `#FFFFFF` — verify contrast lúc code.

### Shared tokens (không đổi theo mode)
```
radius   { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 }
elevation/shadow: hàm shadow(theme) → light dùng shadowColor tint theo textPrimary, dark dùng shadow nhẹ + border rõ hơn (dark thường dựa border thay vì shadow).
```

## Requirements
- Functional: `useTheme()` trả `{ colors, spacing, typography, radius, mode, resolvedScheme, setMode }`.
- `ThemeProvider` đọc AsyncStorage mode lúc mount, subscribe `Appearance.addChangeListener` khi mode==='system'.
- Persist mode khi `setMode`.
- Non-functional: không nhấp nháy theme lúc khởi động (đọc mode trước khi render nội dung chính, hoặc default 'system').

## Architecture
```
src/theme/
  palette-light.js      # export object light
  palette-dark.js       # export object dark
  tokens.js             # spacing (giữ), typography (giữ/mở rộng), radius, shadow(theme)
  index.js              # export getPalette(scheme), tokens
src/contexts/ThemeContext.js   # ThemeProvider + ThemeContext
src/hooks/useTheme.js          # useContext(ThemeContext) → tiện dùng
```
- Giữ `spacing.js`, `typography.js` (có thể gộp vào tokens.js hoặc giữ riêng — DRY, KISS: giữ riêng, thêm radius.js).

## Related Code Files
**Create:** `src/theme/palette-light.js`, `src/theme/palette-dark.js`, `src/theme/radius.js`, `src/contexts/ThemeContext.js`, `src/hooks/useTheme.js`
**Modify:** `src/theme/index.js` (export palettes + getPalette + radius), `src/theme/colors.js` (giữ lại như alias light để tránh vỡ import cũ trong lúc migrate, HOẶC xóa sau khi phase 03 xong — quyết định: giữ tạm, xóa ở phase 04), `App.js` (bọc `<ThemeProvider>` ngoài cùng, trước SafeAreaProvider).
**Delete (phase 04):** `src/theme/colors.js` sau khi mọi nơi chuyển sang useTheme.

## Implementation Steps
1. `npm install` (cài node_modules từ package-lock).
2. `npx expo install @expo/vector-icons` (dùng ở phase 02) — cài luôn để tránh gián đoạn. Verify `@react-native-async-storage/async-storage` đã có (có trong package.json).
3. Tạo `palette-light.js`, `palette-dark.js`, `radius.js`, cập nhật `tokens`/`index.js`.
4. Tạo `ThemeContext.js`: state mode, resolvedScheme (Appearance), setMode + persist; provider value memoized.
5. Tạo `useTheme.js`.
6. Bọc `App.js` bằng `ThemeProvider`. StatusBar + loading screen của App.js sẽ dùng useTheme ở phase 02 (App.js là consumer → cần 1 wrapper inner component để gọi useTheme, vì Provider phải bọc ngoài). Note kỹ trong phase 02.
7. Compile check: `npx expo start` (Ctrl+C sau khi bundle OK) hoặc `npx tsc`-free → dùng `node -e` import? RN không chạy node trực tiếp → dùng `npx expo export --platform web` hoặc chỉ cần metro bundle. Tối thiểu: đảm bảo không lỗi cú pháp.

## Todo
- [ ] npm install thành công
- [ ] expo install @expo/vector-icons
- [ ] palette-light.js + palette-dark.js
- [ ] radius.js + index.js cập nhật
- [ ] ThemeContext + ThemeProvider (persist + Appearance listener)
- [ ] useTheme hook
- [ ] App.js bọc ThemeProvider
- [ ] Bundle không lỗi

## Success Criteria
- `useTheme()` gọi được, trả palette đúng theo OS scheme.
- Đổi OS light↔dark → resolvedScheme đổi khi mode='system'.
- setMode persist qua restart (đọc lại AsyncStorage).

## Risk & Mitigation
- **Theme flicker khi mount**: default 'system' + đọc AsyncStorage async → có thể chớp. Mitigate: giữ loading gate của App.js (databaseState INITIALIZING) trùng thời điểm đọc mode.
- **Vòng phụ thuộc** colors.js alias: giữ colors.js trỏ tới palette-light để import cũ không vỡ trong lúc migrate từng file.

## Security
- Không liên quan; chỉ AsyncStorage lưu 1 string mode (không nhạy cảm).

## Next
→ Phase 02 (primitives + navigation dùng useTheme).
