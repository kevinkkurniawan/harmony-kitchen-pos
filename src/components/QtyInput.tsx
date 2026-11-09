'use client';

import { useRef, useState } from 'react';

interface QtyInputProps {
  value: number;
  onCommit: (qty: number) => void;
  /** Called after Enter or Escape, e.g. to give focus back to the barcode field */
  onDone?: () => void;
  className?: string;
}

const MAX_DIGITS = 4;

// Typed quantity for a cart row: applied on Enter or blur, Escape restores the current value.
// Empty, zero or longer than 4 digits is ignored (a barcode scanned into this box must never become
// a quantity); removing an item stays on the delete button.
export default function QtyInput({ value, onCommit, onDone, className = '' }: QtyInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // The ref, not state, decides on blur: blur() runs before React re-renders after setDraft
  const draftRef = useRef<string | null>(null);

  const setBoth = (next: string | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  const commit = () => {
    const text = draftRef.current;
    setBoth(null);
    const digits = text?.trim() ?? '';
    if (!/^[0-9]+$/.test(digits) || digits.length > MAX_DIGITS) return;
    const qty = Number(digits);
    if (Number.isInteger(qty) && qty >= 1 && qty !== value) onCommit(qty);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label="Qty"
      value={draft ?? String(value)}
      onFocus={(e) => e.target.select()}
      // Keep the raw text: a non-digit (e.g. a scanned barcode "HK-0012") makes commit discard it
      onChange={(e) => setBoth(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
          onDone?.();
        } else if (e.key === 'Escape') {
          setBoth(null);
          e.currentTarget.blur();
          onDone?.();
        }
      }}
      className={`w-12 text-center font-bold font-mono rounded border bg-transparent outline-none focus:ring-2 focus:ring-sky-500 ${className}`}
    />
  );
}
