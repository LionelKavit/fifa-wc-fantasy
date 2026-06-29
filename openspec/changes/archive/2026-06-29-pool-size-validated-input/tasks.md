## 1. Input + validation

- [x] 1.1 `app/components/BracketVerdict.tsx`: change the pool-size `<input>` from `type="number"` to a plain `type="text"` (with `inputMode="numeric"`), removing the stepper arrows; track the raw text locally.
- [x] 1.2 Validate as a positive integer (`/^\d+$/` and value ≥ 1); only call `onPoolSize` with a valid number. Show a short inline flag ("Enter a number greater than 0.") when invalid, and set `aria-invalid`.
- [x] 1.3 Disable the build button while the pool size is invalid (in addition to the existing generating/locked/complete conditions).

## 2. Verify

- [x] 2.1 Live preview: spinner arrows gone; typing a valid number enables build; clearing it or entering 0 / -1 / 2.5 / letters flags the field and disables build; a subsequent valid number clears the flag and re-enables build. No console errors.

## 3. Spec sync

- [x] 3.1 Confirm the implementation matches the MODIFIED requirement in `specs/bracket-verdict-card/spec.md`.
