import React, { useRef, useEffect } from 'react';

interface OtpCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onComplete?: () => void;
  ariaLabel?: string;
}

export const OtpCodeInput: React.FC<OtpCodeInputProps> = ({
  value,
  onChange,
  length = 6,
  disabled = false,
  autoFocus = true,
  onComplete,
  ariaLabel = 'Verification code',
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, length);
    if (!rawVal) {
      const newDigits = [...digits];
      newDigits[index] = ' ';
      onChange(newDigits.join(''));
      return;
    }

    const newDigits = [...digits];
    rawVal.split('').forEach((char, offset) => {
      if (index + offset < length) newDigits[index + offset] = char;
    });
    const nextVal = newDigits.join('');
    onChange(nextVal);

    if (nextVal.replace(/\s+/g, '').length === length) {
      onComplete?.();
    }

    const focusIndex = Math.min(index + rawVal.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] || digits[index] === ' ') {
        if (index > 0 && inputRefs.current[index - 1]) {
          inputRefs.current[index - 1]?.focus();
        }
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      onChange(pasted);
      if (pasted.length === length) {
        onComplete?.();
      }
      const focusIndex = Math.min(pasted.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="my-3 flex w-full items-center justify-center gap-1.5 min-[360px]:gap-2 sm:gap-3">
      {Array.from({ length }).map((_, i) => {
        const digit = digits[i] && digits[i] !== ' ' ? digits[i] : '';
        const isFilled = Boolean(digit);

        return (
          <input
            key={i}
            id={`otp-code-${i}`}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`${ariaLabel}, digit ${i + 1} of ${length}`}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`h-10 w-9 min-[360px]:h-11 min-[360px]:w-10 sm:h-14 sm:w-12 text-center text-xl sm:text-2xl font-black rounded-xl sm:rounded-[16px] border-2 transition-all duration-200 outline-none select-none font-mono ${
              isFilled
                ? 'border-slate-800 bg-slate-100 text-slate-900 shadow-sm scale-[1.03]'
                : 'border-slate-200 bg-slate-100/60 text-slate-900 focus:border-slate-400 focus:bg-white focus:ring-0'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
          />
        );
      })}
    </div>
  );
};
