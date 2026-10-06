import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateLogoFile } from '../../utils/branding';

describe('validateLogoFile', () => {
  let shouldFailImage = false;
  let mockWidth = 100;
  let mockHeight = 100;

  beforeEach(() => {
    vi.restoreAllMocks();
    shouldFailImage = false;
    mockWidth = 100;
    mockHeight = 100;

    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn(() => 'blob:http://localhost/mock-blob-uuid'),
      revokeObjectURL: vi.fn(),
    });

    vi.stubGlobal('Image', class {
      onload: any = null;
      onerror: any = null;
      get width() { return mockWidth; }
      set width(v: number) { mockWidth = v; }
      get height() { return mockHeight; }
      set height(v: number) { mockHeight = v; }
      set src(_val: string) {
        setTimeout(() => {
          if (shouldFailImage && this.onerror) {
            this.onerror(new Error('Mocked Image error'));
          } else if (this.onload) {
            this.onload();
          }
        }, 0);
      }
    });
  });

  it('rejects invalid file type', async () => {
    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const result = await validateLogoFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Invalid file format/);
  });

  it('rejects file exceeding max size', async () => {
    // Create a 7MB file mockup
    const largeContent = new Array(7 * 1024 * 1024).fill('a').join('');
    const file = new File([largeContent], 'large-logo.png', { type: 'image/png' });

    const result = await validateLogoFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/File is too large/);
  });

  it('accepts valid file and returns dimensions', async () => {
    const file = new File(['dummy content'], 'logo.png', { type: 'image/png' });
    const result = await validateLogoFile(file);

    expect(result.valid).toBe(true);
    expect(result.dataUrl).toBe('blob:http://localhost/mock-blob-uuid');
    expect(result.dimensions).toEqual({ width: 100, height: 100 });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-uuid');
  });

  it('rejects image with resolution too low', async () => {
    mockWidth = 50;
    mockHeight = 50;

    const file = new File(['dummy content'], 'logo.png', { type: 'image/png' });
    const result = await validateLogoFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Image resolution is too low/);
  });

  it('handles Image loading errors gracefully', async () => {
    shouldFailImage = true;

    const file = new File(['dummy content'], 'logo.png', { type: 'image/png' });
    const result = await validateLogoFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/Could not parse the uploaded image/);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});
