# Plain, validated pool-size input (positive integers only)

## Why

The pool-size field is a numeric `<input type="number">`, so it shows spinner/stepper arrows
and silently coerces bad input (the current `onChange` forces any non-number to 1). There is
no feedback when someone types something invalid. We want a clean text box that accepts only
a whole number greater than 0, clearly flags anything else, and prevents building a bracket
until the value is valid.

## What changes

- The pool-size field becomes a **plain text entry box with no stepper arrows**.
- It accepts only a **positive integer (greater than 0)**. Empty, zero, negative, decimal,
  or non-numeric input is invalid.
- When the value is invalid, the field is **flagged with a short message asking for a number
  greater than 0**, and the build/"Finish my bracket" button is **disabled** until a valid
  value is entered.
- A valid positive integer continues to drive the autofill's boldness exactly as before.

## Impact

- Affected spec: `bracket-verdict-card` ("Pool size as an in-panel boldness input").
- Affected code: `app/components/BracketVerdict.tsx` (the input + build-button gating).
- No API or engine changes; the server still receives a positive integer pool size.
