import { describe, it, expect } from 'vitest';
import { ALL_NEPAL_PACKAGES } from '../../data/nepalPackagesCatalog';

describe('nepalPackagesCatalog', () => {
  describe('ALL_NEPAL_PACKAGES', () => {
    it('should be a valid object mapping strings to arrays of ProductPackage', () => {
      expect(typeof ALL_NEPAL_PACKAGES).toBe('object');
      expect(ALL_NEPAL_PACKAGES).not.toBeNull();
      expect(Object.keys(ALL_NEPAL_PACKAGES).length).toBeGreaterThan(0);
    });

    it('should contain expected categories', () => {
      expect(ALL_NEPAL_PACKAGES).toHaveProperty('prod-free-fire');
      expect(ALL_NEPAL_PACKAGES).toHaveProperty('prod-pubg-mobile');
    });

    it('should contain valid ProductPackage structures in all arrays', () => {
      Object.entries(ALL_NEPAL_PACKAGES).forEach(([_key, packages]) => {
        expect(Array.isArray(packages)).toBe(true);
        packages.forEach((pkg) => {
          expect(pkg).toHaveProperty('id');
          expect(typeof pkg.id).toBe('string');

          expect(pkg).toHaveProperty('name');
          expect(typeof pkg.name).toBe('string');

          expect(pkg).toHaveProperty('price');
          expect(typeof pkg.price).toBe('number');

          // Optional properties shouldn't be of incorrect types if present
          if (pkg.originalPrice !== undefined) {
             expect(typeof pkg.originalPrice).toBe('number');
          }
          if (pkg.amountValue !== undefined) {
             expect(typeof pkg.amountValue).toBe('string');
          }
        });
      });
    });

    it('should have unique package IDs within each product category', () => {
      Object.entries(ALL_NEPAL_PACKAGES).forEach(([_key, packages]) => {
        const ids = packages.map(p => p.id);
        const uniqueIds = new Set(ids);
        expect(ids.length).toBe(uniqueIds.size);
      });
    });
  });
});

