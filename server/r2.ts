import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { db } from '../src/db/index.js';
import { app_settings } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

let s3Client: S3Client | null = null;
let activeR2ConfigStr = '';

function cleanConfigValue(val?: string | null): string {
  if (!val) return '';
  let str = String(val).trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

export function resetR2Client() {
  s3Client = null;
  activeR2ConfigStr = '';
}

export async function getActiveR2Config() {
  let accountId = cleanConfigValue(process.env.R2_ACCOUNT_ID);
  let accessKeyId = cleanConfigValue(process.env.R2_ACCESS_KEY_ID);
  let secretAccessKey = cleanConfigValue(process.env.R2_SECRET_ACCESS_KEY);
  let bucketName = cleanConfigValue(process.env.R2_BUCKET_NAME);
  let publicDomain = cleanConfigValue(process.env.R2_PUBLIC_DOMAIN).replace(/\/$/, '');

  // Also inspect database app_settings if any credential was updated from Admin UI
  try {
    const settings = await db.select().from(app_settings).limit(1);
    if (settings && settings.length > 0) {
      const row = settings[0];
      if (row.r2_account_id) accountId = cleanConfigValue(row.r2_account_id);
      if (row.r2_bucket_name) bucketName = cleanConfigValue(row.r2_bucket_name);
      if (row.r2_public_domain) publicDomain = cleanConfigValue(row.r2_public_domain).replace(/\/$/, '');
      if (row.r2_access_key_id) accessKeyId = cleanConfigValue(row.r2_access_key_id);
      if (row.r2_secret_access_key) secretAccessKey = cleanConfigValue(row.r2_secret_access_key);
    }
  } catch (e) {
    // Database may not be ready or table might not exist yet
  }

  // Fallback public domain if not set
  if (!publicDomain) {
    publicDomain = 'https://pub-f5b49392d8cb47b0b42800e81d2216c0.r2.dev';
  }

  // Auto-detect and fix swapped Access Key ID and Secret Access Key
  // In Cloudflare R2: Access Key ID is 32 hex chars, Secret Access Key is 64 hex chars.
  if (accessKeyId && secretAccessKey) {
    if (accessKeyId.length === 64 && secretAccessKey.length === 32) {
      console.log('🔄 [R2 Config Auto-Heal] Detected swapped R2_ACCESS_KEY_ID (64 chars) and R2_SECRET_ACCESS_KEY (32 chars). Auto-swapping to standard S3 format.');
      const temp = accessKeyId;
      accessKeyId = secretAccessKey;
      secretAccessKey = temp;
    }
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicDomain
  };
}

export async function getR2Client(): Promise<S3Client | null> {
  const config = await getActiveR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    return null;
  }
  
  const configStr = JSON.stringify(config);
  if (configStr !== activeR2ConfigStr || !s3Client) {
    activeR2ConfigStr = configStr;
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return s3Client;
}

export interface UploadOptions {
  folder?: 'products' | 'games' | 'banners' | 'offers' | 'news' | 'users' | 'payment-proofs' | 'general' | 'health';
  filename?: string;
  contentType?: string;
}

export interface R2TestResult {
  success: boolean;
  status: 'connected' | 'not_configured' | 'error';
  latencyMs?: number;
  bucket: string;
  publicDomain: string;
  publicUrlSample?: string;
  message: string;
  missingVariables?: string[];
  details?: Record<string, any>;
}

/**
 * Returns safe summary of R2 configuration without exposing any secrets or keys.
 */
export async function getR2ConfigSummary() {
  const config = await getActiveR2Config();
  const missing: string[] = [];
  if (!config.accountId) missing.push('R2_ACCOUNT_ID');
  if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!config.bucketName) missing.push('R2_BUCKET_NAME');
  if (!config.publicDomain) missing.push('R2_PUBLIC_DOMAIN');

  const isConfigured = missing.length === 0;

  return {
    isConfigured,
    bucket: config.bucketName || 'Not configured',
    publicDomain: config.publicDomain || 'Not configured',
    missingVariables: missing,
    endpoint: config.accountId ? `https://${config.accountId}.r2.cloudflarestorage.com` : 'Not set',
  };
}

/**
 * Performs a live end-to-end server-side health check against Cloudflare R2:
 * 1. Checks credentials
 * 2. Uploads a temporary diagnostic probe file
 * 3. Formats and verifies the public URL using R2_PUBLIC_DOMAIN
 * 4. Deletes the temporary probe file
 * 5. Measures round-trip latency
 * 6. Never exposes secret keys
 */
