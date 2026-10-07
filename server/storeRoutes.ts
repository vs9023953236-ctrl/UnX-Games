import express, { Router, Request, Response } from 'express';
import pLimit from 'p-limit';
import crypto from 'crypto';
import { pool, db } from '../src/db/index.js';
import { getSupabaseAdmin, getSupabaseClient } from './supabaseClient.js';
import { emitGhnSyncEvent } from './syncEvents.js';
import {
  AuthRequest,
  authenticateUser,
  requireStaff,
  requireAdmin,
  requireManager,
  optionalUser,
  sanitizeUser,
  
  isStoreOwnerAccount,
} from './auth.js';
import {
  uploadToR2,
  testR2Connection,
  getR2ConfigSummary,
  deleteFromR2,
  resetR2Client,
} from './r2.js';
import {
  generateAiReviewReply,
  getReviewSettings,
  updateReviewSettings,
} from './aiReviewReply.js';
import { handleAssistantChat, getCustomAiConfig, updateCustomAiConfig } from './aiAssistant.js';
import { verifyPaymentReceipt } from './aiReceiptVerifier.js';
import { generateProductContent } from './aiProductGen.js';
import { handleDatabaseCopilot } from './aiDatabaseCopilot.js';
import {
  runAiCodeArchitect,
  runAutonomousSystemScan,
  executeAutonomousSelfHealing,
} from './aiEngineerService.js';
import { executeRealSwarmCouncil } from './swarmOrchestrator.js';
import { getRegisteredModels, toggleModelStatus, verifyModelHealth } from './modelRegistry.js';
import { getTerminalLogs, clearTerminalLogs } from './swarmTerminal.js';
import { executeRealSwarmAction, getRecentSwarmActions } from './swarmActions.js';
import {
  adminReadFile,
  adminSearchFiles,
  adminListDirectory,
  adminWriteFile,
  adminDeleteFile,
  adminGetDatabaseOverview,
  adminExecuteSafeSql,
  adminRunTypeCheck,
  adminRunBuildCheck,
  logAdminToolInvocation,
} from './adminAgentTools.js';
import { gatewayCache, invalidateCacheTag } from './gateway/cache.js';
import { invalidateRedisCache } from './redis.js';
import { handleImageTransform } from './imageTransformService.js';
import {
  rpcRequestCancellation,
  rpcResolveCancellation,
  rpcProcessRefund,
  rpcValidateCoupon,
  rpcUpdateInventory
} from './rpcService.js';

