import { pool } from '../src/db/index.js';
import { db } from '../src/db/index.js';
import { reviews } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { generateCustomAiCompletion } from './aiOpenRouter.js';

export interface ReviewReplyInput {
  id?: string;
  userName?: string;
  productName?: string;
  packageName?: string;
  rating: number;
  comment?: string;
  isVerifiedBuyer?: boolean;
  userLocation?: string;
  orderId?: string;
}

export interface ReviewSettingsConfig {
  autoReplyEnabled: boolean;
  replyTone: 'professional' | 'gamer' | 'vip' | 'empathetic';
  signature: string;
  minRatingToReply: number;
  customPromptInstructions?: string;
}

const DEFAULT_SETTINGS: ReviewSettingsConfig = {
  autoReplyEnabled: true,
  replyTone: 'professional',
  signature: '— Unx Games Team 🎮',
  minRatingToReply: 1,
};

/**
 * Fetch authoritative Review Settings from PostgreSQL
 */
export async function getReviewSettings(): Promise<ReviewSettingsConfig> {
  try {
    const res = await pool.query(`
      SELECT * FROM review_settings WHERE id = 'default' LIMIT 1;
    `);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        autoReplyEnabled: row.auto_reply_enabled ?? true,
        replyTone: row.reply_tone || 'professional',
        signature: row.signature || '— Unx Games Team 🎮',
        minRatingToReply: row.min_rating_to_reply ?? 1,
        customPromptInstructions: row.custom_prompt_instructions || undefined,
      };
    }
  } catch (err) {
    console.warn('[ReviewAI] Could not fetch review_settings, using defaults:', err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Update Review Settings in PostgreSQL
 */
export async function updateReviewSettings(config: Partial<ReviewSettingsConfig>): Promise<ReviewSettingsConfig> {
  const current = await getReviewSettings();
  const next: ReviewSettingsConfig = {
    ...current,
    ...config,
  };

  try {
    await pool.query(
      `
      INSERT INTO review_settings (id, auto_reply_enabled, reply_tone, signature, min_rating_to_reply, custom_prompt_instructions, updated_at)
      VALUES ('default', $1, $2, $3, $4, $5, now())
      ON CONFLICT (id) DO UPDATE SET
        auto_reply_enabled = EXCLUDED.auto_reply_enabled,
        reply_tone = EXCLUDED.reply_tone,
        signature = EXCLUDED.signature,
        min_rating_to_reply = EXCLUDED.min_rating_to_reply,
        custom_prompt_instructions = EXCLUDED.custom_prompt_instructions,
        updated_at = now();
    `,
      [
        next.autoReplyEnabled,
        next.replyTone,
        next.signature,
        next.minRatingToReply,
        next.customPromptInstructions || null,
      ]
    );
  } catch (err) {
    console.error('[ReviewAI] Failed to save review_settings to database:', err);
  }

  return next;
}

/**
 * Intelligent English Fallback Reply Generator
 */
function generateContextualFallbackReply(
  input: ReviewReplyInput,
  tone: string = 'professional',
  signature: string = '— Unx Games Team 🎮'
): string {
  const name = (input.userName || 'Gamer').trim();
  const product = (input.productName || 'top-up').trim();
  const pkg = input.packageName ? ` (${input.packageName})` : '';
  const commentLower = (input.comment || '').toLowerCase();
  const rating = Number(input.rating) || 5;

  const isFastDelivery =
    commentLower.includes('fast') ||
    commentLower.includes('speed') ||
    commentLower.includes('instant') ||
    commentLower.includes('quick') ||
    commentLower.includes('min');

  const isPricingPraise =
    commentLower.includes('price') ||
    commentLower.includes('rate') ||
    commentLower.includes('cheap') ||
    commentLower.includes('discount') ||
    commentLower.includes('best');

  const isPaymentPraise =
    commentLower.includes('esewa') ||
    commentLower.includes('khalti') ||
    commentLower.includes('qr') ||
    commentLower.includes('payment') ||
    commentLower.includes('smooth');

  // 5-Star Reviews
  if (rating >= 5) {
    if (tone === 'gamer') {
      if (isFastDelivery) {
        return `GG ${name}! ⚡ Thrilled to hear your ${product}${pkg} arrived at lightning speed! Keep dominating the lobby and see you on the next top-up. ${signature}`;
      }
      return `Awesome feedback, ${name}! 🎮 We're hyped you had a top-tier experience with your ${product} top-up. Have a blast in your matches! ${signature}`;
    }

    if (tone === 'vip') {
      return `Dear ${name}, thank you for your stellar 5-star rating and continued trust in Unx Games. Delivering premium, seamless top-ups for ${product} is our greatest pleasure. ${signature}`;
    }

    // Default Professional
    if (isFastDelivery) {
      return `Thank you so much, ${name}! We pride ourselves on delivering instant top-ups in minutes. Enjoy your ${product}${pkg} and thank you for choosing Unx Games! ${signature}`;
    }
    if (isPricingPraise) {
      return `Thank you, ${name}! We are committed to offering the best rates and genuine packages for Nepali gamers. We appreciate your fantastic feedback! ${signature}`;
    }
    if (isPaymentPraise) {
      return `Thank you for your feedback, ${name}! We're delighted that our official QR payment and instant verification served you smoothly. Enjoy your ${product}! ${signature}`;
    }
    return `Thank you for your wonderful review, ${name}! We're delighted to provide fast and secure top-ups for ${product}. We look forward to serving you again soon! ${signature}`;
  }

  // 4-Star Reviews
  if (rating === 4) {
    if (tone === 'gamer') {
      return `Thanks for the solid 4 stars, ${name}! We're working continuously to make our top-up experience a complete 5/5 for you next time. Happy gaming with your ${product}! ${signature}`;
    }
    return `Thank you for your great rating, ${name}! We are glad you enjoyed your ${product} top-up experience and will keep improving our service to make your next visit 5-star perfection. ${signature}`;
  }

  // 3-Star Reviews
  if (rating === 3) {
    return `Hello ${name}, thank you for your honest feedback regarding your ${product} order. We continuously strive for excellence—if there is anything we can improve or if you need assistance, please feel free to reach out to our 24/7 support. ${signature}`;
  }

  // 1-2 Star Reviews (Support & Care)
  return `Dear ${name}, we sincerely apologize that your experience with your ${product} top-up did not meet our usual high standards. Your satisfaction is our highest priority. Please reach out directly to our 24/7 support on WhatsApp/Viber at 9768914027 so we can make this right for you immediately. ${signature}`;
}

/**
 * Generate a high-craft, professional AI Review Response using Gemini with resilient Fallback
 */
export async function generateAiReviewReply(
  input: ReviewReplyInput,
  overrideTone?: string
): Promise<string> {
  const settings = await getReviewSettings();
  const tone = overrideTone || settings.replyTone || 'professional';
  const signature = settings.signature || '— Unx Games Team 🎮';

  try {
    const toneInstructions = {
      professional: 'Professional, courteous, appreciative, and clear executive customer service tone.',
      gamer: 'Energetic, friendly gaming camaraderie tone with gaming terms (GG, lobby, clutch, level up).',
      vip: 'Polite, refined, high-touch VIP concierge tone.',
      empathetic: 'Warm, highly supportive, solution-oriented customer care tone.',
    }[tone] || 'Professional, courteous, and appreciative tone.';

    const prompt = `You are the official Customer Experience AI for Unx Games (Nepal's #1 trusted gaming top-up store).
Generate an authentic, professional, and warm official reply in ENGLISH ONLY on behalf of Unx Games to the following customer review.

CUSTOMER REVIEW DETAILS:
- Customer Name: ${input.userName || 'Valued Customer'}
- Product / Game: ${input.productName || 'Game Top-Up'}
- Package: ${input.packageName || 'Standard Package'}
- Star Rating: ${input.rating} out of 5
- Customer Comment: "${input.comment || 'No comment provided'}"
- Verified Buyer: ${input.isVerifiedBuyer !== false ? 'Yes (Verified completed order)' : 'Standard'}
- Location: ${input.userLocation || 'Nepal'}
- Order Reference: ${input.orderId ? `Order #${input.orderId}` : 'Direct Top-Up'}

STRICT MANDATORY RULES:
1. LANGUAGE: Response MUST be 100% in ENGLISH ONLY. Never use Nepali, Hindi, or mixed words.
2. TONE: ${toneInstructions}
3. CONTEXTUAL ACCURACY: Reference their specific product (${input.productName || 'top-up'}), package if available (${input.packageName || 'package'}), and acknowledge key points mentioned in their comment (such as fast delivery, smooth payment, or support).
4. FOR 4-5 STARS: Warmly thank them for trusting Unx Games, celebrate their gaming session, and invite them back.
5. FOR 1-3 STARS: Express sincere empathy, apologize for any inconvenience, and invite them to connect with our 24/7 Live Support (WhatsApp/Viber 9768914027) so we can assist immediately.
6. LENGTH: Keep it concise, punchy, and polished (2 to 3 sentences maximum).
7. SIGNATURE: Conclude naturally with the signature: "${signature}".
8. FORMAT: Output plain text only without quotation marks around the entire message.`;

    const aiRes = await generateCustomAiCompletion({
      systemInstruction: 'You are the official Customer Experience AI for Unx Games (Nepal trusted gaming store).',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
    });

    const replyText = aiRes.content?.trim();
    if (replyText && replyText.length > 15) {
      return replyText;
    }
  } catch (err: any) {
    console.warn('[ReviewAI] AI failed, falling back to contextual generator:', err?.message || err);
  }

  // Resilient Contextual Fallback
  return generateContextualFallbackReply(input, tone, signature);
}

/**
 * Automatically evaluates and replies to a review if auto-reply is enabled in settings
 */
export async function autoReplyToReviewIfEnabled(
  reviewId: string,
  reviewData: ReviewReplyInput
): Promise<{ replied: boolean; replyText?: string }> {
  try {
    const settings = await getReviewSettings();

    // Check if auto-reply is enabled and review rating satisfies threshold
    if (!settings.autoReplyEnabled) {
      return { replied: false };
    }

    if (reviewData.rating < settings.minRatingToReply) {
      return { replied: false };
    }

    // Generate AI Reply
    const generatedReply = await generateAiReviewReply(reviewData, settings.replyTone);
    if (!generatedReply) {
      return { replied: false };
    }

    // Save to Database
    const now = new Date();
    await db
      .update(reviews)
      .set({
        admin_reply: generatedReply,
        admin_reply_at: now,
        updatedAt: now,
      })
      .where(eq(reviews.id, reviewId));

    console.log(`[ReviewAI] Successfully auto-replied to review ${reviewId} for ${reviewData.userName}`);
    return { replied: true, replyText: generatedReply };
  } catch (err) {
    console.error(`[ReviewAI] Error in autoReplyToReviewIfEnabled for ${reviewId}:`, err);
    return { replied: false };
  }
}
