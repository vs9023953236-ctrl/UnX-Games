import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OtpCodeInput } from '../../components/auth/OtpCodeInput';

describe('OtpCodeInput', () => {
  it('exposes each digit with an accessible label and distributes pasted codes', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();

    render(
      <OtpCodeInput
        value=""
        onChange={onChange}
        onComplete={onComplete}
        ariaLabel="Sign-in code"
      />
    );

    const firstDigit = screen.getByRole('textbox', { name: 'Sign-in code, digit 1 of 6' });
    fireEvent.paste(firstDigit, {
      clipboardData: { getData: () => '12 34-56' },
    });

    expect(onChange).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'Sign-in code, digit 6 of 6' })).not.toBeNull();
  });

  it('preserves the position of digits when an individual box is cleared', () => {
    const onChange = vi.fn();

    render(<OtpCodeInput value="12 456" onChange={onChange} autoFocus={false} />);
    const secondDigit = screen.getByRole('textbox', { name: 'Verification code, digit 2 of 6' });

    fireEvent.change(secondDigit, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith('1  456');
  });
});
