import { Request, Response } from 'express';
import sharp from 'sharp';

// In-memory cache for frequently accessed transformed images
const imageMemoryCache = new Map<string, { buffer: Buffer; contentType: string; cachedAt: number }>();
const MAX_CACHE_ITEMS = 200;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * High-performance Automated Image Transformation Handler
 * Converts images to WebP/AVIF formats with responsive resizing & compression.
 */
export async function handleImageTransform(req: Request, res: Response) {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'Missing url parameter' });
    }

    const decodedUrl = decodeURIComponent(rawUrl);

    // SSRF & Security Check: Validate protocol and prevent private network access
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(decodedUrl);
    } catch {
      return res.status(400).json({ success: false, message: 'Invalid URL format' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ success: false, message: 'Unsupported protocol' });
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname === '0.0.0.0'
    ) {
      return res.status(403).json({ success: false, message: 'Private network addresses not allowed' });
    }

    const fmt = ((req.query.fmt as string) || 'webp').toLowerCase();
    const widthParam = req.query.w ? parseInt(req.query.w as string, 10) : undefined;
    const width = widthParam && !isNaN(widthParam) ? Math.min(Math.max(widthParam, 16), 2560) : undefined;
    const qualityParam = req.query.q ? parseInt(req.query.q as string, 10) : undefined;
    const quality = qualityParam && !isNaN(qualityParam) ? Math.min(Math.max(qualityParam, 10), 100) : 80;

    const cacheKey = `${decodedUrl}_${fmt}_${width || 'orig'}_${quality}`;

    // 1. Check in-memory cache
    const cached = imageMemoryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Image-Cache', 'HIT');
      return res.send(cached.buffer);
    }

    // 2. Fetch original image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(decodedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UnxGames-ImageTransformer/1.0',
        Accept: 'image/avif,image/webp,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Fallback redirect to original if upstream failed
      return res.redirect(302, decodedUrl);
    }

    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    // 3. Transform using Sharp
    let pipeline = sharp(inputBuffer, { failOn: 'none' });

    if (width) {
      pipeline = pipeline.resize({
        width,
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    let contentType = 'image/webp';
    if (fmt === 'avif') {
      contentType = 'image/avif';
      pipeline = pipeline.avif({ quality, effort: 2 });
    } else if (fmt === 'png') {
      contentType = 'image/png';
      pipeline = pipeline.png({ quality: Math.min(quality, 95) });
    } else if (fmt === 'jpeg' || fmt === 'jpg') {
      contentType = 'image/jpeg';
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else {
      // Default: WebP
      contentType = 'image/webp';
      pipeline = pipeline.webp({ quality, effort: 3 });
    }

    const outputBuffer = await pipeline.toBuffer();

    // Store in cache (manage cache size)
    if (imageMemoryCache.size >= MAX_CACHE_ITEMS) {
      const firstKey = imageMemoryCache.keys().next().value;
      if (firstKey) imageMemoryCache.delete(firstKey);
    }
    imageMemoryCache.set(cacheKey, {
      buffer: outputBuffer,
      contentType,
      cachedAt: Date.now(),
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Image-Cache', 'MISS');
    return res.send(outputBuffer);
  } catch (err: any) {
    // Graceful fallback to redirecting to original url if transformation fails
    const rawUrl = req.query.url as string;
    if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      return res.redirect(302, rawUrl);
    }
    return res.status(500).json({ success: false, message: 'Image transformation failed' });
  }
}
