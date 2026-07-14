# Phase 03 — Screens + Feature Components Refactor

**Priority:** HIGH | **Status:** ⬜ Pending | **Depends:** Phase 01, 02

## Overview
Chuyển 20 screens + 4 feature components còn lại sang `useTheme()`, đảm bảo light/dark parity, sửa các màu ngữ nghĩa (quality/timeline/overlay) cho dark mode, và nâng chất lượng thị giác (spacing, radius, shadow, empty/loading states) theo skill.

## Key Insights
- Mọi file đã import theme tĩnh → refactor cơ học: đổi `import { colors }` → `useTheme()` + StyleSheet trong render.
- Nhóm "tricky" cần chú ý ngữ nghĩa màu ở dark:
  - **SleepScreen** (571 dòng): QUALITY_COLORS (Ideal/Good/Short/Minimal → success/info/warning/danger) + TIMELINE_COLORS [primary,info,success,premium]. Phải lấy từ theme động, giữ phân biệt trên nền tối.
  - **AlarmRingingScreen / CameraChallengeScreen / MockAdOverlay**: overlay rgba đen — dùng `theme.colors.overlay`. Camera overlay giữ tối (đè lên camera) độc lập mode, nhưng controls dùng theme.
  - **PremiumScreen**: FeatureIndicator free/premium bg — dùng primaryMuted/premium tint.

## Batching (chia nhóm để refactor tuần tự, mỗi nhóm compile check)
**Batch A — Feature components:** AlarmCard, TimeInput, DaySelector, MockAdOverlay
**Batch B — Auth + Account (form đơn giản):** LoginScreen, RegisterScreen, ForgotPasswordScreen, ChangePasswordScreen, SetPasswordScreen, WelcomeScreen
**Batch C — Alarm core:** AlarmListScreen, AlarmFormScreen, AlarmPreviewScreen, AlarmRingingScreen, AlarmSnoozingScreen
**Batch D — Challenge:** ChallengeInstructionScreen, CameraChallengeScreen, ChallengePreviewScreen, ChallengeVerificationScreen, PlaceholderChallengeScreen
**Batch E — Premium/Progress/Sleep/Settings (nặng):** PremiumScreen, ProgressScreen, SleepScreen, SettingsScreen

> Có thể giao mỗi batch cho 1 fullstack-developer subagent (file ownership tách biệt, không đè nhau). Batch E làm cẩn thận/riêng.

## Refactor pattern (áp dụng mọi file)
```js
import { useMemo } from 'react';
import { useTheme } from '../../hooks/useTheme';
// ...
export default function Screen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // ...JSX dùng styles + theme.colors cho props động (Switch trackColor, ActivityIndicator color, placeholderTextColor)
}
const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({ /* ... */ });
```
- Native props màu (Switch.trackColor, ActivityIndicator.color, placeholderTextColor, Ionicons color) lấy trực tiếp từ `theme.colors`.

## Related Code Files
**Modify (24 files):** tất cả file trong Batch A–E ở trên.
Không tạo file mới trừ khi 1 screen >200 dòng cần tách (SleepScreen 571, ChallengeVerification 290, PremiumScreen 311, AlarmRinging 258, SettingsScreen 193) → cân nhắc tách sub-component/ style riêng theo rule modularization, nhưng KHÔNG bắt buộc trong phase này (ưu tiên theming trước; tách file nếu thuận tiện).

## Implementation Steps
1. Batch A → compile check.
2. Batch B → compile check.
3. Batch C → compile check.
4. Batch D → compile check (chú ý camera overlay contrast).
5. Batch E → compile check (SleepScreen quality/timeline colors, Premium indicators, Settings profile card).
6. Grep đảm bảo không còn `import { colors` tĩnh trong screens/components (trừ nơi cố ý).

## Todo
- [ ] Batch A (4 components)
- [ ] Batch B (6 auth/account)
- [ ] Batch C (5 alarm)
- [ ] Batch D (5 challenge)
- [ ] Batch E (4 nặng: Premium/Progress/Sleep/Settings)
- [ ] Grep xác nhận sạch import tĩnh
- [ ] Bundle OK

## Success Criteria
- 24 file render đúng ở cả light+dark, không màu "chết" (chữ chìm nền).
- SleepScreen: badge chất lượng + timeline vẫn phân biệt được ở dark.
- Overlay/scrim đủ tối để tách foreground (40–66%).
- Không còn icon chữ/emoji làm icon cấu trúc (nếu gặp → thay Ionicons).

## Risk & Mitigation
- **File nặng dễ sót màu**: sau mỗi batch, mở screen ở cả 2 mode kiểm tra bằng mắt.
- **Subagent đè file**: nếu dùng song song, tách quyền sở hữu file rõ ràng theo batch, không có file dùng chung giữa 2 subagent.
- **Regression logic**: chỉ đụng phần style/JSX màu, không đổi handler/state.

## Security
- Không liên quan.

## Next
→ Phase 04 (toggle UI + polish + test).
