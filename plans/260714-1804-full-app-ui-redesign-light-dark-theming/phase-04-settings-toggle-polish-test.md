# Phase 04 — Settings Toggle + Polish + A11y/Contrast + Test

**Priority:** MEDIUM | **Status:** ⬜ Pending | **Depends:** Phase 03

## Overview
Thêm UI chọn theme trong Settings, dọn dẹp (xóa colors.js cũ), rà soát tương phản WCAG AA cả 2 mode, và smoke test toàn app.

## Requirements
- Settings có nhóm "Appearance" với 3 lựa chọn segmented: **Light / Dark / System** (mặc định System).
- Chọn xong đổi ngay (không cần restart), lưu lại, restart vẫn giữ.
- Xóa `src/theme/colors.js` (alias tạm) sau khi mọi import đã chuyển; cập nhật `index.js`.
- Rà a11y: text ≥4.5:1 (body) / ≥3:1 (secondary/large) cả 2 mode; touch target ≥44pt; icon có accessibilityLabel.

## Related Code Files
**Modify:** `src/screens/settings/SettingsScreen.js` (thêm section Appearance dùng `mode`/`setMode` từ useTheme), `src/theme/index.js`.
**Delete:** `src/theme/colors.js` (sau khi grep xác nhận không còn import).
**Create (optional):** `src/components/common/SegmentedControl.js` nếu cần control tái dùng cho Light/Dark/System (KISS: có thể inline 3 Pressable).

## Implementation Steps
1. Thêm section Appearance vào SettingsScreen (3 nút segmented, highlight cái đang chọn theo `mode`).
2. Grep toàn repo `from '../theme'`/`colors.js` → đảm bảo không ai còn import trực tiếp `colors` tĩnh; chuyển nốt nếu sót.
3. Xóa `colors.js`, cập nhật `index.js`.
4. Rà tương phản: liệt kê cặp text/nền chính mỗi mode, chỉnh palette nếu <AA (đặc biệt textSecondary/textTertiary trên dark).
5. Smoke test (xem checklist test bên dưới).
6. Cập nhật docs: `docs/design-guidelines.md` (palette + cách dùng useTheme) nếu docs tồn tại; ghi changelog.

## Test Checklist (chạy `npm install` xong → `npx expo start`)
- [ ] App khởi động ở light (OS light) và dark (OS dark) đúng.
- [ ] Đổi trong Settings: Light/Dark/System đổi ngay, đúng.
- [ ] Kill app mở lại → giữ lựa chọn.
- [ ] Đi hết tab: Alarms, Sleep, Progress, Settings — 2 mode.
- [ ] Luồng báo thức: List → Form → Preview → Ringing → Snoozing.
- [ ] Luồng challenge: Instruction → Camera → Preview → Verification (overlay/contrast).
- [ ] Premium, Progress, Sleep (timeline+badge), auth screens.
- [ ] Không lỗi đỏ Metro; không chớp nền sai màu.

## Todo
- [ ] SettingsScreen Appearance section
- [ ] Grep sạch import tĩnh
- [ ] Xóa colors.js + cập nhật index.js
- [ ] Rà & sửa tương phản AA
- [ ] Smoke test 2 mode toàn app
- [ ] Docs + changelog (nếu docs/ tồn tại)

## Success Criteria
- Toggle hoạt động, persist, đổi tức thì.
- Không còn colors.js; 0 hardcode hex trong component.
- Mọi text đạt AA cả 2 mode; touch target đạt chuẩn.
- Toàn app smoke test pass.

## Risk & Mitigation
- **Sót import tĩnh** → grep cơ học bắt hết trước khi xóa colors.js.
- **Contrast dark chưa đạt** → chỉnh token ở palette-dark, không sửa từng screen.
- Không thể chạy thiết bị thật ở đây → tối thiểu đảm bảo bundle sạch + đọc kỹ; user chạy `npx expo start` để test trực quan.

## Security
- Không liên quan.

## Next
→ Hoàn tất. Đề xuất `/ck:code-review` trước khi commit.