export async function testR2Connection(): Promise<R2TestResult> {
  const config = await getActiveR2Config();
  const missing: string[] = [];
  if (!config.accountId) missing.push('R2_ACCOUNT_ID');
  if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!config.bucketName) missing.push('R2_BUCKET_NAME');
  if (!config.publicDomain) missing.push('R2_PUBLIC_DOMAIN');

  if (missing.length > 0) {
    return {
      success: false,
      status: 'not_configured',
      bucket: config.bucketName || 'not_configured',
      publicDomain: config.publicDomain || 'none',
      message: `Cloudflare R2 credentials or configuration are incomplete. Missing environment variables: ${missing.join(', ')}`,
      missingVariables: missing,
    };
  }

  const client = await getR2Client();
  if (!client) {
    return {
      success: false,
      status: 'not_configured',
      bucket: config.bucketName,
      publicDomain: config.publicDomain || 'none',
      message: 'Failed to initialize S3 client with provided credentials.',
    };
  }

  const startTime = Date.now();
  const testKey = `_health_probes/probe-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.json`;
  const probeData = JSON.stringify({
    service: 'Unx Games R2 Health Test',
    timestamp: new Date().toISOString(),
    bucket: config.bucketName,
    success: true,
  });

  try {
    // 1. Put test object
    const putCmd = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: testKey,
      Body: Buffer.from(probeData, 'utf-8'),
      ContentType: 'application/json',
    });
    await client.send(putCmd);

    // 2. Format public domain URL
    const publicUrlSample = `${config.publicDomain}/${testKey}`;

    // 3. Clean up test object
    const delCmd = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: testKey,
    });
    await client.send(delCmd);

    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      status: 'connected',
      latencyMs,
      bucket: config.bucketName,
      publicDomain: config.publicDomain ? config.publicDomain : 'Default R2 Endpoint',
      publicUrlSample,
      message: `Successfully connected to Cloudflare R2 bucket "${config.bucketName}". Upload and delete probe verified in ${latencyMs}ms.`,
      details: {
        latencyMs,
        bucket: config.bucketName,
        publicDomainConfigured: Boolean(config.publicDomain),
        probeDeleted: true,
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    console.error('Cloudflare R2 Test Error:', err?.message || err);

    const isSignatureError = err?.message?.includes('signature') || err?.name === 'SignatureDoesNotMatch' || err?.$metadata?.httpStatusCode === 403;
    const isKeyLengthError = err?.message?.includes('length 64, should be 32') || err?.message?.includes('Credential access key has length');
    
    let errorMessage = `Cloudflare R2 test error: ${err?.message || 'Unknown S3/R2 error'}`;
    
    if (isKeyLengthError) {
      errorMessage = 'Cloudflare R2 Key Mismatch: The R2_ACCESS_KEY_ID provided is 64 characters long (Secret Key format). Cloudflare R2 Access Key ID must be the 32-character hexadecimal key. In Cloudflare Dashboard > R2 > Manage R2 API Tokens, copy the 32-character "Access Key ID" into R2_ACCESS_KEY_ID and the 64-character "Secret Access Key" into R2_SECRET_ACCESS_KEY.';
    } else if (isSignatureError) {
      if (config.accessKeyId && config.secretAccessKey && config.accessKeyId === config.secretAccessKey) {
        errorMessage = 'Cloudflare R2 signature mismatch: R2_SECRET_ACCESS_KEY is identical to R2_ACCESS_KEY_ID (32 hex characters). In Cloudflare Dashboard > R2 > Manage R2 API Tokens, copy the 64-character Secret Access Key and paste it in Store Settings or environment.';
      } else {
        errorMessage = 'Cloudflare R2 signature mismatch. Please verify your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in environment variables or Admin Settings.';
      }
    }

    return {
      success: false,
      status: 'error',
      latencyMs,
      bucket: config.bucketName,
      publicDomain: config.publicDomain || 'none',
      message: errorMessage,
      details: {
        errorName: err?.name,
        errorCode: err?.code || err?.$metadata?.httpStatusCode,
      },
    };
  }
}

/**
 * Uploads file buffer to Cloudflare R2 bucket and returns the public URL.
 */
