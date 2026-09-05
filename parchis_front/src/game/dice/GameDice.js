import React, { useEffect, useRef, useState } from 'react';
import './GameDice.css';

export const DICE_VALUES = Object.freeze([1, 2, 3, 4, 5, 6]);
export const DICE_ANIMATION_DURATION_MS = 820;
export const DICE_REDUCED_MOTION_DURATION_MS = 80;

const PIPS_BY_VALUE = Object.freeze({
  1: ['center'],
  2: ['top-left', 'bottom-right'],
  3: ['top-left', 'center', 'bottom-right'],
  4: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  5: ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'],
  6: ['top-left', 'middle-left', 'bottom-left', 'top-right', 'middle-right', 'bottom-right'],
});

function isDiceValue(value) {
  return DICE_VALUES.includes(value);
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createRandomDiceValue(random = Math.random) {
  const value = Math.floor(random() * DICE_VALUES.length) + 1;

  return Math.min(DICE_VALUES.length, Math.max(1, value));
}

export function DiceFace({ value }) {
  if (!isDiceValue(value)) {
    return (
      <div className="game-dice__face game-dice__face--neutral" data-dice-neutral="true">
        <span>Roll</span>
      </div>
    );
  }

  return (
    <div className="game-dice__face" data-dice-value={value}>
      {PIPS_BY_VALUE[value].map((position) => (
        <span
          key={position}
          className={`game-dice__pip game-dice__pip--${position}`}
          data-pip-position={position}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function GameDice({
  disabled = false,
  value = null,
  onRoll,
  onRollingChange,
  rollGenerator = createRandomDiceValue,
  animationDuration = DICE_ANIMATION_DURATION_MS,
  reducedMotionDuration = DICE_REDUCED_MOTION_DURATION_MS,
}) {
  const [displayValue, setDisplayValue] = useState(isDiceValue(value) ? value : null);
  const [rolling, setRolling] = useState(false);
  const [settling, setSettling] = useState(false);
  const [faceVersion, setFaceVersion] = useState(0);
  const rollingRef = useRef(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const settleTimeoutRef = useRef(null);
  const onRollRef = useRef(onRoll);
  const onRollingChangeRef = useRef(onRollingChange);

  function showFace(nextValue) {
    setDisplayValue(nextValue);
    setFaceVersion((currentVersion) => currentVersion + 1);
  }

  useEffect(() => {
    onRollRef.current = onRoll;
  }, [onRoll]);

  useEffect(() => {
    onRollingChangeRef.current = onRollingChange;
  }, [onRollingChange]);

  useEffect(() => {
    if (!rollingRef.current && isDiceValue(value)) {
      setDisplayValue(value);
      setFaceVersion((currentVersion) => currentVersion + 1);
    }
  }, [value]);

  useEffect(() => () => {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(timeoutRef.current);
    window.clearTimeout(settleTimeoutRef.current);
    onRollingChangeRef.current?.(false);
  }, []);

  function finishRoll(finalValue) {
    window.clearInterval(intervalRef.current);
    window.clearTimeout(settleTimeoutRef.current);
    showFace(finalValue);
    onRollRef.current(finalValue);
    rollingRef.current = false;
    setRolling(false);
    setSettling(true);
    onRollingChangeRef.current?.(false);

    settleTimeoutRef.current = window.setTimeout(() => {
      setSettling(false);
    }, 180);
  }

  function handleRoll() {
    if (disabled || rollingRef.current) {
      return;
    }

    const finalValue = rollGenerator();

    if (!isDiceValue(finalValue)) {
      throw new Error(`rollGenerator must return an integer from 1 to 6. Received: ${finalValue}`);
    }

    rollingRef.current = true;
    setRolling(true);
    window.clearTimeout(settleTimeoutRef.current);
    setSettling(false);
    onRollingChangeRef.current?.(true);

    const shouldReduceMotion = prefersReducedMotion();
    const duration = shouldReduceMotion ? reducedMotionDuration : animationDuration;

    if (shouldReduceMotion) {
      showFace(finalValue);
    } else {
      let tick = 0;

      intervalRef.current = window.setInterval(() => {
        tick += 1;
        showFace(DICE_VALUES[tick % DICE_VALUES.length]);
      }, 70);
    }

    timeoutRef.current = window.setTimeout(() => finishRoll(finalValue), duration);
  }

  const isDisabled = disabled || rolling;

  return (
    <section className={`game-dice-panel${rolling ? ' game-dice-panel--rolling' : ''}${settling ? ' game-dice-panel--settling' : ''}`} aria-label="Gameplay dice">
      <button
        type="button"
        className={`game-dice${rolling ? ' game-dice--rolling' : ''}${settling ? ' game-dice--settling' : ''}${isDisabled ? ' game-dice--disabled' : ''}`}
        disabled={isDisabled}
        onClick={handleRoll}
        aria-label={rolling ? 'Rolling dice' : 'Roll dice'}
        data-dice-rolling={rolling ? 'true' : 'false'}
      >
        <span className="game-dice__scene" aria-hidden="true">
          <span
            key={faceVersion}
            className="game-dice__face-stage"
            data-face-version={faceVersion}
          >
            <DiceFace value={displayValue} />
          </span>
        </span>
      </button>
      <div className="game-dice-panel__copy" aria-live="polite">
        <span>Dice</span>
        <strong>{rolling ? 'Rolling...' : displayValue ? `Rolled ${displayValue}` : 'Ready to roll'}</strong>
      </div>
    </section>
  );
}

export default GameDice;
