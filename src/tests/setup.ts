import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Ensure consistent mock environment before each test
beforeEach(() => {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}
  vi.clearAllMocks();
});