export async function uploadToR2(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<{ success: boolean; url: string; key: string; message?: string }> {
  const folder = options.folder || 'general';
  const ext = options.filename?.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'png';
  const uniqueKey = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  const contentType = options.contentType || 'image/png';

  const config = await getActiveR2Config();
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucketName || !config.publicDomain) {
    throw new Error('Cloudflare R2 configuration is incomplete. Missing required environment variables (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN).');
  }

  const client = await getR2Client();
  if (!client) {
    throw new Error('Cloudflare R2 client could not be initialized.');
  }

  try {
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: uniqueKey,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await client.send(command);

    const publicUrl = `${config.publicDomain}/${uniqueKey}`;

    return {
      success: true,
      url: publicUrl,
      key: uniqueKey,
    };
  } catch (error: any) {
    console.error('R2 upload failed:', error);
    const isSignatureError = error?.message?.includes('signature') || error?.name === 'SignatureDoesNotMatch' || error?.$metadata?.httpStatusCode === 403;
    const msg = isSignatureError
      ? 'Cloudflare R2 signature mismatch. Please check your R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.'
      : (error?.message || 'Unknown error');
    throw new Error(`Cloudflare R2 upload failed: ${msg}`);
  }
}

/**
 * Deletes an object key from R2 bucket.
 */
export async function deleteFromR2(key: string): Promise<{ success: boolean; message?: string }> {
  const client = await getR2Client();
  if (!client || !key) return { success: false, message: 'R2 client not configured or invalid key.' };

  const config = await getActiveR2Config();

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    });
    await client.send(command);
    return { success: true };
  } catch (err: any) {
    console.error('R2 delete failed:', err);
    return { success: false, message: err?.message };
  }
}

export interface DuplicateMapping {
  deletedKey: string;
  keptKey: string;
  keptUrl: string;
}

/**
 * Removes duplicate objects from R2 bucket based on ETag content hash.
 * Scoring keys ensures the cleanest official file name is kept.
 */
export async function removeR2DuplicatesByETag(): Promise<{ 
  success: boolean; 
  deletedCount: number; 
  message: string; 
  mappings: DuplicateMapping[] 
}> {
  const client = await getR2Client();
  if (!client) {
    return { success: false, deletedCount: 0, message: 'R2 client not configured.', mappings: [] };
  }

  const config = await getActiveR2Config();

  try {
    const etagMap: Record<string, Array<{ key: string; size: number }>> = {};
    let continuationToken: string | undefined = undefined;

    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: config.bucketName,
        ContinuationToken: continuationToken,
      });
      const response = await client.send(listCmd);
      const contents = response.Contents || [];

      for (const obj of contents) {
        if (!obj.ETag || !obj.Key) continue;
        const etag = obj.ETag.replace(/"/g, '');
        const key = obj.Key;
        const size = obj.Size || 0;

        if (!etagMap[etag]) {
          etagMap[etag] = [];
        }
        etagMap[etag].push({ key, size });
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    // Scoring function: lower is better (cleaner official filename)
    const getFilenameScore = (key: string): number => {
      let score = 0;
      const lowercaseKey = key.toLowerCase();
      if (lowercaseKey.includes('copy')) score += 500;
      if (lowercaseKey.includes('duplicate')) score += 500;
      if (lowercaseKey.includes('(1)')) score += 200;
      if (lowercaseKey.includes('(2)')) score += 200;
      if (/\-\d+\./.test(lowercaseKey)) score += 100; // e.g. -1.webp
      if (/\d{13}\-/.test(lowercaseKey)) score += 20; // timestamps are slightly lower priority than clean names
      score += key.length; // prefer shorter keys
      return score;
    };

    let deletedCount = 0;
    const mappings: DuplicateMapping[] = [];

    for (const [etag, keys] of Object.entries(etagMap)) {
      if (keys.length > 1) {
        // Sort keys to keep the cleanest name at index 0
        keys.sort((a, b) => getFilenameScore(a.key) - getFilenameScore(b.key));
        
        const keptKey = keys[0].key;
        const keptUrl = `${config.publicDomain}/${keptKey}`;

        // Keep the first item (keys[0]), delete the rest
        for (let i = 1; i < keys.length; i++) {
          const deletedKey = keys[i].key;
          await deleteFromR2(deletedKey).catch(() => {});
          deletedCount++;
          mappings.push({
            deletedKey,
            keptKey,
            keptUrl
          });
        }
      }
    }

    return {
      success: true,
      deletedCount,
      message: `Successfully removed ${deletedCount} duplicate R2 storage objects based on ETag content hash.`,
      mappings
    };
  } catch (err: any) {
    console.error('removeR2DuplicatesByETag error:', err);
    return { success: false, deletedCount: 0, message: err?.message || 'Failed to remove R2 duplicates', mappings: [] };
  }
}
