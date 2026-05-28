# gpt_image_playground Upstream

This repository vendors [CookSleep/gpt_image_playground](https://github.com/CookSleep/gpt_image_playground) as a git subtree under `third_party/gpt_image_playground`.

## Current Upstream

- Repository: `https://github.com/CookSleep/gpt_image_playground.git`
- Branch: `main`
- Initial commit: `48a5692ff2ea8ff033f52041ffdc0db0ffa7bab6`
- License: MIT

## Update Flow

Keep local integration code outside `third_party/gpt_image_playground` whenever possible.

```powershell
git subtree pull --prefix=third_party/gpt_image_playground https://github.com/CookSleep/gpt_image_playground.git main --squash
```

If a local patch is unavoidable, store it under `tools/image-playground/patches/` and re-apply it after the subtree pull.

## Verification

```powershell
Set-Location frontend
pnpm run images:playground
pnpm exec vitest run src/views/user/__tests__/ImagePlaygroundView.spec.ts
pnpm run build
```
