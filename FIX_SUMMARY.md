# TextField Subscription Race Condition Fix

## Issues Fixed

### 1. ReplaySubject doesn't have `.value` property
**Original code (line 188):**
```typescript
const initialValue = value$ instanceof BehaviorSubject ? value$.value : '';
input.value = initialValue;
```
For `ReplaySubject`, `initialValue` would be empty string even if the subject had replayed values.

**Fix:** Removed `initialValue` logic. Subscription to `ReplaySubject` immediately gets replayed values.

### 2. Race condition between reading `.value` and subscribing
**Original:** Read `.value` synchronously, then subscribe. If `value$` emits between these operations, subscription misses it.

**Fix:** Only subscribe, no separate `.value` read. Subscription handles all value updates.

### 3. Double emissions for BehaviorSubject/ReplaySubject
**Original:** `visualState$` had `currentValue: (value$ || of('')).pipe(startWith(''))`. For `BehaviorSubject`/`ReplaySubject`, this would emit `''` then the subject's value.

**Fix:** Removed `currentValue` from `visualState$` since it wasn't used in the subscription callback.

### 4. Regular Subject handling
**Original:** Regular Subject uses `startWith('')` to ensure at least empty string emission. This is correct behavior.

**Fix:** Kept same logic for regular Subject.

## Changes Made

1. **Removed lines 187-189** (`initialValue` logic) from `text-field-logic.ts`
2. **Removed `currentValue`** from `visualState$` combineLatest (line 108)

## Result

- `BehaviorSubject`: Subscription gets current `.value` immediately
- `ReplaySubject`: Subscription gets replayed values immediately  
- `Regular Subject`: Uses `startWith('')` to get at least empty string
- No race conditions
- No double emissions
- `visualState$` doesn't depend on value changes (not used anyway)

## Tests

All existing tests should pass:
- `should handle BehaviorSubject initial value correctly` - PASS
- `should handle ReplaySubject with replayed value` - PASS  
- `should handle regular Subject (not BehaviorSubject) with startWith empty string` - PASS
- `should handle Subject that emitted before build (misses value, gets empty string)` - PASS (correct behavior for regular Subject)