function parsePackageAmount(amountVal: any, nameVal?: string): number {
  if (typeof amountVal === 'number' && !isNaN(amountVal)) return amountVal;
  if (amountVal !== undefined && amountVal !== null && amountVal !== '') {
    const parsed = parseFloat(String(amountVal).replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (nameVal) {
    const match = String(nameVal).match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 1;
}

export function registerStoreRoutes(router: Router) {
  // Automated modern format image transformer (WebP/AVIF proxy)
  router.get('/image/transform', handleImageTransform);

  // =========================================================================
  // 1. PRODUCTS & PACKAGES
  // =========================================================================

  // GET /products - List all products with their packages
  router.get('/products', gatewayCache(60, ['products']), async (_req: Request, res: Response) => {
    try {
      const productsRes = await pool.query(`
        SELECT p.*, g.name as game_name, c.name as category_name
        FROM products p
        LEFT JOIN games g ON p.game_id = g.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.archived IS NOT TRUE
        ORDER BY p.display_order ASC, p.created_at DESC
      `);

      const packagesRes = await pool.query(`
        SELECT * FROM product_packages 
        ORDER BY display_order ASC, price ASC
      `);

      const packagesByProduct: Record<string, any[]> = {};
      for (const pkg of packagesRes.rows) {
        const pid = pkg.product_id;
        if (!packagesByProduct[pid]) packagesByProduct[pid] = [];
        packagesByProduct[pid].push({
          id: pkg.id,
          productId: pkg.product_id,
          product_id: pkg.product_id,
          name: pkg.name,
          amount: Number(pkg.amount) || pkg.amount,
          unit: pkg.unit || '',
          price: Number(pkg.price) || 0,
          compareAtPrice: pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined,
          compare_at_price: pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined,
          discount: Number(pkg.discount) || 0,
          badge: pkg.badge || null,
          active: pkg.active !== false,
          popular: Boolean(pkg.popular),
          displayOrder: pkg.display_order ?? 0,
          display_order: pkg.display_order ?? 0,
        });
      }

      const formatted = productsRes.rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        description: p.description || '',
        shortDescription: p.short_description || '',
        short_description: p.short_description || '',
        categoryId: p.category_id,
        category_id: p.category_id,
        categoryName: p.category_name || '',
        gameId: p.game_id || p.id,
        game_id: p.game_id || p.id,
        gameName: p.game_name || '',
        image: p.image_url || '',
        imageUrl: p.image_url || '',
        image_url: p.image_url || '',
        bannerImage: p.banner_url || p.image_url || '',
        bannerUrl: p.banner_url || '',
        banner_url: p.banner_url || '',
        r2Key: p.r2_key || '',
        currency: p.currency || 'NPR',
        region: p.region || '',
        deliveryType: p.delivery_type || 'instant',
        requiredFields: Array.isArray(p.required_fields) ? p.required_fields : [],
        required_fields: Array.isArray(p.required_fields) ? p.required_fields : [],
        featured: Boolean(p.featured),
        popular: Boolean(p.popular),
        bestValue: Boolean(p.best_value),
        best_value: Boolean(p.best_value),
        active: p.active !== false,
        archived: Boolean(p.archived),
        inStock: p.in_stock !== false,
        in_stock: p.in_stock !== false,
        stock: p.stock ?? 99,
        displayOrder: p.display_order ?? 0,
        display_order: p.display_order ?? 0,
        packages: packagesByProduct[p.id] || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));

      return res.json({ success: true, products: formatted });
    } catch (err: any) {
      console.error('Failed to get products:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch products' });
    }
  });

  // GET /products/:id - Single product with packages
  router.get('/products/:id', gatewayCache(60, ['products']), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const prodRes = await pool.query(`
        SELECT p.*, g.name as game_name, c.name as category_name
        FROM products p
        LEFT JOIN games g ON p.game_id = g.id
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = $1 OR p.slug = $1
        LIMIT 1
      `, [id]);

      if (!prodRes.rows || prodRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      const p = prodRes.rows[0];
      const pkgRes = await pool.query(`
        SELECT * FROM product_packages 
        WHERE product_id = $1 
        ORDER BY display_order ASC, price ASC
      `, [p.id]);

      const packages = pkgRes.rows.map((pkg: any) => ({
        id: pkg.id,
        productId: pkg.product_id,
        product_id: pkg.product_id,
        name: pkg.name,
        amount: Number(pkg.amount) || pkg.amount,
        unit: pkg.unit || '',
        price: Number(pkg.price) || 0,
        compareAtPrice: pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined,
        compare_at_price: pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined,
        discount: Number(pkg.discount) || 0,
        badge: pkg.badge || null,
        active: pkg.active !== false,
        popular: Boolean(pkg.popular),
        displayOrder: pkg.display_order ?? 0,
      }));

      const formatted = {
        id: p.id,
        name: p.name,
        slug: p.slug || p.id,
        description: p.description || '',
        shortDescription: p.short_description || '',
        categoryId: p.category_id,
        category_id: p.category_id,
        categoryName: p.category_name || '',
        gameId: p.game_id || p.id,
        game_id: p.game_id || p.id,
        gameName: p.game_name || '',
        image: p.image_url || '',
        imageUrl: p.image_url || '',
        image_url: p.image_url || '',
        bannerImage: p.banner_url || p.image_url || '',
        bannerUrl: p.banner_url || '',
        banner_url: p.banner_url || '',
        currency: p.currency || 'NPR',
        requiredFields: Array.isArray(p.required_fields) ? p.required_fields : [],
        required_fields: Array.isArray(p.required_fields) ? p.required_fields : [],
        featured: Boolean(p.featured),
        popular: Boolean(p.popular),
        bestValue: Boolean(p.best_value),
        active: p.active !== false,
        inStock: p.in_stock !== false,
        stock: p.stock ?? 99,
        displayOrder: p.display_order ?? 0,
        packages,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };

      return res.json({ success: true, product: formatted });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch product' });
    }
  });

  // POST /products - Create product
  router.post('/products', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const id = data.id || `prod-${Date.now()}`;
      const name = data.name || 'New Product';
      const slug = data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || id;
      const description = data.description || '';
      const categoryId = data.categoryId || data.category_id || 'cat-mobile';
      const gameId = data.gameId || data.game_id || id;
      const imageUrl = data.image || data.imageUrl || data.image_url || '';
      const bannerUrl = data.bannerImage || data.bannerUrl || data.banner_url || imageUrl;
      const featured = Boolean(data.featured);
      const popular = Boolean(data.popular);
      const active = data.active !== false;
      const inStock = data.inStock !== false && data.in_stock !== false;
      const stock = data.stock ?? 99;
      const displayOrder = data.displayOrder ?? data.display_order ?? 0;
      const reqFields = JSON.stringify(data.requiredFields || data.required_fields || []);

      await pool.query(`
        INSERT INTO products (id, name, slug, description, category_id, game_id, image_url, banner_url, featured, popular, active, in_stock, stock, display_order, required_fields, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = $2, slug = $3, description = $4, category_id = $5, game_id = $6, image_url = $7, banner_url = $8,
          featured = $9, popular = $10, active = $11, in_stock = $12, stock = $13, display_order = $14, required_fields = $15, updated_at = NOW()
      `, [id, name, slug, description, categoryId, gameId, imageUrl, bannerUrl, featured, popular, active, inStock, stock, displayOrder, reqFields]);

      // Save packages if provided
      if (Array.isArray(data.packages) && data.packages.length > 0) {
        // Validate duplicates within payload
        const seenNames = new Set<string>();
        for (const pkg of data.packages) {
          const norm = (pkg.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
          if (!norm) {
            return res.status(400).json({ success: false, message: 'Package name cannot be empty' });
          }
          if (seenNames.has(norm)) {
            return res.status(400).json({ success: false, message: `Package name "${pkg.name.trim()}" already exists for this product.` });
          }
          seenNames.add(norm);
        }

        try {
          const ids: string[] = [];
          const productIds: string[] = [];
          const names: string[] = [];
          const amounts: number[] = [];
          const units: string[] = [];
          const prices: number[] = [];
          const compareAtPrices: (number | null)[] = [];
          const discounts: number[] = [];
          const badges: (string | null)[] = [];
          const actives: boolean[] = [];
          const displayOrders: number[] = [];

          for (let i = 0; i < data.packages.length; i++) {
            const pkg = data.packages[i];
            const pkgId = pkg.id || `${id}-pkg-${i + 1}`;

            ids.push(pkgId);
            productIds.push(id);
            names.push(pkg.name.trim());
            amounts.push(parsePackageAmount(pkg.amount || pkg.amountValue, pkg.name));
            units.push(pkg.unit || '');
            prices.push(Number(pkg.price) || 0);
            compareAtPrices.push(pkg.compareAtPrice || pkg.compare_at_price || null);
            discounts.push(pkg.discount || 0);
            badges.push(pkg.badge || null);
            actives.push(pkg.active !== false);
            displayOrders.push(pkg.displayOrder ?? i);
          }

          if (ids.length > 0) {
            await pool.query(`
              INSERT INTO product_packages (id, product_id, name, amount, unit, price, compare_at_price, discount, badge, active, display_order, created_at, updated_at)
              SELECT *, NOW(), NOW() FROM UNNEST(
                $1::text[], $2::text[], $3::text[], $4::numeric[], $5::text[],
                $6::numeric[], $7::numeric[], $8::numeric[], $9::text[], $10::boolean[], $11::integer[]
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, amount = EXCLUDED.amount, unit = EXCLUDED.unit,
                price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price,
                discount = EXCLUDED.discount, badge = EXCLUDED.badge, active = EXCLUDED.active,
                display_order = EXCLUDED.display_order, updated_at = NOW()
            `, [ids, productIds, names, amounts, units, prices, compareAtPrices, discounts, badges, actives, displayOrders]);
          }
        } catch (pkgErr: any) {
          if (pkgErr?.code === '23505' || pkgErr?.message?.includes('uq_product_packages') || pkgErr?.message?.includes('duplicate key')) {
            return res.status(409).json({ success: false, message: 'Package name already exists for this product.' });
          }
          throw pkgErr;
        }
      }

      emitGhnSyncEvent({ eventType: 'product.updated', entityType: 'products', entityId: id, safeMetadata: { action: 'create', slug } }).catch(() => {});
      invalidateRedisCache('products', { id, slug }).catch(() => {});
      return res.json({ success: true, message: 'Product created successfully', product: { id, name, slug } });
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.includes('uq_product_packages') || err?.message?.includes('duplicate key')) {
        return res.status(409).json({ success: false, message: 'Package name already exists for this product.' });
      }
      return res.status(500).json({ success: false, message: err?.message || 'Failed to create product' });
    }
  });

  // PUT /products/:id - Update product
  router.put('/products/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [id];
      let pIdx = 2;

      if (data.name !== undefined) { updates.push(`name = $${pIdx++}`); values.push(data.name); }
      if (data.slug !== undefined) { updates.push(`slug = $${pIdx++}`); values.push(data.slug); }
      if (data.description !== undefined) { updates.push(`description = $${pIdx++}`); values.push(data.description); }
      if (data.categoryId || data.category_id) { updates.push(`category_id = $${pIdx++}`); values.push(data.categoryId || data.category_id); }
      if (data.gameId || data.game_id) { updates.push(`game_id = $${pIdx++}`); values.push(data.gameId || data.game_id); }
      if (data.image || data.imageUrl || data.image_url) { updates.push(`image_url = $${pIdx++}`); values.push(data.image || data.imageUrl || data.image_url); }
      if (data.bannerImage || data.bannerUrl || data.banner_url) { updates.push(`banner_url = $${pIdx++}`); values.push(data.bannerImage || data.bannerUrl || data.banner_url); }
      if (data.featured !== undefined) { updates.push(`featured = $${pIdx++}`); values.push(Boolean(data.featured)); }
      if (data.popular !== undefined) { updates.push(`popular = $${pIdx++}`); values.push(Boolean(data.popular)); }
      if (data.active !== undefined) { updates.push(`active = $${pIdx++}`); values.push(Boolean(data.active)); }
      if (data.inStock !== undefined || data.in_stock !== undefined) { updates.push(`in_stock = $${pIdx++}`); values.push(Boolean(data.inStock ?? data.in_stock)); }
      if (data.stock !== undefined) { updates.push(`stock = $${pIdx++}`); values.push(Number(data.stock)); }
      if (data.displayOrder !== undefined || data.display_order !== undefined) { updates.push(`display_order = $${pIdx++}`); values.push(Number(data.displayOrder ?? data.display_order)); }
      if (data.requiredFields || data.required_fields) { updates.push(`required_fields = $${pIdx++}`); values.push(JSON.stringify(data.requiredFields || data.required_fields)); }

      await pool.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $1`, values);

      // If packages array is provided, sync packages
      if (Array.isArray(data.packages)) {
        // Validate duplicates within payload
        const seenNames = new Set<string>();
        for (const pkg of data.packages) {
          const norm = (pkg.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
          if (!norm) {
            return res.status(400).json({ success: false, message: 'Package name cannot be empty' });
          }
          if (seenNames.has(norm)) {
            return res.status(400).json({ success: false, message: `Package name "${pkg.name.trim()}" already exists for this product.` });
          }
          seenNames.add(norm);
        }

        try {
          const ids: string[] = [];
          const productIds: string[] = [];
          const names: string[] = [];
          const amounts: number[] = [];
          const units: string[] = [];
          const prices: number[] = [];
          const compareAtPrices: (number | null)[] = [];
          const discounts: number[] = [];
          const badges: (string | null)[] = [];
          const actives: boolean[] = [];
          const displayOrders: number[] = [];

          for (let i = 0; i < data.packages.length; i++) {
            const pkg = data.packages[i];
            const pkgId = pkg.id || `${id}-pkg-${i + 1}`;

            ids.push(pkgId);
            productIds.push(id);
            names.push(pkg.name.trim());
            amounts.push(parsePackageAmount(pkg.amount || pkg.amountValue, pkg.name));
            units.push(pkg.unit || '');
            prices.push(Number(pkg.price) || 0);
            compareAtPrices.push(pkg.compareAtPrice || pkg.compare_at_price || null);
            discounts.push(pkg.discount || 0);
            badges.push(pkg.badge || null);
            actives.push(pkg.active !== false);
            displayOrders.push(pkg.displayOrder ?? i);
          }

          if (ids.length > 0) {
            await pool.query(`
              INSERT INTO product_packages (id, product_id, name, amount, unit, price, compare_at_price, discount, badge, active, display_order, created_at, updated_at)
              SELECT *, NOW(), NOW() FROM UNNEST(
                $1::text[], $2::text[], $3::text[], $4::numeric[], $5::text[],
                $6::numeric[], $7::numeric[], $8::numeric[], $9::text[], $10::boolean[], $11::integer[]
              )
              ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, amount = EXCLUDED.amount, unit = EXCLUDED.unit,
                price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price,
                discount = EXCLUDED.discount, badge = EXCLUDED.badge, active = EXCLUDED.active,
                display_order = EXCLUDED.display_order, updated_at = NOW()
            `, [ids, productIds, names, amounts, units, prices, compareAtPrices, discounts, badges, actives, displayOrders]);
          }
        } catch (pkgErr: any) {
          if (pkgErr?.code === '23505' || pkgErr?.message?.includes('uq_product_packages') || pkgErr?.message?.includes('duplicate key')) {
            return res.status(409).json({ success: false, message: 'Package name already exists for this product.' });
          }
          throw pkgErr;
        }
      }

      emitGhnSyncEvent({ eventType: 'product.updated', entityType: 'products', entityId: id, safeMetadata: { action: 'update' } }).catch(() => {});
      invalidateRedisCache('products', { id, slug: data.slug }).catch(() => {});
      return res.json({ success: true, message: 'Product updated successfully' });
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.includes('uq_product_packages') || err?.message?.includes('duplicate key')) {
        return res.status(409).json({ success: false, message: 'Package name already exists for this product.' });
      }
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update product' });
    }
  });

  // DELETE /products/:id - Delete product
  router.delete('/products/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM product_packages WHERE product_id = $1', [id]);
      await pool.query('DELETE FROM products WHERE id = $1', [id]);
      emitGhnSyncEvent({ eventType: 'product.updated', entityType: 'products', entityId: id, safeMetadata: { action: 'delete' } }).catch(() => {});
      invalidateRedisCache('products', { id }).catch(() => {});
      return res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete product' });
    }
  });

  // Packages endpoints
  router.get('/packages', async (req: Request, res: Response) => {
    try {
      const { productId, active } = req.query;
      let q = 'SELECT * FROM product_packages';
      const params: any[] = [];
      const conditions: string[] = [];

      if (productId) {
        params.push(productId);
        conditions.push(`product_id = $${params.length}`);
      }
      if (active !== undefined) {
        params.push(String(active) === 'true' || String(active) === '1');
        conditions.push(`active = $${params.length}`);
      }

      if (conditions.length > 0) {
        q += ` WHERE ${conditions.join(' AND ')}`;
      }
      q += ' ORDER BY display_order ASC, price ASC';

      const resDb = await pool.query(q, params);
      const packages = resDb.rows.map((pkg: any) => ({
        id: pkg.id,
        productId: pkg.product_id,
        product_id: pkg.product_id,
        name: pkg.name,
        amount: Number(pkg.amount) || pkg.amount,
        unit: pkg.unit || '',
        price: Number(pkg.price) || 0,
        compareAtPrice: pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined,
        compare_at_price: pkg.compare_at_price ? Number(pkg.compare_at_price) : undefined,
        discount: Number(pkg.discount) || 0,
        badge: pkg.badge || null,
        active: pkg.active !== false,
        popular: Boolean(pkg.popular || (pkg.badge && (pkg.badge.includes('POPULAR') || pkg.badge.includes('HOT') || pkg.badge.includes('BESTSELLER')))),
        displayOrder: pkg.display_order ?? 0,
      }));
      return res.json({ success: true, packages });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch packages' });
    }
  });

  // POST /packages - Create single package with duplicate protection
  router.post('/packages', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const productId = data.productId || data.product_id;
      const rawName = (data.name || '').trim();

      if (!productId) {
        return res.status(400).json({ success: false, message: 'product_id is required' });
      }
      if (!rawName) {
        return res.status(400).json({ success: false, message: 'Package name cannot be empty' });
      }

      const normName = rawName.toLowerCase().replace(/\s+/g, ' ');

      // Check DB for existing package with same normalized name under product
      const existing = await pool.query(`
        SELECT id, name FROM product_packages 
        WHERE product_id = $1 
          AND lower(TRIM(regexp_replace(name, '\\s+', ' ', 'g'))) = $2
        LIMIT 1
      `, [productId, normName]);

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Package name "${rawName}" already exists for this product.`
        });
      }

      const pkgId = data.id || `pkg_${productId}_${Date.now()}`;
      const amount = parsePackageAmount(data.amount || data.amountValue, rawName);
      const unit = data.unit || '';
      const price = Number(data.price) || 0;
      const compareAtPrice = data.compareAtPrice || data.compare_at_price || null;
      const discount = Number(data.discount) || 0;
      const badge = data.badge || null;
      const active = data.active !== false;
      const displayOrder = data.displayOrder ?? data.display_order ?? 0;

      await pool.query(`
        INSERT INTO product_packages (id, product_id, name, amount, unit, price, compare_at_price, discount, badge, active, display_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      `, [pkgId, productId, rawName, amount, unit, price, compareAtPrice, discount, badge, active, displayOrder]);

      invalidateRedisCache('products', { id: productId }).catch(() => {});

      return res.status(201).json({
        success: true,
        message: 'Package created successfully',
        package: { id: pkgId, productId, name: rawName, price, active, displayOrder }
      });
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.includes('uq_product_packages') || err?.message?.includes('duplicate key')) {
        return res.status(409).json({ success: false, message: `Package name already exists for this product.` });
      }
      return res.status(500).json({ success: false, message: err?.message || 'Failed to create package' });
    }
  });

  // PUT /packages/:id - Update single package with duplicate protection
  router.put('/packages/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      // Find current package
      const currentRes = await pool.query('SELECT * FROM product_packages WHERE id = $1 LIMIT 1', [id]);
      if (currentRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Package not found' });
      }
      const currentPkg = currentRes.rows[0];
      const productId = data.productId || data.product_id || currentPkg.product_id;

      if (data.name !== undefined) {
        const rawName = String(data.name).trim();
        if (!rawName) {
          return res.status(400).json({ success: false, message: 'Package name cannot be empty' });
        }
        const normName = rawName.toLowerCase().replace(/\s+/g, ' ');

        const dupCheck = await pool.query(`
          SELECT id, name FROM product_packages 
          WHERE product_id = $1 
            AND id != $2
            AND lower(TRIM(regexp_replace(name, '\\s+', ' ', 'g'))) = $3
          LIMIT 1
        `, [productId, id, normName]);

        if (dupCheck.rows.length > 0) {
          return res.status(409).json({
            success: false,
            message: `Package name "${rawName}" already exists for this product.`
          });
        }
      }

      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [id];
      let pIdx = 2;

      if (data.name !== undefined) { updates.push(`name = $${pIdx++}`); values.push(String(data.name).trim()); }
      if (data.amount !== undefined) { updates.push(`amount = $${pIdx++}`); values.push(parsePackageAmount(data.amount || data.amountValue, data.name || currentPkg.name)); }
      if (data.unit !== undefined) { updates.push(`unit = $${pIdx++}`); values.push(String(data.unit)); }
      if (data.price !== undefined) { updates.push(`price = $${pIdx++}`); values.push(Number(data.price)); }
      if (data.compareAtPrice !== undefined || data.compare_at_price !== undefined) {
        updates.push(`compare_at_price = $${pIdx++}`);
        values.push(data.compareAtPrice || data.compare_at_price || null);
      }
      if (data.discount !== undefined) { updates.push(`discount = $${pIdx++}`); values.push(Number(data.discount)); }
      if (data.badge !== undefined) { updates.push(`badge = $${pIdx++}`); values.push(data.badge); }
      if (data.active !== undefined) { updates.push(`active = $${pIdx++}`); values.push(Boolean(data.active)); }
      if (data.displayOrder !== undefined || data.display_order !== undefined) {
        updates.push(`display_order = $${pIdx++}`);
        values.push(Number(data.displayOrder ?? data.display_order));
      }

      await pool.query(`UPDATE product_packages SET ${updates.join(', ')} WHERE id = $1`, values);
      invalidateRedisCache('products', { id: productId }).catch(() => {});

      return res.json({ success: true, message: 'Package updated successfully' });
    } catch (err: any) {
      if (err?.code === '23505' || err?.message?.includes('uq_product_packages') || err?.message?.includes('duplicate key')) {
        return res.status(409).json({ success: false, message: 'Package name already exists for this product.' });
      }
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update package' });
    }
  });

  // DELETE /packages/:id - Delete single package safely
  router.delete('/packages/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      // Check if historical orders reference this package
      const orderRef = await pool.query('SELECT count(*)::int as count, (SELECT product_id FROM product_packages WHERE id = $1) as product_id FROM orders WHERE package_id = $1', [id]);
      const pId = orderRef.rows[0]?.product_id;
      if (Number(orderRef.rows[0]?.count) > 0) {
        // Soft deactivate to preserve historical integrity
        await pool.query('UPDATE product_packages SET active = false, updated_at = NOW() WHERE id = $1', [id]);
        invalidateRedisCache('products', { id: pId }).catch(() => {});
        return res.json({ success: true, message: 'Package deactivated (preserved for historical orders)' });
      }

      await pool.query('DELETE FROM product_packages WHERE id = $1', [id]);
      invalidateRedisCache('products', { id: pId }).catch(() => {});
      return res.json({ success: true, message: 'Package deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete package' });
    }
  });

  // =========================================================================
  // 2. CATEGORIES
  // =========================================================================
  router.get('/categories', gatewayCache(120, ['categories']), async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM categories ORDER BY display_order ASC, name ASC');
      const categories = resDb.rows.map((c: any) => ({
        id: c.id,
        name: c.name,
        slug: c.slug || c.id,
        description: c.description || '',
        icon: c.icon || c.icon_url || 'Gamepad2',
        iconUrl: c.icon_url || c.icon || '',
        icon_url: c.icon_url || c.icon || '',
        imageUrl: c.image_url || '',
        image_url: c.image_url || '',
        active: c.active !== false,
        displayOrder: c.display_order ?? 0,
        display_order: c.display_order ?? 0,
      }));
      return res.json({ success: true, categories });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch categories' });
    }
  });

  router.post('/categories', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const id = data.id || `cat-${Date.now()}`;
      const name = data.name || 'New Category';
      const slug = data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const icon = data.icon || data.iconUrl || 'Gamepad2';
      const displayOrder = data.displayOrder ?? data.display_order ?? 0;

      await pool.query(`
        INSERT INTO categories (id, name, slug, icon, icon_url, display_order, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $4, $5, true, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = $2, slug = $3, icon = $4, icon_url = $4, display_order = $5, updated_at = NOW()
      `, [id, name, slug, icon, displayOrder]);

      emitGhnSyncEvent({ eventType: 'category.updated', entityType: 'categories', entityId: id }).catch(() => {});
      invalidateRedisCache('categories').catch(() => {});
      return res.json({ success: true, message: 'Category saved', category: { id, name, slug } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to save category' });
    }
  });

  router.put('/categories/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await pool.query(`
        UPDATE categories SET
          name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          icon = COALESCE($4, icon),
          icon_url = COALESCE($4, icon_url),
          active = COALESCE($5, active),
          display_order = COALESCE($6, display_order),
          updated_at = NOW()
        WHERE id = $1
      `, [id, data.name, data.slug, data.icon || data.iconUrl, data.active, data.displayOrder ?? data.display_order]);
      emitGhnSyncEvent({ eventType: 'category.updated', entityType: 'categories', entityId: id }).catch(() => {});
      invalidateRedisCache('categories').catch(() => {});
      return res.json({ success: true, message: 'Category updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update category' });
    }
  });

  router.delete('/categories/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
      emitGhnSyncEvent({ eventType: 'category.updated', entityType: 'categories', entityId: req.params.id }).catch(() => {});
      invalidateRedisCache('categories').catch(() => {});
      return res.json({ success: true, message: 'Category deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete category' });
    }
  });

  // =========================================================================
  // 3. GAMES
  // =========================================================================
  router.get('/games', gatewayCache(120, ['games']), async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM games ORDER BY display_order ASC, name ASC');
      const gamesList = resDb.rows.map((g: any) => ({
        id: g.id,
        name: g.name,
        slug: g.slug || g.id,
        publisher: g.publisher || '',
        description: g.description || '',
        shortDescription: g.short_description || '',
        categoryId: g.category_id,
        category_id: g.category_id,
        imageUrl: g.image_url || '',
        image_url: g.image_url || '',
        image: g.image_url || '',
        bannerUrl: g.banner_url || '',
        banner_url: g.banner_url || '',
        bannerImage: g.banner_url || '',
        platform: g.platform || '',
        region: g.region || '',
        active: g.active !== false,
        featured: Boolean(g.featured),
        displayOrder: g.display_order ?? 0,
      }));
      return res.json({ success: true, games: gamesList });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch games' });
    }
  });

  router.get('/games/:id', gatewayCache(120, ['games']), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const resDb = await pool.query('SELECT * FROM games WHERE id = $1 OR slug = $1 LIMIT 1', [id]);
      if (!resDb.rows || resDb.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Game not found' });
      }
      const g = resDb.rows[0];
      return res.json({
        success: true,
        game: {
          id: g.id,
          name: g.name,
          slug: g.slug || g.id,
          publisher: g.publisher || '',
          description: g.description || '',
          categoryId: g.category_id,
          imageUrl: g.image_url || '',
          bannerUrl: g.banner_url || '',
          active: g.active !== false,
          featured: Boolean(g.featured),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch game' });
    }
  });

  router.post('/games', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const id = data.id || `game-${Date.now()}`;
      const name = data.name || 'New Game';
      const slug = data.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const categoryId = data.categoryId || data.category_id || 'cat-mobile';
      const imageUrl = data.imageUrl || data.image_url || data.image || '';
      const bannerUrl = data.bannerUrl || data.banner_url || data.bannerImage || imageUrl;
      const publisher = data.publisher || '';
      const displayOrder = data.displayOrder ?? data.display_order ?? 0;

      await pool.query(`
        INSERT INTO games (id, name, slug, publisher, category_id, image_url, banner_url, active, display_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET name = $2, slug = $3, publisher = $4, category_id = $5, image_url = $6, banner_url = $7, display_order = $8, updated_at = NOW()
      `, [id, name, slug, publisher, categoryId, imageUrl, bannerUrl, displayOrder]);

      invalidateRedisCache('games', { id, slug }).catch(() => {});
      return res.json({ success: true, message: 'Game saved successfully', game: { id, name, slug } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to save game' });
    }
  });

  router.put('/games/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await pool.query(`
        UPDATE games SET
          name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          publisher = COALESCE($4, publisher),
          category_id = COALESCE($5, category_id),
          image_url = COALESCE($6, image_url),
          banner_url = COALESCE($7, banner_url),
          active = COALESCE($8, active),
          display_order = COALESCE($9, display_order),
          updated_at = NOW()
        WHERE id = $1
      `, [id, data.name, data.slug, data.publisher, data.categoryId || data.category_id, data.imageUrl || data.image_url || data.image, data.bannerUrl || data.banner_url, data.active, data.displayOrder ?? data.display_order]);
      invalidateRedisCache('games', { id, slug: data.slug }).catch(() => {});
      return res.json({ success: true, message: 'Game updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update game' });
    }
  });

  router.delete('/games/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM games WHERE id = $1', [req.params.id]);
      invalidateRedisCache('games', { id: req.params.id }).catch(() => {});
      return res.json({ success: true, message: 'Game deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete game' });
    }
  });

  // =========================================================================
  // 4. BANNERS
  // =========================================================================
  router.get('/banners', gatewayCache(120, ['banners']), async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM banners ORDER BY display_order ASC, sort_order ASC, created_at DESC');
      const bannersList = resDb.rows.map((b: any) => ({
        id: b.id,
        title: b.title || '',
        subtitle: b.subtitle || '',
        badge: b.badge || '',
        buttonText: b.button_text || 'View',
        button_text: b.button_text || 'View',
        type: b.type || 'general',
        actionType: b.action_type || 'link',
        action_type: b.action_type || 'link',
        actionTarget: b.action_target || '',
        action_target: b.action_target || '',
        image: b.image_url || '',
        imageUrl: b.image_url || '',
        image_url: b.image_url || '',
        mobileImageUrl: b.mobile_image_url || b.image_url || '',
        mobile_image_url: b.mobile_image_url || b.image_url || '',
        linkUrl: b.link_url || '',
        link_url: b.link_url || '',
        linkType: b.link_type || '',
        link_type: b.link_type || '',
        linkValue: b.link_value || '',
        link_value: b.link_value || '',
        productId: b.product_id || '',
        product_id: b.product_id || '',
        gameId: b.game_id || '',
        game_id: b.game_id || '',
        active: b.active !== false,
        displayOrder: b.display_order ?? b.sort_order ?? 0,
        display_order: b.display_order ?? b.sort_order ?? 0,
        sortOrder: b.sort_order ?? 0,
        sort_order: b.sort_order ?? 0,
      }));
      return res.json({ success: true, banners: bannersList });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch banners' });
    }
  });

  router.post('/banners', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const id = data.id || `banner-${Date.now()}`;
      const title = data.title || '';
      const subtitle = data.subtitle || '';
      const badge = data.badge || '';
      const buttonText = data.buttonText || data.button_text || 'View';
      const type = data.type || 'general';
      const actionType = data.actionType || data.action_type || 'link';
      const actionTarget = data.actionTarget || data.action_target || '';
      const imageUrl = data.image || data.imageUrl || data.image_url || '';
      const mobileImageUrl = data.mobileImageUrl || data.mobile_image_url || imageUrl;
      const displayOrder = data.displayOrder ?? data.display_order ?? data.sortOrder ?? 0;
      const active = data.active !== false;

      await pool.query(`
        INSERT INTO banners (id, title, subtitle, badge, button_text, type, action_type, action_target, image_url, mobile_image_url, display_order, sort_order, active, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = $2, subtitle = $3, badge = $4, button_text = $5, type = $6, action_type = $7, action_target = $8,
          image_url = $9, mobile_image_url = $10, display_order = $11, sort_order = $11, active = $12, updated_at = NOW()
      `, [id, title, subtitle, badge, buttonText, type, actionType, actionTarget, imageUrl, mobileImageUrl, displayOrder, active]);

      emitGhnSyncEvent({ eventType: 'banner.updated', entityType: 'banners', entityId: id }).catch(() => {});
      invalidateRedisCache('banners').catch(() => {});
      return res.json({ success: true, message: 'Banner saved', banner: { id, title } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to save banner' });
    }
  });

  router.put('/banners/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      await pool.query(`
        UPDATE banners SET
          title = COALESCE($2, title),
          subtitle = COALESCE($3, subtitle),
          badge = COALESCE($4, badge),
          button_text = COALESCE($5, button_text),
          type = COALESCE($6, type),
          action_type = COALESCE($7, action_type),
          action_target = COALESCE($8, action_target),
          image_url = COALESCE($9, image_url),
          mobile_image_url = COALESCE($10, mobile_image_url),
          active = COALESCE($11, active),
          display_order = COALESCE($12, display_order),
          sort_order = COALESCE($12, sort_order),
          updated_at = NOW()
        WHERE id = $1
      `, [id, data.title, data.subtitle, data.badge, data.buttonText || data.button_text, data.type, data.actionType || data.action_type, data.actionTarget || data.action_target, data.image || data.imageUrl || data.image_url, data.mobileImageUrl || data.mobile_image_url, data.active, data.displayOrder ?? data.display_order ?? data.sortOrder]);
      emitGhnSyncEvent({ eventType: 'banner.updated', entityType: 'banners', entityId: id }).catch(() => {});
      invalidateRedisCache('banners').catch(() => {});
      return res.json({ success: true, message: 'Banner updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update banner' });
    }
  });

  router.delete('/banners/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
      emitGhnSyncEvent({ eventType: 'banner.updated', entityType: 'banners', entityId: req.params.id }).catch(() => {});
      invalidateRedisCache('banners').catch(() => {});
      return res.json({ success: true, message: 'Banner deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete banner' });
    }
  });

  // =========================================================================
  // 5. OFFERS & PROMOTIONS
  // =========================================================================
  router.get('/offers', gatewayCache(120, ['offers']), async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');
      const offersList = resDb.rows.map((o: any) => ({
        id: o.id,
        title: o.title || '',
        code: o.code || '',
        discountPercent: Number(o.discount_percent) || 0,
        discount_percent: Number(o.discount_percent) || 0,
        maxDiscountAmount: Number(o.max_discount_amount) || 0,
        max_discount_amount: Number(o.max_discount_amount) || 0,
        minOrderAmount: Number(o.min_order_amount) || 0,
        min_order_amount: Number(o.min_order_amount) || 0,
        description: o.description || '',
        bannerUrl: o.banner_url || '',
        banner_url: o.banner_url || '',
        active: o.active !== false,
        expiresAt: o.expires_at,
        expires_at: o.expires_at,
      }));
      return res.json({ success: true, offers: offersList });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch offers' });
    }
  });

  router.post('/offers', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const d = req.body;
      const id = d.id || `offer-${Date.now()}`;
      await pool.query(`
        INSERT INTO offers (id, title, code, discount_percent, max_discount_amount, min_order_amount, description, banner_url, active, expires_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = $2, code = $3, discount_percent = $4, max_discount_amount = $5, min_order_amount = $6, description = $7, banner_url = $8, active = $9, expires_at = $10, updated_at = NOW()
      `, [id, d.title || '', d.code || '', Number(d.discountPercent || d.discount_percent || 0), Number(d.maxDiscountAmount || d.max_discount_amount || 0), Number(d.minOrderAmount || d.min_order_amount || 0), d.description || '', d.bannerUrl || d.banner_url || '', d.active !== false, d.expiresAt || d.expires_at || null]);
      emitGhnSyncEvent({ eventType: 'offer.updated', entityType: 'offers', entityId: id }).catch(() => {});
      invalidateRedisCache('offers').catch(() => {});
      return res.json({ success: true, message: 'Offer saved', offer: { id } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to save offer' });
    }
  });

  router.put('/offers/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const d = req.body;
      await pool.query(`
        UPDATE offers SET
          title = COALESCE($2, title),
          code = COALESCE($3, code),
          discount_percent = COALESCE($4, discount_percent),
          description = COALESCE($5, description),
          active = COALESCE($6, active),
          updated_at = NOW()
        WHERE id = $1
      `, [id, d.title, d.code, d.discountPercent || d.discount_percent, d.description, d.active]);
      emitGhnSyncEvent({ eventType: 'offer.updated', entityType: 'offers', entityId: id }).catch(() => {});
      invalidateRedisCache('offers').catch(() => {});
      return res.json({ success: true, message: 'Offer updated' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update offer' });
    }
  });

  router.delete('/offers/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM offers WHERE id = $1', [req.params.id]);
      emitGhnSyncEvent({ eventType: 'offer.updated', entityType: 'offers', entityId: req.params.id }).catch(() => {});
      invalidateRedisCache('offers').catch(() => {});
      return res.json({ success: true, message: 'Offer deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete offer' });
    }
  });

  // =========================================================================
  // 6. NEWS
  // =========================================================================
  router.get('/news', gatewayCache(120, ['news']), async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
      const newsList = resDb.rows.map((n: any) => ({
        id: n.id,
        title: n.title || '',
        slug: n.slug || n.id,
        content: n.content || '',
        summary: n.summary || '',
        category: n.category || 'General',
        imageUrl: n.image_url || '',
        image_url: n.image_url || '',
        image: n.image_url || '',
        author: n.author || 'Unx Games',
        published: n.published !== false,
        views: Number(n.views) || 0,
        createdAt: n.created_at,
        created_at: n.created_at,
      }));
      return res.json({ success: true, news: newsList });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch news' });
    }
  });

  router.post('/news', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const d = req.body;
      const id = d.id || `news-${Date.now()}`;
      const slug = d.slug || d.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || id;
      await pool.query(`
        INSERT INTO news (id, title, slug, content, summary, category, image_url, author, published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = $2, slug = $3, content = $4, summary = $5, category = $6, image_url = $7, author = $8, published = $9, updated_at = NOW()
      `, [id, d.title || '', slug, d.content || '', d.summary || '', d.category || 'General', d.imageUrl || d.image_url || d.image || '', d.author || 'Unx Games', d.published !== false]);
      emitGhnSyncEvent({ eventType: 'news.updated', entityType: 'news', entityId: id }).catch(() => {});
      invalidateRedisCache('news').catch(() => {});
      return res.json({ success: true, message: 'News article saved', news: { id } });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to save news' });
    }
  });

  router.put('/news/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const d = req.body;
      await pool.query(`
        UPDATE news SET
          title = COALESCE($2, title),
          content = COALESCE($3, content),
          summary = COALESCE($4, summary),
          category = COALESCE($5, category),
          image_url = COALESCE($6, image_url),
          published = COALESCE($7, published),
          updated_at = NOW()
        WHERE id = $1
      `, [id, d.title, d.content, d.summary, d.category, d.imageUrl || d.image_url || d.image, d.published]);
      emitGhnSyncEvent({ eventType: 'news.updated', entityType: 'news', entityId: id }).catch(() => {});
      invalidateRedisCache('news').catch(() => {});
      return res.json({ success: true, message: 'News updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update news' });
    }
  });

  router.delete('/news/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM news WHERE id = $1', [req.params.id]);
      emitGhnSyncEvent({ eventType: 'news.updated', entityType: 'news', entityId: req.params.id }).catch(() => {});
      invalidateRedisCache('news').catch(() => {});
      return res.json({ success: true, message: 'News article deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete news' });
    }
  });

  // =========================================================================
  // 7. SETTINGS & PAYMENT SETTINGS
  // =========================================================================
  router.get('/settings', async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM app_settings ORDER BY id ASC LIMIT 1');
      const row = resDb.rows[0] || {};
      let isOrdering = row.ordering_enabled !== false;
      let isMaint = Boolean(row.maintenance_mode);

      // Auto-expire scheduled maintenance if time has passed
      if (isMaint && row.maintenance_until && new Date(row.maintenance_until).getTime() <= Date.now()) {
        isMaint = false;
        await pool.query(`
          UPDATE app_settings 
          SET maintenance_mode = false, maintenance_until = null, maintenance_duration_minutes = null, updated_at = NOW() 
          WHERE id = 'default' OR id = 'global_config'
        `).catch(() => {});
        await pool.query(`
          UPDATE maintenance_settings 
          SET enabled = false, until = null, duration_minutes = null, updated_at = NOW() 
          WHERE id = 'main'
        `).catch(() => {});
      }

      if (!row.logo_url || row.logo_url.includes('Game%20Hub%20Nepal%20Logo.png') || row.logo_url.includes('Game%20Hub%20Nepal.png')) {
        pool.query(`
          UPDATE app_settings 
          SET logo_url = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
              favicon_url = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png'
          WHERE id = $1
        `, [row.id || 'default']).catch(() => {});
      }

      const settings = {
        siteName: 'Unx Games',
        site_name: 'Unx Games',
        appName: 'Unx Games',
        app_name: 'Unx Games',
        appTagline: row.app_tagline || "Nepal's #1 Trusted Gaming Top-Up Platform",
        app_tagline: row.app_tagline || "Nepal's #1 Trusted Gaming Top-Up Platform",
        companyName: row.company_name || 'intraX Pvt Ltd',
        company_name: row.company_name || 'intraX Pvt Ltd',
        legalName: 'intraX Pvt Ltd',
        legal_name: 'intraX Pvt Ltd',
        copyrightNotice: '© Unx Games By intraX Pvt Ltd',
        copyright_notice: '© Unx Games By intraX Pvt Ltd',
        brandCompanyLine: 'Unx Games By intraX Pvt Ltd',
        emailFooter: 'Unx Games By intraX Pvt Ltd',
        companyAddress: row.company_address || 'Deelasaini-6, Baitadi, Nepal',
        company_address: row.company_address || 'Deelasaini-6, Baitadi, Nepal',
        contactEmail: row.contact_email || row.support_email || 'hii.binodthalal@gmail.com',
        contact_email: row.contact_email || row.support_email || 'hii.binodthalal@gmail.com',
        supportEmail: row.support_email || row.contact_email || 'hii.binodthalal@gmail.com',
        support_email: row.support_email || row.contact_email || 'hii.binodthalal@gmail.com',
        contactPhone: row.contact_phone || row.support_phone || '9768914027',
        contact_phone: row.contact_phone || row.support_phone || '9768914027',
        supportPhone: row.support_phone || row.contact_phone || '9768914027',
        support_phone: row.support_phone || row.contact_phone || '9768914027',
        whatsappNumber: row.whatsapp_number || '9768914027',
        whatsapp_number: row.whatsapp_number || '9768914027',
        viberNumber: row.viber_number || '9768914027',
        viber_number: row.viber_number || '9768914027',
        logoUrl: (row.logo_url && !row.logo_url.includes('Game%20Hub%20Nepal%20Logo.png') && !row.logo_url.includes('Game%20Hub%20Nepal.png')) ? row.logo_url : 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
        logo_url: (row.logo_url && !row.logo_url.includes('Game%20Hub%20Nepal%20Logo.png') && !row.logo_url.includes('Game%20Hub%20Nepal.png')) ? row.logo_url : 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
        faviconUrl: (row.favicon_url && !row.favicon_url.includes('Game%20Hub%20Nepal%20Logo.png') && !row.favicon_url.includes('Game%20Hub%20Nepal.png')) ? row.favicon_url : 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
        favicon_url: (row.favicon_url && !row.favicon_url.includes('Game%20Hub%20Nepal%20Logo.png') && !row.favicon_url.includes('Game%20Hub%20Nepal.png')) ? row.favicon_url : 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev/App%20Logo/unx.png',
        maintenanceUntil: isMaint ? (row.maintenance_until || null) : null,
        maintenance_until: isMaint ? (row.maintenance_until || null) : null,
        maintenanceDurationMinutes: isMaint ? (row.maintenance_duration_minutes || null) : null,
        maintenance_duration_minutes: isMaint ? (row.maintenance_duration_minutes || null) : null,
        maintenanceMessage: row.maintenance_message || '',
        maintenance_message: row.maintenance_message || '',
        allowRegistration: row.allow_registration !== false,
        currency: row.currency || 'NPR',
        currencySymbol: row.currency_symbol || 'Rs.',
        deliveryNotice: row.delivery_notice || '',
        r2BucketName: row.r2_bucket_name || process.env.R2_BUCKET_NAME || '',
        r2PublicDomain: row.r2_public_domain || process.env.R2_PUBLIC_DOMAIN || '',
        termsAndConditions: row.terms_and_conditions || '',
        privacyPolicy: row.privacy_policy || '',
        businessRegistrationNumber: row.business_registration_number || '',
        businessPan: row.business_pan || '',
        vatNumber: row.vat_number || '',
        complaintContact: row.complaint_contact || '',
        responsibleBusinessInfo: row.responsible_business_info || '',
        ...row,
        orderingEnabled: isOrdering,
        ordering_enabled: isOrdering,
        maintenanceMode: isMaint,
        maintenance_mode: isMaint,
      };
      return res.json({ success: true, appSettings: settings, settings });
    } catch (err: any) {
      return res.json({ 
        success: true, 
        appSettings: { orderingEnabled: true, ordering_enabled: true, maintenanceMode: false, maintenance_mode: false }, 
        settings: { orderingEnabled: true, ordering_enabled: true, maintenanceMode: false, maintenance_mode: false } 
      });
    }
  });

  router.put('/settings', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const updates = req.body || {};
      const currentRes = await pool.query('SELECT * FROM app_settings WHERE id = $1 LIMIT 1', ['default']).catch(() => ({ rows: [] }));
      const curr = currentRes.rows[0] || {};

      const siteName = updates.siteName || updates.site_name || curr.site_name;
      const contactEmail = updates.contactEmail || updates.contact_email || updates.supportEmail || updates.support_email || curr.contact_email;
      const contactPhone = updates.contactPhone || updates.contact_phone || updates.supportPhone || updates.support_phone || curr.contact_phone;
      const whatsapp = updates.whatsappNumber || updates.whatsapp_number || curr.whatsapp_number;
      const viber = updates.viberNumber || updates.viber_number || curr.viber_number;
      
      const maintenance = updates.maintenanceMode !== undefined 
        ? Boolean(updates.maintenanceMode) 
        : (updates.maintenance_mode !== undefined 
          ? Boolean(updates.maintenance_mode) 
          : Boolean(curr.maintenance_mode));
      
      const maintenanceMsg = updates.maintenanceMessage !== undefined
        ? updates.maintenanceMessage
        : (updates.maintenance_message !== undefined
          ? updates.maintenance_message
          : (curr.maintenance_message || 'Top-up service is temporarily unavailable due to scheduled maintenance.'));

      const orderingEnabled = updates.orderingEnabled !== undefined 
        ? Boolean(updates.orderingEnabled) 
        : (updates.ordering_enabled !== undefined 
          ? Boolean(updates.ordering_enabled) 
          : (curr.ordering_enabled !== false));

      const untilVal = updates.maintenanceUntil !== undefined
        ? updates.maintenanceUntil
        : (updates.maintenance_until !== undefined
          ? updates.maintenance_until
          : (curr.maintenance_until || null));

      const durMins = updates.maintenanceDurationMinutes !== undefined
        ? (updates.maintenanceDurationMinutes ? Number(updates.maintenanceDurationMinutes) : null)
        : (updates.maintenance_duration_minutes !== undefined
          ? (updates.maintenance_duration_minutes ? Number(updates.maintenance_duration_minutes) : null)
          : (curr.maintenance_duration_minutes || null));

      await pool.query(`
        INSERT INTO app_settings (id, site_name, contact_email, support_email, contact_phone, support_phone, whatsapp_number, viber_number, maintenance_mode, maintenance_message, ordering_enabled, maintenance_until, maintenance_duration_minutes, updated_at)
        VALUES ('default', $1, $2, $2, $3, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (id) DO UPDATE SET
          site_name = COALESCE($1, app_settings.site_name),
          contact_email = COALESCE($2, app_settings.contact_email),
          support_email = COALESCE($2, app_settings.support_email),
          contact_phone = COALESCE($3, app_settings.contact_phone),
          support_phone = COALESCE($3, app_settings.support_phone),
          whatsapp_number = COALESCE($4, app_settings.whatsapp_number),
          viber_number = COALESCE($5, app_settings.viber_number),
          maintenance_mode = $6,
          maintenance_message = COALESCE($7, app_settings.maintenance_message),
          ordering_enabled = $8,
          maintenance_until = $9,
          maintenance_duration_minutes = $10,
          updated_at = NOW()
      `, [siteName, contactEmail, contactPhone, whatsapp, viber, maintenance, maintenanceMsg, orderingEnabled, untilVal, durMins]);

      // Keep secondary global_config row in sync
      await pool.query(`
        UPDATE app_settings 
        SET ordering_enabled = $1, maintenance_mode = $2, maintenance_message = $3, maintenance_until = $4, maintenance_duration_minutes = $5, updated_at = NOW() 
        WHERE id = 'global_config'
      `, [orderingEnabled, maintenance, maintenanceMsg, untilVal, durMins]).catch(() => {});

      if (
        updates.businessRegistrationNumber !== undefined || 
        updates.businessPan !== undefined || 
        updates.vatNumber !== undefined || 
        updates.complaintContact !== undefined || 
        updates.responsibleBusinessInfo !== undefined ||
        updates.r2_account_id !== undefined ||
        updates.r2AccountId !== undefined ||
        updates.r2_bucket_name !== undefined ||
        updates.r2BucketName !== undefined ||
        updates.r2_public_domain !== undefined ||
        updates.r2PublicDomain !== undefined ||
        updates.r2_access_key_id !== undefined ||
        updates.r2AccessKeyId !== undefined ||
        updates.r2_secret_access_key !== undefined ||
        updates.r2SecretAccessKey !== undefined
      ) {
        const r2Acc = updates.r2_account_id ?? updates.r2AccountId;
        const r2Bucket = updates.r2_bucket_name ?? updates.r2BucketName;
        const r2Dom = updates.r2_public_domain ?? updates.r2PublicDomain;
        const r2Key = updates.r2_access_key_id ?? updates.r2AccessKeyId;
        const r2Sec = updates.r2_secret_access_key ?? updates.r2SecretAccessKey;

        await pool.query(`
          UPDATE app_settings 
          SET 
            business_registration_number = COALESCE($1, business_registration_number),
            business_pan = COALESCE($2, business_pan),
            vat_number = COALESCE($3, vat_number),
            complaint_contact = COALESCE($4, complaint_contact),
            responsible_business_info = COALESCE($5, responsible_business_info),
            r2_account_id = COALESCE($6, r2_account_id),
            r2_bucket_name = COALESCE($7, r2_bucket_name),
            r2_public_domain = COALESCE($8, r2_public_domain),
            r2_access_key_id = COALESCE($9, r2_access_key_id),
            r2_secret_access_key = COALESCE($10, r2_secret_access_key),
            updated_at = NOW()
          WHERE id IN ('default', 'global_config')
        `, [
          updates.businessRegistrationNumber ?? null,
          updates.businessPan ?? null,
          updates.vatNumber ?? null,
          updates.complaintContact ?? null,
          updates.responsibleBusinessInfo ?? null,
          r2Acc !== undefined ? (r2Acc ? String(r2Acc).trim() : null) : null,
          r2Bucket !== undefined ? (r2Bucket ? String(r2Bucket).trim() : null) : null,
          r2Dom !== undefined ? (r2Dom ? String(r2Dom).trim().replace(/\/$/, '') : null) : null,
          r2Key !== undefined ? (r2Key ? String(r2Key).trim() : null) : null,
          r2Sec !== undefined ? (r2Sec ? String(r2Sec).trim() : null) : null,
        ]).catch(() => {});

        resetR2Client();
      }

      // Keep maintenance_settings in sync
      await pool.query(`
        INSERT INTO maintenance_settings (id, enabled, message, until, duration_minutes, updated_at, updated_by)
        VALUES ('main', $1, $2, $3, $4, NOW(), 'admin')
        ON CONFLICT (id) DO UPDATE SET enabled = $1, message = $2, until = $3, duration_minutes = $4, updated_at = NOW()
      `, [maintenance, maintenanceMsg || 'Top-up service is temporarily unavailable due to maintenance.', untilVal, durMins || 0]).catch(() => {});

      return res.json({ 
        success: true, 
        message: 'Settings updated successfully', 
        appSettings: { 
          ...curr,
          ...updates, 
          orderingEnabled, 
          ordering_enabled: orderingEnabled, 
          maintenanceMode: maintenance, 
          maintenance_mode: maintenance,
          maintenanceUntil: untilVal,
          maintenance_until: untilVal,
          maintenanceDurationMinutes: durMins,
          maintenance_duration_minutes: durMins,
        } 
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update settings' });
    }
  });

  // Dedicated Store Online/Offline & Maintenance Status API
  router.get('/settings/store-status', async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT ordering_enabled, maintenance_mode, maintenance_message, maintenance_until, maintenance_duration_minutes FROM app_settings ORDER BY id ASC LIMIT 1');
      const row = resDb.rows[0] || {};
      let orderingEnabled = row.ordering_enabled !== false;
      let maintenanceMode = Boolean(row.maintenance_mode);

      // Auto-expire scheduled maintenance if time has passed
      if (maintenanceMode && row.maintenance_until && new Date(row.maintenance_until).getTime() <= Date.now()) {
        maintenanceMode = false;
        await pool.query(`
          UPDATE app_settings 
          SET maintenance_mode = false, maintenance_until = null, maintenance_duration_minutes = null, updated_at = NOW() 
          WHERE id = 'default' OR id = 'global_config'
        `).catch(() => {});
        await pool.query(`
          UPDATE maintenance_settings 
          SET enabled = false, until = null, duration_minutes = null, updated_at = NOW() 
          WHERE id = 'main'
        `).catch(() => {});
      }

      const isOnline = orderingEnabled && !maintenanceMode;

      return res.json({
        success: true,
        isOnline,
        orderingEnabled,
        ordering_enabled: orderingEnabled,
        maintenanceMode,
        maintenance_mode: maintenanceMode,
        maintenanceMessage: row.maintenance_message || '',
        maintenanceUntil: maintenanceMode ? (row.maintenance_until || null) : null,
        maintenance_until: maintenanceMode ? (row.maintenance_until || null) : null,
        maintenanceDurationMinutes: maintenanceMode ? (row.maintenance_duration_minutes || null) : null,
        maintenance_duration_minutes: maintenanceMode ? (row.maintenance_duration_minutes || null) : null,
        serverTime: new Date().toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err?.message || 'Failed to fetch store status'
      });
    }
  });

  router.post('/settings/store-status', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { isOnline, orderingEnabled: reqOrdering, maintenanceMode: reqMaint, maintenanceMessage, durationMinutes, until, maintenanceUntil, adminInfo } = req.body;
      
      const currentRes = await pool.query('SELECT ordering_enabled, maintenance_mode, maintenance_message, maintenance_until, maintenance_duration_minutes FROM app_settings WHERE id = $1 LIMIT 1', ['default']);
      const currentRow = currentRes.rows[0] || {};
      
      let targetOrdering: boolean = currentRow.ordering_enabled !== false;
      let targetMaintenance: boolean = Boolean(currentRow.maintenance_mode);
      let msg: string = currentRow.maintenance_message || 'Top-up service is temporarily unavailable due to scheduled maintenance.';
      let untilDate = currentRow.maintenance_until || null;
      let durMins = currentRow.maintenance_duration_minutes || null;

      // 1. Direct 1-Click Store Online / Offline Toggle
      if (isOnline !== undefined && reqOrdering === undefined && reqMaint === undefined) {
        if (isOnline === true) {
          // Turning Store ONLINE: Ensure Ordering is ON and Maintenance is completely OFF
          targetOrdering = true;
          targetMaintenance = false;
          untilDate = null;
          durMins = null;
        } else {
          // Turning Store OFFLINE: Pause Ordering
          targetOrdering = false;
        }
      }

      // 2. Explicit Ordering Status Update
      if (reqOrdering !== undefined) {
        targetOrdering = Boolean(reqOrdering);
        if (targetOrdering && reqMaint === undefined) {
          // When turning ordering ON, also ensure maintenance doesn't inadvertently block it
          targetMaintenance = false;
          untilDate = null;
          durMins = null;
        }
      }

      // 3. Explicit Maintenance Mode Update
      if (reqMaint !== undefined) {
        targetMaintenance = Boolean(reqMaint);
        if (maintenanceMessage !== undefined) {
          msg = String(maintenanceMessage).trim() || msg;
        }
        if (targetMaintenance) {
          const rawDur = durationMinutes !== undefined ? Number(durationMinutes) : (durMins !== null ? Number(durMins) : 0);
          if (rawDur > 0) {
            durMins = rawDur;
            untilDate = new Date(Date.now() + rawDur * 60000).toISOString();
          } else {
            durMins = 0;
            untilDate = null;
          }
          if (until || maintenanceUntil) {
            untilDate = (until || maintenanceUntil);
          }
        } else {
          untilDate = null;
          durMins = null;
        }
      }

      // Sync across all app_settings rows
      await pool.query(`
        INSERT INTO app_settings (id, ordering_enabled, maintenance_mode, maintenance_message, maintenance_until, maintenance_duration_minutes, updated_at)
        VALUES ('default', $1, $2, $3, $4, $5, NOW())
        ON CONFLICT (id) DO UPDATE SET 
          ordering_enabled = $1, 
          maintenance_mode = $2, 
          maintenance_message = $3, 
          maintenance_until = $4, 
          maintenance_duration_minutes = $5,
          updated_at = NOW()
      `, [targetOrdering, targetMaintenance, msg, untilDate, durMins]);

      await pool.query(`
        UPDATE app_settings 
        SET ordering_enabled = $1, maintenance_mode = $2, maintenance_message = $3, maintenance_until = $4, maintenance_duration_minutes = $5, updated_at = NOW()
        WHERE id = 'global_config'
      `, [targetOrdering, targetMaintenance, msg, untilDate, durMins]).catch(() => {});

      // Sync maintenance_settings
      await pool.query(`
        INSERT INTO maintenance_settings (id, enabled, message, until, duration_minutes, updated_at, updated_by)
        VALUES ('main', $1, $2, $3, $4, NOW(), $5)
        ON CONFLICT (id) DO UPDATE SET 
          enabled = $1, 
          message = $2, 
          until = $3, 
          duration_minutes = $4, 
          updated_at = NOW(),
          updated_by = $5
      `, [targetMaintenance, msg, untilDate, durMins || 0, adminInfo?.email || req.user?.email || 'admin']).catch(() => {});

      // Record in audit_logs
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let actionName = 'STORE_STATUS_UPDATED';
      if (reqOrdering !== undefined && reqMaint === undefined) {
        actionName = targetOrdering ? 'ORDERING_SET_ONLINE' : 'ORDERING_SET_OFFLINE';
      } else if (reqMaint !== undefined && reqOrdering === undefined) {
        actionName = targetMaintenance ? 'MAINTENANCE_SET_ACTIVE' : 'MAINTENANCE_SET_INACTIVE';
      } else if (isOnline !== undefined) {
        actionName = isOnline ? 'STORE_SET_ONLINE' : 'STORE_SET_OFFLINE';
      }
      await pool.query(`
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        auditId,
        req.user?.id || adminInfo?.uid || 'ADMIN',
        req.user?.role || 'ADMIN',
        actionName,
        'app_settings',
        'default',
        JSON.stringify({
          isOnline: targetOrdering && !targetMaintenance,
          orderingEnabled: targetOrdering,
          maintenanceMode: targetMaintenance,
          maintenanceMessage: msg,
          until: untilDate,
          durationMinutes: durMins,
          adminEmail: req.user?.email || adminInfo?.email,
          updatedAt: new Date().toISOString()
        })
      ]).catch(() => {});

      const computedOnline = targetOrdering && !targetMaintenance;
      emitGhnSyncEvent({
        eventType: 'settings.updated',
        entityType: 'app_settings',
        safeMetadata: { isOnline: computedOnline, orderingEnabled: targetOrdering, maintenanceMode: targetMaintenance }
      }).catch(() => {});

      return res.json({
        success: true,
        isOnline: computedOnline,
        orderingEnabled: targetOrdering,
        ordering_enabled: targetOrdering,
        maintenanceMode: targetMaintenance,
        maintenance_mode: targetMaintenance,
        maintenanceMessage: msg,
        maintenanceUntil: untilDate,
        maintenance_until: untilDate,
        maintenanceDurationMinutes: durMins,
        maintenance_duration_minutes: durMins,
        message: computedOnline 
          ? 'Store ordering is ONLINE.' 
          : (targetMaintenance ? 'Maintenance mode active.' : 'Store ordering is OFFLINE / PAUSED.')
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update store status' });
    }
  });

  router.get('/payment-settings', gatewayCache(120, ['settings']), async (_req: Request, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM payment_settings ORDER BY id ASC LIMIT 1');
      const row = resDb.rows[0] || {};
      const formatted = {
        esewaEnabled: row.esewa_enabled ?? true,
        esewaId: row.esewa_id ?? '',
        esewaQR: row.esewa_qr ?? '',
        esewaName: row.esewa_name ?? '',
        esewaInstructions: row.esewa_instructions ?? '',
        khaltiEnabled: row.khalti_enabled ?? true,
        khaltiId: row.khalti_id ?? '',
        khaltiQR: row.khalti_qr ?? '',
        khaltiName: row.khalti_name ?? '',
        khaltiInstructions: row.khalti_instructions ?? '',
        imepayEnabled: row.imepay_enabled ?? true,
        imepayId: row.imepay_id ?? '',
        imepayName: row.imepay_name ?? '',
        imepayInstructions: row.imepay_instructions ?? '',
        bankTransferEnabled: row.bank_transfer_enabled ?? true,
        bankName: row.bank_name ?? '',
        bankAccountName: row.bank_account_name ?? '',
        bankAccountNumber: row.bank_account_number ?? '',
        bankBranch: row.bank_branch ?? '',
      };
      return res.json({ success: true, paymentSettings: formatted });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch payment settings' });
    }
  });

  router.put('/payment-settings', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const d = req.body;
      await pool.query(`
        INSERT INTO payment_settings (id, esewa_enabled, esewa_id, esewa_qr, esewa_name, esewa_instructions, khalti_enabled, khalti_id, khalti_qr, khalti_name, khalti_instructions, imepay_enabled, imepay_id, imepay_name, imepay_instructions, bank_transfer_enabled, bank_name, bank_account_name, bank_account_number, bank_branch, updated_at)
        VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
        ON CONFLICT (id) DO UPDATE SET
          esewa_enabled = $1, esewa_id = $2, esewa_qr = $3, esewa_name = $4, esewa_instructions = $5,
          khalti_enabled = $6, khalti_id = $7, khalti_qr = $8, khalti_name = $9, khalti_instructions = $10,
          imepay_enabled = $11, imepay_id = $12, imepay_name = $13, imepay_instructions = $14,
          bank_transfer_enabled = $15, bank_name = $16, bank_account_name = $17, bank_account_number = $18, bank_branch = $19, updated_at = NOW()
      `, [
        d.esewaEnabled ?? true, d.esewaId ?? '', d.esewaQR ?? '', d.esewaName ?? '', d.esewaInstructions ?? '',
        d.khaltiEnabled ?? true, d.khaltiId ?? '', d.khaltiQR ?? '', d.khaltiName ?? '', d.khaltiInstructions ?? '',
        d.imepayEnabled ?? true, d.imepayId ?? '', d.imepayName ?? '', d.imepayInstructions ?? '',
        d.bankTransferEnabled ?? true, d.bankName ?? '',
        d.bankAccountName ?? '', d.bankAccountNumber ?? '',
        d.bankBranch ?? ''
      ]);
      emitGhnSyncEvent({
        eventType: 'payment_settings.updated',
        entityType: 'payment_settings',
      }).catch(() => {});
      invalidateRedisCache('settings').catch(() => {});
      return res.json({ success: true, message: 'Payment settings updated successfully', paymentSettings: d });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update payment settings' });
    }
  });

  // =========================================================================
  // 8. CANCELLATIONS & REFUNDS
  // =========================================================================
  router.get('/cancellations', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const resDb = await pool.query('SELECT * FROM cancellation_requests ORDER BY created_at DESC');
      return res.json({ success: true, cancellations: resDb.rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch cancellations' });
    }
  });

  router.post('/cancellations', optionalUser, async (req: AuthRequest, res: Response) => {
    try {
      const { orderId, reason, note, refundDetails } = req.body;
      const customerId = req.user?.id || '00000000-0000-0000-0000-000000000000';
      const refMethod = refundDetails?.method || 'wallet';
      const refDetails = JSON.stringify(refundDetails || {});

      // Call Canonical Supabase RPC procedure
      const rpcRes = await rpcRequestCancellation({
        orderId,
        customerId,
        reason: reason || note || 'Customer requested order cancellation',
        refundMethod: refMethod,
        refundDetails: refDetails
      });

      if (!rpcRes.success) {
        return res.status(400).json({ success: false, message: rpcRes.message || 'Failed to request cancellation' });
      }

      const cancId = rpcRes.data?.cancellationId || `canc_${Date.now()}`;

      emitGhnSyncEvent({
        eventType: 'cancellation.requested',
        entityType: 'cancellations',
        entityId: cancId,
        userId: customerId,
        safeMetadata: { orderId, reason }
      }).catch(() => {});

      return res.json({ success: true, message: 'Cancellation request submitted', id: cancId });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to request cancellation' });
    }
  });

  router.put('/cancellations/:id/approve', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { adminNote } = req.body;
      const staffEmail = req.user?.email || 'admin';

      // Call Canonical Supabase RPC procedure
      const rpcRes = await rpcResolveCancellation({
        cancellationId: id,
        action: 'approve',
        adminId: staffEmail,
        notes: adminNote || 'Cancellation approved by staff'
      });

      if (!rpcRes.success) {
        return res.status(400).json({ success: false, message: rpcRes.message || 'Failed to approve cancellation' });
      }

      emitGhnSyncEvent({
        eventType: 'cancellation.approved',
        entityType: 'cancellations',
        entityId: id,
        safeMetadata: { action: 'approve', resolvedBy: staffEmail }
      }).catch(() => {});

      return res.json({ success: true, message: 'Cancellation approved' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to approve cancellation' });
    }
  });

  router.put('/cancellations/:id/reject', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { reason, adminNote } = req.body;
      const staffEmail = req.user?.email || 'admin';

      // Call Canonical Supabase RPC procedure
      const rpcRes = await rpcResolveCancellation({
        cancellationId: id,
        action: 'reject',
        adminId: staffEmail,
        notes: adminNote || reason || 'Cancellation rejected'
      });

      if (!rpcRes.success) {
        return res.status(400).json({ success: false, message: rpcRes.message || 'Failed to reject cancellation' });
      }

      emitGhnSyncEvent({
        eventType: 'cancellation.rejected',
        entityType: 'cancellations',
        entityId: id,
        safeMetadata: { action: 'reject', resolvedBy: staffEmail }
      }).catch(() => {});

      return res.json({ success: true, message: 'Cancellation rejected' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to reject cancellation' });
    }
  });

  router.post('/cancellations/:id/refund', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const d = req.body;
      const staffEmail = req.user?.email || 'admin';
      const numAmount = Number(d.amount || 0);

      // Locate cancellation request to get orderId & customerId
      const cancRes = await pool.query('SELECT * FROM cancellation_requests WHERE id = $1 LIMIT 1', [id]);
      if (cancRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Cancellation request not found' });
      }
      const canc = cancRes.rows[0];

      // Call Canonical Supabase RPC procedure for refund
      const rpcRes = await rpcProcessRefund({
        orderId: canc.order_id,
        customerId: canc.customer_id,
        amount: numAmount,
        reason: d.reason || 'Order cancellation refund',
        processedBy: staffEmail,
        method: canc.refund_method || 'WALLET'
      });

      if (!rpcRes.success) {
        return res.status(400).json({ success: false, message: rpcRes.message || 'Failed to process refund' });
      }

      await pool.query(`
        UPDATE cancellation_requests
        SET refund_status = 'completed', refund_amount = $2, refund_proof_url = $3, resolved_at = NOW()
        WHERE id = $1
      `, [id, numAmount, d.proofUrl || '']);

      emitGhnSyncEvent({
        eventType: 'refund.processed',
        entityType: 'refunds',
        entityId: rpcRes.data?.refundId || id,
        userId: canc.customer_id,
        safeMetadata: { orderId: canc.order_id, amount: numAmount }
      }).catch(() => {});

      return res.json({ success: true, message: 'Refund processed successfully', refund: rpcRes.data });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to process refund' });
    }
  });

  // =========================================================================
  // 9. ORDERS ACTIONS & ADMIN (Handled primarily by handleUpdateOrderStatus in routes.ts)
  // =========================================================================

  // POST /orders/:id/resubmit-payment
  router.post('/orders/:id/resubmit-payment', optionalUser, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { transactionId, paymentScreenshot, paymentScreenshotR2Key, paymentMethod, resubmitNote } = req.body;

      await pool.query(`
        UPDATE orders
        SET payment_status = 'pending_verification',
            order_status = 'payment_verification',
            notes = COALESCE(notes, '') || E'\\n' || $2,
            updated_at = NOW()
        WHERE id = $1 OR order_code = $1
      `, [id, `[Payment Resubmitted]: TxID: ${transactionId || 'N/A'}, Method: ${paymentMethod || 'N/A'}, Note: ${resubmitNote || 'None'}`]);

      // Record in payments table if possible
      const pId = `pay_${Date.now()}`;
      await pool.query(`
        INSERT INTO payments (id, order_id, transaction_id, method, payment_status, proof_url, proof_r2_key, customer_note, submitted_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'pending_verification', $5, $6, $7, NOW(), NOW(), NOW())
      `, [pId, id, transactionId || '', paymentMethod || 'esewa', paymentScreenshot || '', paymentScreenshotR2Key || '', resubmitNote || '']);

      // Insert Admin Notification
      try {
        const adminNotifId = `notif_admin_pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        try {
          await pool.query(
            `INSERT INTO notifications (id, order_id, recipient_uid, recipient_role, title, message, type, read, action_url, created_at)
             VALUES ($1, $2, 'admin', 'ADMIN', $3, $4, 'payment_verification', false, '/admin/payments', NOW())`,
            [adminNotifId, id, `Payment Resubmitted: #${id} 💳`, `Payment verification details resubmitted for Order #${id}. Ref/TxID: ${transactionId || 'N/A'}.`]
          );
        } catch (e1) {
          await pool.query(
            `INSERT INTO notifications (id, order_id, recipient_uid, recipient_role, title, message, type, read, created_at)
             VALUES ($1, $2, 'admin', 'ADMIN', $3, $4, 'payment_verification', false, NOW())`,
            [adminNotifId, id, `Payment Resubmitted: #${id} 💳`, `Payment verification details resubmitted for Order #${id}. Ref/TxID: ${transactionId || 'N/A'}.`]
          ).catch(() => {});
        }
      } catch (nErr) {}

      return res.json({ success: true, message: 'Payment details resubmitted successfully for review!' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to resubmit payment' });
    }
  });

  // POST /orders/public-lookup
  router.post('/orders/public-lookup', async (req: Request, res: Response) => {
    try {
      const { orderCode, playerId, email } = req.body;
      const conds: string[] = [];
      const values: any[] = [];
      let pIdx = 1;

      if (orderCode) {
        conds.push(`(id = $${pIdx} OR order_code = $${pIdx} OR order_number = $${pIdx})`);
        values.push(String(orderCode).trim());
        pIdx++;
      }
      if (email) {
        conds.push(`LOWER(customer_email_snapshot) = LOWER($${pIdx})`);
        values.push(String(email).trim());
        pIdx++;
      }
      if (playerId) {
        conds.push(`game_uid = $${pIdx}`);
        values.push(String(playerId).trim());
        pIdx++;
      }

      if (conds.length === 0) {
        return res.status(400).json({ success: false, message: 'Please provide an Order Code, Email, or Player ID.' });
      }

      const resDb = await pool.query(`
        SELECT * FROM orders WHERE ${conds.join(' AND ')} ORDER BY created_at DESC LIMIT 10
      `, values);

      return res.json({ success: true, orders: resDb.rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to lookup order' });
    }
  });

  // (GET /orders/:id/history is fully implemented and handled by apiRouter.get('/orders/:id/history') in routes.ts)

  // DELETE /orders/:id
  router.delete('/orders/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM payments WHERE order_id = $1', [id]);
      await pool.query('DELETE FROM cancellation_requests WHERE order_id = $1', [id]);
      await pool.query('DELETE FROM orders WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete order' });
    }
  });

  // POST /orders/bulk-delete
  router.post('/orders/bulk-delete', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { orderIds } = req.body;
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No order IDs provided' });
      }
      await pool.query('DELETE FROM payments WHERE order_id = ANY($1)', [orderIds]);
      await pool.query('DELETE FROM cancellation_requests WHERE order_id = ANY($1)', [orderIds]);
      const result = await pool.query('DELETE FROM orders WHERE id = ANY($1)', [orderIds]);
      return res.json({ success: true, count: result.rowCount, message: `Deleted ${result.rowCount} orders.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to bulk delete orders' });
    }
  });

  // DELETE /orders - Clear all orders
  router.delete('/orders', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM payments');
      await pool.query('DELETE FROM cancellation_requests');
      const result = await pool.query('DELETE FROM orders');
      return res.json({ success: true, count: result.rowCount, message: 'All orders cleared.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to clear orders' });
    }
  });

  // =========================================================================
  // 10. PAYMENTS (ADMIN)
  // =========================================================================
  router.get('/admin/payments', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const resDb = await pool.query(`
        SELECT p.*, o.order_number, o.customer_name_snapshot, o.total_amount as order_total
        FROM payments p
        LEFT JOIN orders o ON p.order_id = o.id
        ORDER BY p.created_at DESC
      `);
      return res.json({ success: true, payments: resDb.rows });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch payments' });
    }
  });

  router.put('/admin/payments/:id/verify', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const staffEmail = req.user?.email || 'admin';

      const payRes = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
      if (payRes.rows.length > 0) {
        const payRow = payRes.rows[0];
        const orderId = payRow.order_id;
        const customerId = payRow.customer_id;

        await pool.query(`
          UPDATE payments SET payment_status = 'verified', status = 'verified', verified_at = NOW(), verified_by = $2, updated_at = NOW()
          WHERE id = $1
        `, [id, staffEmail]);

        let orderCode = orderId || id;
        if (orderId) {
          const ordRes = await pool.query(`
            UPDATE orders SET payment_status = 'verified', order_status = 'processing', updated_at = NOW()
            WHERE id = $1 OR order_code = $1 OR order_number = $1
            RETURNING *
          `, [orderId]);
          if (ordRes.rows && ordRes.rows[0]) {
            orderCode = ordRes.rows[0].order_code || ordRes.rows[0].order_number || ordRes.rows[0].id;
          }
        }

        // 1. Auto-clear Admin Payment & Order Notifications for this order
        try {
          await pool.query(`
            UPDATE notifications 
            SET read = true 
            WHERE (order_id = $1 OR order_id = $2 OR LOWER(title) LIKE '%' || LOWER($2) || '%')
              AND (recipient_role IN ('ADMIN', 'admin', 'STAFF', 'staff') OR recipient_uid = 'admin' OR type = 'payment_verification')
          `, [orderId, orderCode]);
        } catch (clearErr) {
          console.warn('[Payments API] Admin notification clear warning:', clearErr);
        }

        // 2. Notify User about Payment Verification & Processing Status
        try {
          const targetUid = customerId || payRow.user_id;
          if (targetUid && targetUid !== '00000000-0000-0000-0000-000000000000') {
            const userNotifId = `notif_usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            try {
              await pool.query(`
                INSERT INTO notifications (id, order_id, customer_id, recipient_uid, recipient_role, title, message, type, read, action_url, created_at)
                VALUES ($1, $2, $3, $3, 'USER', $4, $5, 'order', false, '/orders', NOW())
              `, [
                userNotifId,
                orderId,
                targetUid,
                `Payment Verified: #${orderCode} 💳`,
                `Your payment for Order #${orderCode} has been verified by Admin. Status: Processing.`
              ]);
            } catch (e1) {
              await pool.query(`
                INSERT INTO notifications (id, order_id, customer_id, recipient_uid, recipient_role, title, message, type, read, created_at)
                VALUES ($1, $2, $3, $3, 'USER', $4, $5, 'order', false, NOW())
              `, [
                userNotifId,
                orderId,
                targetUid,
                `Payment Verified: #${orderCode} 💳`,
                `Your payment for Order #${orderCode} has been verified by Admin. Status: Processing.`
              ]).catch(() => {});
            }
          }
        } catch (usrErr) {
          console.warn('[Payments API] Customer notification warning:', usrErr);
        }
      }

      return res.json({ success: true, message: 'Payment verified successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to verify payment' });
    }
  });

  router.delete('/admin/payments/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM payments WHERE id = $1', [req.params.id]);
      return res.json({ success: true, message: 'Payment deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete payment' });
    }
  });

  router.delete('/admin/payments', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      await pool.query('DELETE FROM payments');
      return res.json({ success: true, message: 'All payments cleared' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to clear payments' });
    }
  });

  // =========================================================================
  // 11. PRICE ALERT SUBSCRIPTIONS
  // =========================================================================
  router.post('/price-alerts/subscribe', async (req: AuthRequest, res: Response) => {
    try {
      const { id, productId, productName, packageId, packageName, currentPrice, targetPrice, userUid } = req.body || {};
      if (!productId || !productName) {
        return res.status(400).json({ success: false, message: 'Missing product details' });
      }

      await pool.query(
        `INSERT INTO notifications (id, recipient_uid, title, message, type, read, action_url, created_at)
         VALUES ($1, $2, $3, $4, $5, false, $6, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [
          `alert-reg-${productId}-${packageId || 'all'}`,
          userUid || req.user?.uid || 'guest',
          `🔔 Price Alert Subscribed: ${productName}`,
          `You'll receive an instant notification when the price of ${productName} ${packageName ? `(${packageName})` : ''} drops below Rs. ${targetPrice || currentPrice}!`,
          'PRICE_ALERT_REGISTERED',
          `/product/${productId}`
        ]
      ).catch(() => {});

      return res.json({ success: true, message: 'Subscribed to price alert' });
    } catch (err: any) {
      return res.json({ success: true, message: 'Subscribed (local mode)' });
    }
  });

  router.post('/price-alerts/unsubscribe', async (_req: AuthRequest, res: Response) => {
    return res.json({ success: true, message: 'Unsubscribed from price alert' });
  });

  // =========================================================================
  // 12. ADMIN OPERATIONS & BULK ACTIONS
  // =========================================================================
  router.post('/admin/complete-all-pending', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const adminEmail = req.user?.email || 'admin';
      const result = await pool.query(`
        UPDATE orders 
        SET order_status = 'completed', 
            payment_status = 'verified', 
            admin_notes = COALESCE(admin_notes, '') || E'\\nBulk completed by ' || $1,
            updated_at = NOW()
        WHERE order_status IN ('pending', 'pending_payment', 'processing', 'in_review', 'pending_verification')
        RETURNING id
      `, [adminEmail]);
      return res.json({ success: true, count: result.rowCount, message: `Completed ${result.rowCount} pending orders.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to complete orders' });
    }
  });

  router.post('/admin/maintenance', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const d = req.body;
      const enabled = Boolean(d.enabled);
      const msg = d.message || 'Top-up service is temporarily unavailable due to scheduled maintenance.';
      const until = d.until || d.maintenanceUntil || null;

      await pool.query(`
        INSERT INTO app_settings (id, maintenance_mode, maintenance_message, maintenance_until, updated_at)
        VALUES ('default', $1, $2, $3, NOW())
        ON CONFLICT (id) DO UPDATE SET maintenance_mode = $1, maintenance_message = $2, maintenance_until = $3, updated_at = NOW()
      `, [enabled, msg, until]);

      await pool.query(`
        UPDATE app_settings 
        SET maintenance_mode = $1, maintenance_message = $2, maintenance_until = $3, updated_at = NOW()
        WHERE id = 'global_config'
      `, [enabled, msg, until]).catch(() => {});

      await pool.query(`
        INSERT INTO maintenance_settings (id, enabled, message, until, updated_at, updated_by)
        VALUES ('main', $1, $2, $3, NOW(), 'admin')
        ON CONFLICT (id) DO UPDATE SET enabled = $1, message = $2, until = $3, updated_at = NOW()
      `, [enabled, msg, until]).catch(() => {});

      return res.json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update maintenance settings' });
    }
  });

  // Reviews AI & admin endpoints
  function formatReviewRow(r: any) {
    if (!r) return r;
    const userName = r.userName || r.user_name || 'Valued Customer';
    const userPhoto = r.userPhoto || r.user_photo || '';
    const productId = r.productId || r.product_id || '';
    const productName = r.productName || r.product_name || '';
    const productImage = r.productImage || r.product_image || '';
    const packageName = r.packageName || r.package_name || '';
    const adminReply = r.adminReply || r.admin_reply || null;
    const adminReplyAt = r.adminReplyAt || r.admin_reply_at || r.replied_at || null;
    const userLocation = r.userLocation || r.user_location || '';
    const isVerifiedBuyer = r.isVerifiedBuyer !== undefined ? r.isVerifiedBuyer : (r.is_verified_buyer !== false);
    const orderId = r.orderId || r.order_id || null;
    const userId = r.userId || r.user_id || 'guest';
    const createdAt = r.createdAt || r.created_at || new Date().toISOString();
    const updatedAt = r.updatedAt || r.updated_at || new Date().toISOString();

    return {
      id: r.id,
      orderId,
      order_id: orderId,
      userId,
      user_id: userId,
      userName,
      user_name: userName,
      userPhoto,
      user_photo: userPhoto,
      productId,
      product_id: productId,
      productName,
      product_name: productName,
      productImage,
      product_image: productImage,
      packageName,
      package_name: packageName,
      rating: Number(r.rating) || 5,
      comment: r.comment || '',
      isVerifiedBuyer,
      is_verified_buyer: isVerifiedBuyer,
      status: r.status || 'published',
      userLocation,
      user_location: userLocation,
      adminReply,
      admin_reply: adminReply,
      adminReplyAt,
      admin_reply_at: adminReplyAt,
      createdAt,
      created_at: createdAt,
      updatedAt,
      updated_at: updatedAt,
    };
  }

  router.get('/admin/reviews/settings', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const settings = await getReviewSettings();
      return res.json({ success: true, settings });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to fetch review settings' });
    }
  });

  router.put('/admin/reviews/settings', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const updated = await updateReviewSettings(req.body);
      return res.json({ success: true, settings: updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update review settings' });
    }
  });

  router.post('/admin/reviews/:id/ai-reply', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { tone } = req.body;
      const revRes = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
      if (!revRes.rows || revRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }
      const reply = await generateAiReviewReply(revRes.rows[0], tone || 'professional');
      await pool.query('UPDATE reviews SET admin_reply = $1, admin_reply_at = NOW(), replied_at = NOW(), updated_at = NOW() WHERE id = $2', [reply, id]);
      const updated = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
      return res.json({ success: true, reply, review: formatReviewRow(updated.rows[0]), message: 'AI reply generated and saved' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to generate AI reply' });
    }
  });

  router.post('/admin/reviews/preview-ai-reply', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const data = req.body;
      const reply = await generateAiReviewReply(data, data.tone || 'professional');
      return res.json({ success: true, reply, replyText: reply });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to preview AI reply' });
    }
  });

  router.post('/admin/reviews/auto-reply-all', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { tone } = req.body;
      const pending = await pool.query('SELECT * FROM reviews WHERE admin_reply IS NULL OR admin_reply = \'\' LIMIT 20');
      let count = 0;

      const limit = pLimit(5);
      await Promise.all(
        pending.rows.map((rev) =>
          limit(async () => {
            try {
              const reply = await generateAiReviewReply(rev, tone || 'friendly');
              await pool.query(
                'UPDATE reviews SET admin_reply = $1, admin_reply_at = NOW(), replied_at = NOW(), updated_at = NOW() WHERE id = $2',
                [reply, rev.id]
              );
              count++;
            } catch {}
          })
        )
      );
      const allRevs = await pool.query('SELECT * FROM reviews ORDER BY created_at DESC');
      return res.json({ success: true, count, repliedCount: count, reviews: (allRevs.rows || []).map(formatReviewRow), message: `Auto-replied to ${count} reviews.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to auto-reply' });
    }
  });

  router.put('/reviews/:id', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, adminReply } = req.body;
      const updates: string[] = [];
      const values: any[] = [id];
      let pIdx = 2;

      if (status) { updates.push(`status = $${pIdx++}`); values.push(status); }
      if (adminReply !== undefined) {
        updates.push(`admin_reply = $${pIdx++}`);
        values.push(adminReply);
        updates.push(`admin_reply_at = NOW()`);
        updates.push(`replied_at = NOW()`);
        updates.push(`updated_at = NOW()`);
      }

      if (updates.length > 0) {
        await pool.query(`UPDATE reviews SET ${updates.join(', ')} WHERE id = $1`, values);
      }

      const updated = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
      return res.json({ success: true, review: formatReviewRow(updated.rows[0]), message: 'Review updated successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update review' });
    }
  });

  // =========================================================================
  // 12. STORAGE & CLOUDFLARE R2
  // =========================================================================
  router.get('/storage/status', optionalUser, async (_req: AuthRequest, res: Response) => {
    try {
      const summary = await getR2ConfigSummary();
      return res.json({ success: true, ...summary });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to get storage status' });
    }
  });

  router.post('/storage/test-connection', optionalUser, async (_req: AuthRequest, res: Response) => {
    try {
      const result = await testR2Connection();
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Storage connection test failed' });
    }
  });

  router.delete('/storage/file', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { key } = req.body;
      if (!key) return res.status(400).json({ success: false, message: 'Object key is required' });
      const result = await deleteFromR2(key);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to delete file from storage' });
    }
  });

  // POST /upload - Upload file to Cloudflare R2 with strict Base64 rejection, exact folder allowlists, file validation & role authorization
  router.post('/upload', authenticateUser, express.raw({ type: '*/*', limit: '15mb' }), async (req: AuthRequest, res: Response) => {
    try {
      if (req.is('json') || (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body))) {
        return res.status(400).json({ success: false, message: 'Base64 uploads are not supported.' });
      }

      const buffer = req.body;
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({ success: false, message: 'Base64 uploads are not supported or file is empty.' });
      }

      if (buffer.length > 15 * 1024 * 1024) {
        return res.status(400).json({ success: false, message: 'File size exceeds maximum allowed limit of 15MB.' });
      }

      const folder = String(req.headers['x-upload-folder'] || '').trim().toLowerCase();
      const rawFilename = req.headers['x-upload-filename'] ? decodeURIComponent(String(req.headers['x-upload-filename'])) : `upload-${Date.now()}.png`;
      const contentType = String(req.headers['content-type'] || 'image/png').trim().toLowerCase();

      // Allowed MIME types & extensions
      const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];
      if (!allowedMimes.includes(contentType)) {
        return res.status(400).json({ success: false, message: 'Invalid or unsupported file MIME type. Only PNG, JPEG, WebP, GIF, SVG, and PDF are allowed.' });
      }

      // Exact folder allowlists
      const adminFolders = ['products', 'banners', 'news', 'settings', 'logos', 'admin'];
      const customerFolders = ['wallet-receipts', 'kyc', 'orders', 'profile', 'general'];

      const isAdminFolder = adminFolders.includes(folder);
      const isCustomerFolder = customerFolders.includes(folder);

      if (!isAdminFolder && !isCustomerFolder) {
        return res.status(400).json({ success: false, message: 'Invalid or unauthorized upload folder.' });
      }

      if (isAdminFolder) {
        if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager' && req.user.role !== 'staff')) {
          return res.status(403).json({ success: false, message: 'Staff or administrator privileges required for this upload folder.' });
        }
      } else if (isCustomerFolder) {
        if (!req.user) {
          return res.status(401).json({ success: false, message: 'Authentication required for file upload.' });
        }
      }

      // Sanitize filename
      const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');

      const uploadRes = await uploadToR2(buffer, {
        folder: folder as any,
        filename: safeFilename,
        contentType,
      });

      if (uploadRes && uploadRes.success && uploadRes.key) {
        try {
          await pool.query(`
            INSERT INTO media_assets (
              id, storage_provider, bucket, object_key, public_url, media_type, file_size, uploaded_by, metadata, created_at, updated_at
            ) VALUES ($1, 'cloudflare_r2', $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            ON CONFLICT (object_key) DO UPDATE SET public_url = EXCLUDED.public_url, updated_at = NOW()
          `, [
            `med_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            process.env.R2_BUCKET_NAME || 'unx-media',
            uploadRes.key,
            uploadRes.url,
            contentType,
            buffer.length,
            req.user?.id || 'system',
            JSON.stringify({ folder, originalFilename: safeFilename })
          ]);
        } catch (medErr) {
          console.warn('[Upload] media_assets recording notice:', medErr);
        }
      }

      return res.json(uploadRes);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'File upload failed' });
    }
  });

  // =========================================================================
  // 13. ADMIN LOGIN (AUTHENTICATION)
  // =========================================================================
  router.post('/auth/admin-login', async (req: Request, res: Response) => {
    try {
      const email = String(req.body.email || '').trim().toLowerCase();
      const password = String(req.body.password || '');
      const clientIp = typeof req.headers['x-forwarded-for'] === 'string' 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : (req.socket?.remoteAddress || undefined);

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Please provide both administrator email/username and password.',
        });
      }

      const sb = getSupabaseClient(clientIp);
      if (!sb) {
        return res.status(500).json({ success: false, message: 'Authentication service unavailable.' });
      }

      const { data: sbData, error: sbErr } = await sb.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (sbErr || !sbData?.user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid administrative credentials. Account not found or incorrect password.',
        });
      }

      const authUser = sbData.user;

      // Check customers table
      const custRes = await pool.query(
        'SELECT * FROM customers WHERE supabase_auth_user_id = $1 LIMIT 1',
        [authUser.id]
      );

      let user = custRes.rows[0];

      if (!user) {
        user = {
          id: authUser.id,
          supabase_auth_user_id: authUser.id,
          email: authUser.email,
          role: 'CUSTOMER',
          status: 'ACTIVE',
        };
      }

      // Verify RBAC privileges
      const isOwner = isStoreOwnerAccount(user);
      let effectiveRole = isOwner ? 'STORE_OWNER' : (user.role || 'CUSTOMER');

      // Check personnel_roles table for assigned role
      const admRes = await pool.query(
        `SELECT r.name as role_name 
         FROM personnel_roles pr 
         JOIN roles r ON pr.role_id = r.id 
         WHERE pr.user_id = $1 LIMIT 1`,
        [user.id]
      );
      if (admRes.rows.length > 0 && admRes.rows[0].role_name) {
        effectiveRole = admRes.rows[0].role_name;
      }

      const allowedRoles = ['STORE_OWNER', 'SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_STAFF'];
      if (!allowedRoles.includes(effectiveRole.toUpperCase())) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Active Administrator or Staff role is required.',
        });
      }

      user.role = effectiveRole;
      user.status = 'ACTIVE';

      // 2FA Verification Check for Admin Login
      let verifiedFactorId: string | null = null;
      try {
        const supabaseAdmin = getSupabaseAdmin(clientIp);
        if (supabaseAdmin) {
          const targetUid = user.supabase_auth_user_id || user.id;
          const { data: factorData } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: targetUid });
          const verified = factorData?.factors?.find((f: any) => f.status === 'verified');
          if (verified) {
            verifiedFactorId = verified.id;
          }
        }
      } catch (mfaErr: any) {
        console.warn('[ADMIN LOGIN] MFA factors check notice:', mfaErr?.message);
      }

      if (user.two_factor_enabled || verifiedFactorId) {
        return res.json({
          success: true,
          requires2FA: true,
          factorId: verifiedFactorId,
          email: user.email,
          message: 'Admin Two-Factor Authentication is active. Please enter your 6-digit authenticator code.'
        });
      }

      return res.json({
        success: true,
        message: 'Admin authenticated successfully.',
        user: sanitizeUser(user),
        token: sbData.session?.access_token,
      });
    } catch (err: any) {
      console.error('Admin login error:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Administrative authentication error.',
      });
    }
  });

  // =========================================================================
  // 14. REAL-TIME SYNCHRONOUS DATABASE & SUPABASE SYNC SYSTEM
  // =========================================================================
  router.post('/admin/sync/all', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const startTime = Date.now();

      // 1. Synchronize & Verify Core Database Counts
      const [prodCountRes, pkgCountRes, catCountRes, bannerCountRes, orderCountRes] = await Promise.all([
        pool.query('SELECT COUNT(*) FROM products WHERE archived IS NOT TRUE'),
        pool.query('SELECT COUNT(*) FROM product_packages WHERE active = true'),
        pool.query('SELECT COUNT(*) FROM categories WHERE active = true'),
        pool.query('SELECT COUNT(*) FROM banners WHERE active = true'),
        pool.query('SELECT COUNT(*) FROM orders'),
      ]);

      const productsCount = parseInt(prodCountRes.rows[0]?.count || '0', 10);
      const packagesCount = parseInt(pkgCountRes.rows[0]?.count || '0', 10);
      const categoriesCount = parseInt(catCountRes.rows[0]?.count || '0', 10);
      const bannersCount = parseInt(bannerCountRes.rows[0]?.count || '0', 10);
      const ordersCount = parseInt(orderCountRes.rows[0]?.count || '0', 10);

      // 2. Broadcast Live SSE Synchronous Update to All Connected Clients
      emitGhnSyncEvent({
        eventType: 'database.synchronous_sync_completed',
        entityType: 'database',
        entityId: 'all',
        safeMetadata: {
          timestamp: new Date().toISOString(),
          productsCount,
          packagesCount,
          categoriesCount,
          bannersCount,
          ordersCount,
          syncedBy: req.user?.email || 'admin',
        },
      }).catch(() => {});

      // 3. Invalidate Redis Caches to guarantee fresh data
      invalidateRedisCache('products').catch(() => {});
      invalidateRedisCache('categories').catch(() => {});
      invalidateRedisCache('banners').catch(() => {});
      invalidateRedisCache('offers').catch(() => {});

      const durationMs = Date.now() - startTime;

      return res.json({
        success: true,
        message: `Synchronous database sync completed successfully in ${durationMs}ms. All entities are 100% in sync.`,
        data: {
          productsCount,
          packagesCount,
          categoriesCount,
          bannersCount,
          ordersCount,
          durationMs,
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error('Database synchronous sync error:', err);
      return res.status(500).json({
        success: false,
        message: err?.message || 'Database synchronous sync failed',
      });
    }
  });

  // =========================================================================
  // 15. UNX AI SUITE (GAMING ASSISTANT, RECEIPT OCR, PRODUCT COPYWRITER)
  // =========================================================================

  // Customer AI Gaming Concierge & Top-Up Assistant
  router.post('/ai/assistant-chat', async (req: Request, res: Response) => {
    try {
      const { messages, userContext, model } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: 'Messages array is required.' });
      }

      const aiResponse = await handleAssistantChat({ messages, userContext, model });
      return res.json({
        success: true,
        reply: typeof aiResponse === 'string' ? aiResponse : aiResponse.reply,
        reasoning_details: (aiResponse as any).reasoning_details,
        modelUsed: (aiResponse as any).modelUsed,
        actions: (aiResponse as any).actions || [],
        orderInfo: (aiResponse as any).orderInfo || null,
        productCard: (aiResponse as any).productCard || null,
        paymentInfo: (aiResponse as any).paymentInfo || null,
        detectedIntent: (aiResponse as any).detectedIntent || undefined,
      });
    } catch (err: any) {
      console.error('AI assistant error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'AI Assistant service unavailable' });
    }
  });

  // Admin Custom AI Configuration (OpenRouter & nemotron-3-ultra-550b-a55b:free)
  router.get('/admin/ai-config', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const config = await getCustomAiConfig();
      const maskedKey = config.apiKey
        ? config.apiKey.length > 8
          ? `${config.apiKey.slice(0, 7)}...${config.apiKey.slice(-4)}`
          : '********'
        : '';
      return res.json({
        success: true,
        config: {
          hasApiKey: Boolean(config.apiKey),
          apiKeyMasked: maskedKey,
          model: config.model,
          reasoningEnabled: config.reasoningEnabled,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to get AI config' });
    }
  });

  router.put('/admin/ai-config', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { apiKey, model, reasoningEnabled } = req.body;
      const ok = await updateCustomAiConfig({ apiKey, model, reasoningEnabled });
      if (ok) {
        return res.json({ success: true, message: 'Custom AI configuration saved.' });
      }
      return res.status(400).json({ success: false, message: 'Could not save AI configuration.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update AI config' });
    }
  });

  // Admin AI Payment Screenshot & Receipt OCR Verification
  router.post('/ai/verify-receipt', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { imageUrl, expectedAmount, expectedOrderCode, paymentMethod } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ success: false, message: 'Image URL is required for receipt analysis.' });
      }

      const result = await verifyPaymentReceipt({
        imageUrl,
        expectedAmount: expectedAmount ? Number(expectedAmount) : undefined,
        expectedOrderCode,
        paymentMethod,
      });

      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('AI receipt verify error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Receipt analysis failed' });
    }
  });

  // Admin AI Product & Package Copywriter
  router.post('/ai/generate-product-content', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { name, category, gameName, price, packagesCount, language } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Product name is required.' });
      }

      const content = await generateProductContent({
        name,
        category,
        gameName,
        price: price ? Number(price) : undefined,
        packagesCount: packagesCount ? Number(packagesCount) : undefined,
        language,
      });

      return res.json({ success: true, content });
    } catch (err: any) {
      console.error('AI product content gen error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Content generation failed' });
    }
  });

  // Admin AI Database Copilot & SQL Intelligence
  router.post('/ai/database-copilot', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { query, contextData } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, message: 'Query prompt string is required.' });
      }

      const copilotRes = await handleDatabaseCopilot({ query, contextData });
      return res.json({ success: true, ...copilotRes });
    } catch (err: any) {
      console.error('AI database copilot error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Database AI Copilot query failed' });
    }
  });

  // Admin AI Code Architect & Full-Stack Generator (nvidia/nemotron-3-ultra-550b-a55b:free)
  router.post('/admin/ai/code-architect', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { taskType, prompt, targetStack, contextSnippet } = req.body;
      if (!prompt) {
        return res.status(400).json({ success: false, message: 'Engineering prompt is required.' });
      }

      const result = await runAiCodeArchitect({
        taskType: taskType || 'feature',
        prompt,
        targetStack,
        contextSnippet,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('AI code architect error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Code generation failed' });
    }
  });

  // Admin Autonomous System Diagnostics & Bug Scanner
  router.get('/admin/ai/system-diagnostics', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const result = await runAutonomousSystemScan();
      return res.json(result);
    } catch (err: any) {
      console.error('AI system diagnostics error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Diagnostics failed' });
    }
  });

  // Admin 1-Click Autonomous Self-Healing Execution
  router.post('/admin/ai/self-healing', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { actionType } = req.body;
      if (!actionType) {
        return res.status(400).json({ success: false, message: 'Action type is required.' });
      }

      const result = await executeAutonomousSelfHealing(actionType);
      return res.json(result);
    } catch (err: any) {
      console.error('AI self-healing error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Self-healing execution failed' });
    }
  });

  // =========================================================================
  // MULTI-MODEL SWARM COUNCIL REAL ORCHESTRATION ROUTES
  // =========================================================================

  // Helper handler for executing real swarm council chat
  const handleSwarmChatRequest = async (req: Request, res: Response) => {
    const requestId = req.body.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      const { prompt, conversationHistory, targetModelId, mode } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          requestId,
          stage: 'MODEL_REQUEST',
          errorCode: 'INVALID_PROMPT',
          message: 'User prompt string is required.',
          retryable: false,
        });
      }

      const result = await executeRealSwarmCouncil({
        userPrompt: prompt,
        conversationHistory,
        requestId,
        targetModelId,
        mode: mode || (targetModelId && targetModelId !== 'ALL_SWARM' ? undefined : 'single_failover'),
      });

      return res.json(result);
    } catch (err: any) {
      console.error('Swarm chat execution error:', err);
      return res.status(500).json({
        success: false,
        requestId,
        stage: 'MODEL_REQUEST',
        errorCode: 'ORCHESTRATION_EXCEPTION',
        message: err?.message || 'Swarm council execution failed.',
        retryable: true,
      });
    }
  };

  // Helper handler for streaming real swarm council execution via Server-Sent Events (SSE)
  const handleSwarmStreamRequest = async (req: Request, res: Response) => {
    const requestId = req.body.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const { prompt, conversationHistory, targetModelId, mode } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        requestId,
        stage: 'MODEL_REQUEST',
        errorCode: 'INVALID_PROMPT',
        message: 'User prompt string is required.',
        retryable: false,
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
      const result = await executeRealSwarmCouncil({
        userPrompt: prompt,
        conversationHistory,
        requestId,
        targetModelId,
        mode: mode || (targetModelId && targetModelId !== 'ALL_SWARM' ? undefined : 'single_failover'),
        onProgress: (ev) => {
          res.write(`data: ${JSON.stringify(ev)}\n\n`);
        },
      });

      res.write(`data: ${JSON.stringify({ stage: 'DONE', result })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({
        stage: 'MODEL_ERROR',
        error: {
          success: false,
          requestId,
          stage: 'MODEL_REQUEST',
          errorCode: 'STREAM_EXCEPTION',
          message: err?.message || 'Swarm streaming failed',
          retryable: true,
        }
      })}\n\n`);
      res.end();
    }
  };

  // 1. Multi-Model Swarm Real Parallel Execution (Public & Admin)
  router.post('/ai/swarm-chat', handleSwarmChatRequest);
  router.post('/admin/ai/swarm-chat', handleSwarmChatRequest);
  router.post('/ai/swarm-stream', handleSwarmStreamRequest);
  router.post('/admin/ai/swarm-stream', handleSwarmStreamRequest);

  // 2. Central Model Registry List & Toggle (Public & Admin)
  const handleGetModels = async (_req: Request, res: Response) => {
    return res.json({ success: true, models: getRegisteredModels() });
  };
  const handleToggleModel = async (req: Request, res: Response) => {
    try {
      const { modelId, enabled } = req.body;
      if (!modelId) {
        return res.status(400).json({
          success: false,
          stage: 'MODEL_REQUEST',
          errorCode: 'MISSING_MODEL_ID',
          message: 'modelId is required.',
          retryable: false,
        });
      }
      const updated = toggleModelStatus(modelId, Boolean(enabled));
      if (!updated) {
        return res.status(404).json({
          success: false,
          stage: 'MODEL_REQUEST',
          errorCode: 'MODEL_NOT_FOUND',
          message: 'Model not found.',
          retryable: false,
        });
      }
      return res.json({ success: true, model: updated, models: getRegisteredModels() });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        stage: 'MODEL_REQUEST',
        errorCode: 'TOGGLE_FAILED',
        message: err?.message || 'Failed to toggle model',
        retryable: true,
      });
    }
  };

  const handleCheckModelHealth = async (req: Request, res: Response) => {
    try {
      const { modelId } = req.body;
      if (!modelId) {
        return res.status(400).json({ success: false, message: 'modelId is required.' });
      }
      const health = await verifyModelHealth(modelId);
      return res.json({ success: true, modelId, health, models: getRegisteredModels() });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Health check failed.' });
    }
  };

  router.get('/ai/models', handleGetModels);
  router.get('/admin/ai/models', handleGetModels);
  router.post('/ai/toggle-model', handleToggleModel);
  router.post('/admin/ai/toggle-model', handleToggleModel);
  router.post('/ai/check-model-health', handleCheckModelHealth);
  router.post('/admin/ai/check-model-health', handleCheckModelHealth);

  // =========================================================================
  // ADMIN AI & CODE AGENT TOOL LAYER (Requires Staff/Admin Authorization)
  // =========================================================================

  // Filesystem inspection
  router.get('/admin/ai/tools/file', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) return res.status(400).json({ success: false, message: 'path query parameter is required.' });
      const fileData = await adminReadFile(filePath);
      return res.json({ success: true, ...fileData });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to read file.' });
    }
  });

  router.get('/admin/ai/tools/search-files', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const query = (req.query.q as string) || '';
      const subDir = (req.query.dir as string) || '.';
      const matches = await adminSearchFiles(query, subDir);
      return res.json({ success: true, matches });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to search files.' });
    }
  });

  router.get('/admin/ai/tools/list-dir', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const dirPath = (req.query.path as string) || '.';
      const entries = await adminListDirectory(dirPath);
      return res.json({ success: true, entries });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Failed to list directory.' });
    }
  });

  router.post('/admin/ai/tools/write-file', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { filePath, content, reason } = req.body;
      if (!filePath || typeof content !== 'string') {
        return res.status(400).json({ success: false, message: 'filePath and content are required.' });
      }
      const writeResult = await adminWriteFile({ filePath, content, reason: reason || 'Admin AI modification' });
      await logAdminToolInvocation({
        id: `tool_${Date.now()}`,
        requestId: req.body.requestId || `req_${Date.now()}`,
        adminUserId: req.user?.id,
        toolName: 'WRITE_FILE',
        target: filePath,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        filesChanged: [filePath],
        result: writeResult,
      });
      return res.json({ success: true, ...writeResult });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Write file failed.' });
    }
  });

  router.post('/admin/ai/tools/delete-file', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { filePath, confirmationToken } = req.body;
      if (!filePath) return res.status(400).json({ success: false, message: 'filePath is required.' });
      const delResult = await adminDeleteFile(filePath, confirmationToken);
      if ('requiresConfirmation' in delResult) {
        return res.json({ success: false, confirmationRequired: true, details: delResult });
      }
      await logAdminToolInvocation({
        id: `tool_${Date.now()}`,
        requestId: req.body.requestId || `req_${Date.now()}`,
        adminUserId: req.user?.id,
        toolName: 'DELETE_FILE',
        target: filePath,
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        filesChanged: [filePath],
        result: delResult,
      });
      return res.json({ success: true, ...delResult });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'Delete file failed.' });
    }
  });

  // Database tools
  router.get('/admin/ai/tools/database-overview', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const overview = await adminGetDatabaseOverview();
      return res.json({ success: true, overview });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Database overview error.' });
    }
  });

  router.post('/admin/ai/tools/execute-safe-sql', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { query, confirmationToken } = req.body;
      if (!query) return res.status(400).json({ success: false, message: 'query is required.' });
      const sqlResult = await adminExecuteSafeSql(query, confirmationToken);
      if ('requiresConfirmation' in sqlResult) {
        return res.json({ success: false, confirmationRequired: true, details: sqlResult });
      }
      return res.json({ success: true, ...sqlResult });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err?.message || 'SQL execution failed.' });
    }
  });

  // Project tools: Typecheck & Build
  router.get('/admin/ai/tools/type-check', requireStaff, async (_req: AuthRequest, res: Response) => {
    const result = await adminRunTypeCheck();
    return res.json(result);
  });

  router.post('/admin/ai/tools/run-build', requireAdmin, async (_req: AuthRequest, res: Response) => {
    const result = await adminRunBuildCheck();
    return res.json(result);
  });

  // 3. Real Terminal Logs (Public & Admin)
  const handleGetTerminalLogs = async (_req: Request, res: Response) => {
    return res.json({ success: true, logs: getTerminalLogs() });
  };
  const handleClearTerminalLogs = async (_req: Request, res: Response) => {
    clearTerminalLogs();
    return res.json({ success: true, message: 'Terminal logs cleared.' });
  };

  router.get('/ai/terminal-logs', handleGetTerminalLogs);
  router.get('/admin/ai/terminal-logs', handleGetTerminalLogs);
  router.post('/ai/clear-terminal-logs', handleClearTerminalLogs);
  router.post('/admin/ai/clear-terminal-logs', handleClearTerminalLogs);

  // 4. Real Actions Logs & Execution (Public & Admin)
  const handleGetActions = async (_req: Request, res: Response) => {
    const actions = await getRecentSwarmActions();
    return res.json({ success: true, actions });
  };
  const handleExecuteAction = async (req: Request, res: Response) => {
    const requestId = req.body.requestId || `act_${Date.now()}`;
    try {
      const { actionType, input } = req.body;
      if (!actionType) {
        return res.status(400).json({
          success: false,
          requestId,
          stage: 'ACTION',
          errorCode: 'MISSING_ACTION_TYPE',
          message: 'actionType is required.',
          retryable: false,
        });
      }
      const result = await executeRealSwarmAction({
        actionType,
        input,
        requestId,
      });
      return res.json({ success: result.status === 'SUCCESS', result });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        requestId,
        stage: 'ACTION',
        errorCode: 'ACTION_EXECUTION_ERROR',
        message: err?.message || 'Action execution error',
        retryable: false,
      });
    }
  };

  router.get('/ai/actions', handleGetActions);
  router.get('/admin/ai/actions', handleGetActions);
  router.post('/ai/execute-action', handleExecuteAction);
  router.post('/admin/ai/execute-action', handleExecuteAction);

  // Supreme AI Overseer & Voice Command Console (Powered by Real Swarm Orchestrator)
  const handleCommandRequest = async (req: Request, res: Response) => {
    const reqId = req.body.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      const { prompt, conversationHistory, modelOverride, targetModel } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({
          success: false,
          requestId: reqId,
          stage: 'MODEL_REQUEST',
          errorCode: 'INVALID_PROMPT',
          message: 'Voice/Text command prompt is required.',
          retryable: false,
        });
      }

      const targetModelId = targetModel || modelOverride;

      // Check if user specifically requested a database or system action
      const lower = prompt.toLowerCase();
      let realAction: any = null;

      if (lower.includes('check db') || lower.includes('database health') || lower.includes('db status')) {
        realAction = await executeRealSwarmAction({
          requestId: reqId,
          actionType: 'CHECK_DB_HEALTH',
        });
      } else if (lower.includes('pending orders') || lower.includes('order queue') || lower.includes('unverified orders')) {
        realAction = await executeRealSwarmAction({
          requestId: reqId,
          actionType: 'SCAN_PENDING_ORDERS',
        });
      } else if (lower.includes('payment gateway') || lower.includes('esewa') || lower.includes('khalti status')) {
        realAction = await executeRealSwarmAction({
          requestId: reqId,
          actionType: 'VERIFY_PAYMENT_GATEWAYS',
        });
      } else if (lower.includes('products') || lower.includes('catalog count')) {
        realAction = await executeRealSwarmAction({
          requestId: reqId,
          actionType: 'QUERY_PRODUCT_CATALOG',
        });
      }

      // Execute Real Multi-Model Swarm Council
      const swarmResult = await executeRealSwarmCouncil({
        userPrompt: prompt,
        conversationHistory,
        requestId: reqId,
        targetModelId,
      });

      return res.json({
        success: swarmResult.success,
        requestId: swarmResult.requestId,
        modelUsed: swarmResult.synthesisModel,
        replyText: swarmResult.synthesisResponse,
        modelsSummaryText: swarmResult.modelsSummaryText,
        participatingCount: swarmResult.participatingCount,
        succeededCount: swarmResult.succeededCount,
        failedCount: swarmResult.failedCount,
        individualResponses: swarmResult.individualResponses,
        thoughtProcess: [
          `Gathered live store snapshot from PostgreSQL database`,
          `Queried ${swarmResult.participatingCount} configured AI models in parallel`,
          `${swarmResult.succeededCount} of ${swarmResult.participatingCount} models provided real independent responses`,
          `Council Chair (${swarmResult.synthesisModel}) synthesized final consensus answer`,
        ],
        actionExecuted: realAction ? {
          type: realAction.actionType,
          summary: `Executed ${realAction.actionType} in ${realAction.durationMs}ms`,
          status: realAction.status,
          details: realAction.output,
          error: realAction.error,
        } : undefined,
        suggestedFollowUps: [
          'Check database connection & health',
          'Scan pending orders queue',
          'Verify eSewa & Khalti payment gateways',
          'Query active store catalog',
        ],
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('AI command error:', err);
      return res.status(500).json({
        success: false,
        requestId: reqId,
        stage: 'MODEL_REQUEST',
        errorCode: 'COMMAND_EXCEPTION',
        message: err?.message || 'Supreme AI Overseer execution failed',
        retryable: true,
      });
    }
  };

  router.post('/ai/command', handleCommandRequest);
  router.post('/admin/ai/command', handleCommandRequest);

  // Admin AI Direct SQL & Migration Runner (PostgreSQL)
  router.post('/admin/ai/execute-sql', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { sqlQuery } = req.body;
      if (!sqlQuery || typeof sqlQuery !== 'string') {
        return res.status(400).json({ success: false, message: 'SQL query string is required.' });
      }

      let cleanQuery = sqlQuery.trim();
      const startTime = Date.now();
      let queryResult: any;

      try {
        queryResult = await pool.query(cleanQuery);
      } catch (firstErr: any) {
        // Smart schema alias: if user or AI queries 'status' from 'orders', auto-rewrite to 'order_status'
        if (firstErr?.message?.includes('column "status" does not exist') && cleanQuery.toLowerCase().includes('orders')) {
          const autoFixedQuery = cleanQuery.replace(/\bstatus\b/gi, 'order_status');
          queryResult = await pool.query(autoFixedQuery);
        } else {
          throw firstErr;
        }
      }
      const executionTimeMs = Date.now() - startTime;

      return res.json({
        success: true,
        message: 'SQL executed successfully on PostgreSQL database.',
        rowCount: queryResult.rowCount ?? (Array.isArray(queryResult.rows) ? queryResult.rows.length : 0),
        rows: (queryResult.rows || []).slice(0, 50),
        executionTimeMs,
      });
    } catch (err: any) {
      console.error('AI execute SQL error:', err);
      return res.status(400).json({
        success: false,
        message: 'SQL execution failed: ' + (err?.message || 'Syntax or constraint error'),
      });
    }
  });

  // Admin Autonomous Evolution & Self-Thinking Engine Routes
  router.get('/admin/evolution/status', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const { getEvolutionStatus } = await import('./autonomousEvolutionEngine.js');
      const status = getEvolutionStatus();
      return res.json({ success: true, ...status });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Evolution status error' });
    }
  });

  router.post('/admin/evolution/trigger-cycle', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const { runEvolutionCycle, getEvolutionStatus } = await import('./autonomousEvolutionEngine.js');
      const cycleRes = await runEvolutionCycle(true);
      const status = getEvolutionStatus();
      return res.json({ success: true, ...cycleRes, currentStatus: status });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Evolution cycle trigger failed' });
    }
  });

  router.post('/admin/evolution/config', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { updateEvolutionConfig } = await import('./autonomousEvolutionEngine.js');
      const { isActive, cadenceSeconds, currentFocus } = req.body;
      const updated = updateEvolutionConfig({ isActive, cadenceSeconds, currentFocus });
      return res.json({ success: true, ...updated });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to update evolution config' });
    }
  });

  // Super-Admin Omni AI Executive Chat & Direct Action Runner
  router.post('/admin/ai/omni-chat', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { messages } = req.body;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, message: 'Messages array is required.' });
      }

      const { handleSuperAdminOmniChat } = await import('./aiSuperAdminOmni.js');
      const omniResponse = await handleSuperAdminOmniChat({
        messages,
        adminUser: req.user ? { name: req.user.name, email: req.user.email, role: req.user.role } : undefined,
      });

      return res.json(omniResponse);
    } catch (err: any) {
      console.error('Super-Admin Omni AI error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Omni AI service unavailable' });
    }
  });

  // Multi-AI Ensemble & Agent Swarm Mesh Routes
  router.get('/admin/ai/swarm/status', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const { getMultiAiSwarmStatus } = await import('./aiMultiAgentSwarm.js');
      return res.json(getMultiAiSwarmStatus());
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Swarm status error' });
    }
  });

  router.post('/admin/ai/swarm/collaborate', requireStaff, async (req: AuthRequest, res: Response) => {
    try {
      const { task, domain, enableSecurityCrossCheck } = req.body;
      if (!task) {
        return res.status(400).json({ success: false, message: 'Task objective is required.' });
      }

      const { runMultiAiCollaboration } = await import('./aiMultiAgentSwarm.js');
      const result = await runMultiAiCollaboration({
        task,
        domain: domain || 'FULL_SYSTEM_UPGRADE',
        enableSecurityCrossCheck: enableSecurityCrossCheck !== false
      });
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Swarm collaboration error' });
    }
  });

  router.post('/admin/ai/swarm/toggle-model', requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { agentId, active } = req.body;
      const { toggleAgentModelStatus } = await import('./aiMultiAgentSwarm.js');
      const updated = toggleAgentModelStatus(agentId, Boolean(active));
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Failed to toggle agent' });
    }
  });

  // Autonomous Anti-Hack Cyber Security Sentinel Routes
  router.get('/admin/security/anti-hack-sweep', requireStaff, async (_req: AuthRequest, res: Response) => {
    try {
      const { runSecurityAuditSweep } = await import('./securitySentinel.js');
      const audit = await runSecurityAuditSweep();
      return res.json(audit);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Security sweep error' });
    }
  });

  router.post('/admin/security/harden-defense', requireAdmin, async (_req: AuthRequest, res: Response) => {
    try {
      const { hardenSystemDefense } = await import('./securitySentinel.js');
      const hardened = await hardenSystemDefense();
      return res.json(hardened);
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || 'Hardening error' });
    }
  });
}


