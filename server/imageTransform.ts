import { Request, Response } from 'express';
import sharp from 'sharp';

interface CachedImage {
  buffer: Buffer;
  contentType: string;
  timestamp: number;
}

// Memory cache for transformed images (max 250 items to prevent RAM bloat)
const imageCache = new Map<string, CachedImage>();
const MAX_CACHE_SIZE = 250;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Handles automated image transformation & format serving (AVIF / WebP / JPEG)
 */
export async function handleImageTransform(req: Request, res: Response): Promise<void> {
  const rawUrl = req.query.url as string;
  const fmt = ((req.query.fmt as string) || 'webp').toLowerCase();
  const widthStr = req.query.w as string;
  const qualityStr = req.query.q as string;

  if (!rawUrl || typeof rawUrl !== 'string') {
    res.status(400).json({ success: false, error: 'Missing target image URL parameter' });
    return;
  }

  // Security check: Only allow HTTP/HTTPS remote assets
  if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
    res.status(400).json({ success: false, error: 'Invalid URL protocol' });
    return;
  }

  const targetWidth = widthStr ? Math.min(Math.max(parseInt(widthStr, 10) || 0, 16), 2048) : undefined;
  const quality = qualityStr ? Math.min(Math.max(parseInt(qualityStr, 10) || 80, 10), 100) : 80;

  // Cache key identifier
  const cacheKey = `${fmt}_w${targetWidth || 'orig'}_q${quality}_${rawUrl}`;

  // Check memory cache
  const cached = imageCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept');
    res.setHeader('X-Image-Cache', 'HIT');
    res.send(cached.buffer);
    return;
  }

  try {
    // Fetch source image with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'UnxGames-ImageOptimizer/1.0',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      // Redirect to original raw URL if upstream fetch fails
      res.redirect(302, rawUrl);
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    let transformer = sharp(inputBuffer);

    // Resize if target width is specified
    if (targetWidth) {
      transformer = transformer.resize({
        width: targetWidth,
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    let outputContentType = 'image/webp';
    let outputBuffer: Buffer;

    if (fmt === 'avif') {
      outputContentType = 'image/avif';
      outputBuffer = await transformer
        .avif({ quality, effort: 4 })
        .toBuffer();
    } else if (fmt === 'jpeg' || fmt === 'jpg') {
      outputContentType = 'image/jpeg';
      outputBuffer = await transformer
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } else if (fmt === 'png') {
      outputContentType = 'image/png';
      outputBuffer = await transformer
        .png({ compressionLevel: 8 })
        .toBuffer();
    } else {
      // Default to WebP
      outputContentType = 'image/webp';
      outputBuffer = await transformer
        .webp({ quality, effort: 4 })
        .toBuffer();
    }

    // Prune cache if full
    if (imageCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = imageCache.keys().next().value;
      if (oldestKey) imageCache.delete(oldestKey);
    }

    // Store in cache
    imageCache.set(cacheKey, {
      buffer: outputBuffer,
      contentType: outputContentType,
      timestamp: Date.now(),
    });

    res.setHeader('Content-Type', outputContentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept');
    res.setHeader('X-Image-Cache', 'MISS');
    res.send(outputBuffer);
  } catch (err: any) {
    console.warn('[ImageTransform Proxy] Transformation fallback note:', err?.message || err);
    // Fallback: redirect directly to raw URL if transformation fails
    res.redirect(302, rawUrl);
  }
}
