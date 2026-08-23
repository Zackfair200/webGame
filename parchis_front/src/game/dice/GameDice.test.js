import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  createRandomDiceValue,
  DiceFace,
  DICE_ANIMATION_DURATION_MS,
  DICE_REDUCED_MOTION_DURATION_MS,
  GameDice,
} from './GameDice';

function mockReducedMotion(matches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

function getVisibleDiceValue(container) {
  return container.querySelector('[data-dice-value]')?.getAttribute('data-dice-value');
}

describe('createRandomDiceValue', () => {
  test('creates an integer dice value from an injected random source', () => {
    expect(createRandomDiceValue(() => 0)).toBe(1);
    expect(createRandomDiceValue(() => 0.49)).toBe(3);
    expect(createRandomDiceValue(() => 0.99)).toBe(6);
  });

  test('clamps an exact upper-bound random result to 6', () => {
    expect(createRandomDiceValue(() => 1)).toBe(6);
  });
});

describe('DiceFace', () => {
  test.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
    [6, 6],
  ])('renders %i with %i pips', (value, pipCount) => {
    const { container } = render(<DiceFace value={value} />);

    expect(container.querySelector('[data-dice-value]')).toHaveAttribute('data-dice-value', String(value));
    expect(container.querySelectorAll('[data-pip-position]')).toHaveLength(pipCount);
  });

  test('renders a neutral unrolled face before a dice value exists', () => {
    const { container } = render(<DiceFace value={null} />);

    expect(container.querySelector('[data-dice-neutral="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-pip-position]')).toHaveLength(0);
  });
});

describe('GameDice', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('starts in a neutral state instead of showing a rolled 1', () => {
    const { container } = render(<GameDice onRoll={jest.fn()} />);

    expect(screen.getByText('Ready to roll')).toBeInTheDocument();
    expect(container.querySelector('[data-dice-neutral="true"]')).toBeInTheDocument();
    expect(container.querySelector('[data-dice-value="1"]')).not.toBeInTheDocument();
  });

  test('keeps the die stationary by avoiding transform-based roll animation CSS', () => {
    const css = fs.readFileSync(path.join(__dirname, 'GameDice.css'), 'utf8');
    const cssWithoutPipPositioning = css
      .replace(/\.game-dice__pip\s*\{[\s\S]*?\}/, '')
      .replace(/text-transform/g, '');

    expect(cssWithoutPipPositioning).not.toMatch(/transform\s*:/);
    expect(cssWithoutPipPositioning).not.toMatch(/rotate/);
    expect(cssWithoutPipPositioning).not.toMatch(/translate3d/);
    expect(cssWithoutPipPositioning).not.toMatch(/perspective/);
    expect(cssWithoutPipPositioning).not.toMatch(/transform-style/);
    expect(cssWithoutPipPositioning).not.toMatch(/game-dice-tumble/);
  });

  test('generates one final result and dispatches that exact value after animation', () => {
    const onRoll = jest.fn();
    const rollGenerator = jest.fn(() => 4);
    const onRollingChange = jest.fn();
    const { container } = render(
      <GameDice
        onRoll={onRoll}
        onRollingChange={onRollingChange}
        rollGenerator={rollGenerator}
        animationDuration={300}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

    expect(rollGenerator).toHaveBeenCalledTimes(1);
    expect(onRollingChange).toHaveBeenCalledWith(true);
    expect(onRoll).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Rolling dice' })).toBeDisabled();
    expect(screen.getByText('Rolling...')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(140);
    });

    expect(onRoll).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(160);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll).toHaveBeenCalledWith(4);
    expect(onRollingChange).toHaveBeenLastCalledWith(false);
    expect(container.querySelector('[data-dice-value="4"]')).toBeInTheDocument();
    expect(screen.getByText('Rolled 4')).toBeInTheDocument();
  });

  test('prevents duplicate rolls while the dice is animating', () => {
    const onRoll = jest.fn();
    const rollGenerator = jest.fn(() => 5);
    render(<GameDice onRoll={onRoll} rollGenerator={rollGenerator} />);

    const rollButton = screen.getByRole('button', { name: 'Roll dice' });

    fireEvent.click(rollButton);
    fireEvent.click(rollButton);

    expect(rollGenerator).toHaveBeenCalledTimes(1);
    expect(onRoll).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(DICE_ANIMATION_DURATION_MS);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll).toHaveBeenCalledWith(5);
  });

  test('keeps intermediate animation faces presentation-only', () => {
    const onRoll = jest.fn();
    const rollGenerator = jest.fn(() => 6);
    const { container } = render(<GameDice onRoll={onRoll} rollGenerator={rollGenerator} animationDuration={300} />);

    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

    expect(getVisibleDiceValue(container)).toBeUndefined();

    act(() => {
      jest.advanceTimersByTime(70);
    });

    expect(getVisibleDiceValue(container)).toBe('2');
    expect(screen.getByText('Rolling...')).toBeInTheDocument();
    expect(onRoll).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(70);
    });

    expect(getVisibleDiceValue(container)).toBe('3');
    expect(onRoll).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(160);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll).toHaveBeenCalledWith(6);
    expect(getVisibleDiceValue(container)).toBe('6');
  });

  test('preserves the last final result until the next roll settles', () => {
    const onRoll = jest.fn();
    const rollGenerator = jest.fn(() => 2);
    const { container, rerender } = render(
      <GameDice onRoll={onRoll} rollGenerator={rollGenerator} animationDuration={200} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(container.querySelector('[data-dice-value="2"]')).toBeInTheDocument();

    rerender(<GameDice onRoll={onRoll} rollGenerator={rollGenerator} animationDuration={200} value={null} />);

    expect(container.querySelector('[data-dice-value="2"]')).toBeInTheDocument();
    expect(screen.getByText('Rolled 2')).toBeInTheDocument();
  });

  test('respects reduced motion while still dispatching exactly one final roll', () => {
    mockReducedMotion(true);
    const onRoll = jest.fn();
    const rollGenerator = jest.fn(() => 3);
    const { container } = render(<GameDice onRoll={onRoll} rollGenerator={rollGenerator} />);

    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

    expect(rollGenerator).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-dice-value="3"]')).toBeInTheDocument();
    expect(onRoll).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(DICE_REDUCED_MOTION_DURATION_MS);
    });

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onRoll).toHaveBeenCalledWith(3);
    expect(screen.getByText('Rolled 3')).toBeInTheDocument();
  });

  test('does not roll when disabled', () => {
    const onRoll = jest.fn();
    const rollGenerator = jest.fn(() => 1);
    render(<GameDice disabled onRoll={onRoll} rollGenerator={rollGenerator} />);

    fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));

    expect(rollGenerator).not.toHaveBeenCalled();
    expect(onRoll).not.toHaveBeenCalled();
  });
});
