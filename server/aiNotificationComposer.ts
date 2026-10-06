/**
 * Unx Games - AI Broadcast & Notification Composer
 * Powered by Custom AI (nvidia/nemotron-3-ultra-550b-a55b:free) with Gemini Cascade
 * Strict English-only output for gaming promotions, announcements, maintenance & loyalty alerts.
 */

import { generateCustomAiCompletion } from './aiOpenRouter.js';

interface ComposeRequest {
  topic: string;
  tone?: 'hype' | 'urgent' | 'friendly' | 'official' | 'festive';
  targetAudience?: 'all' | 'gamers' | 'new_users' | 'vip';
  game?: string;
  promoCode?: string;
  discountPercent?: number;
}

interface ComposeResponse {
  title: string;
  message: string;
  suggestedType: 'announcement' | 'system' | 'order_completed' | 'payment_verified';
  suggestedActionType: 'game' | 'wallet' | 'orders' | 'coupons' | 'support' | 'none';
  suggestedActionLabel: string;
  suggestedPromoCode?: string;
}

export async function composeAiNotification(req: ComposeRequest): Promise<ComposeResponse> {
  const { topic, tone = 'hype', targetAudience = 'all', game, promoCode, discountPercent } = req;

  // Fallback defaults
  const fallbackPresets: Record<string, ComposeResponse> = {
    flash_sale: {
      title: `⚡ Flash Sale: ${game || 'Free Fire & PUBG'} Diamonds at Flat ${discountPercent || 10}% OFF!`,
      message: `Limited time gaming deals live on Unx Games! Use code ${promoCode || 'GAMEHUB10'} at checkout for instant delivery within 5 minutes.`,
      suggestedType: 'announcement',
      suggestedActionType: 'game',
      suggestedActionLabel: '⚡ Top Up Diamonds Now',
      suggestedPromoCode: promoCode || 'GAMEHUB10',
    },
    wallet_cashback: {
      title: '🎁 Weekend Wallet Bonus: Get 5% Extra Cash on Top-Up!',
      message: 'Top up your Unx Games wallet via eSewa or Khalti today and enjoy 5% instant bonus balance on all game packages.',
      suggestedType: 'announcement',
      suggestedActionType: 'wallet',
      suggestedActionLabel: '💳 Add Wallet Balance',
      suggestedPromoCode: 'CASHBACK5',
    },
    maintenance: {
      title: '⚙️ Scheduled System Maintenance Notice',
      message: 'Unx Games server upgrade scheduled tonight (2:00 AM - 3:00 AM NPT). Instant deliveries will resume immediately afterwards.',
      suggestedType: 'system',
      suggestedActionType: 'none',
      suggestedActionLabel: 'View Details',
    },
    default: {
      title: `🎮 Special Gaming Update: ${topic}`,
      message: `Exciting offers and instant top-ups are now available on Unx Games. Check out the latest rates and packages today!`,
      suggestedType: 'announcement',
      suggestedActionType: 'game',
      suggestedActionLabel: '🎮 Explore Store',
      suggestedPromoCode: promoCode,
    },
  };

  try {
    const prompt = `You are the Lead Marketing & Operations AI for "Unx Games" (Nepal's #1 trusted instant gaming top-up & vouchers platform).
Generate an ultra-engaging, concise in-app push notification for our customers based on the following details:

- Topic / Campaign: "${topic}"
- Tone: ${tone} (e.g. hype, urgent, friendly, official, festive)
- Target Audience: ${targetAudience}
${game ? `- Featured Game: ${game}` : ''}
${promoCode ? `- Promo Code: ${promoCode}` : ''}
${discountPercent ? `- Discount: ${discountPercent}%` : ''}

CRITICAL RULES:
1. OUTPUT MUST BE 100% ENGLISH ONLY. No Hindi, Nepali, or Romanized mixed terms.
2. Title must be catchy, punchy with 1-2 relevant gaming emojis (max 50 characters).
3. Message body must be crisp, clear, and compelling (maximum 160 characters).
4. Clearly state benefits (e.g., instant 5-min delivery, Nepal eSewa/Khalti, verified top-up).
5. Suggest the best action type from: "game", "wallet", "orders", "coupons", "support", "none".
6. Suggest a short button label (e.g., "⚡ Top Up Diamonds", "💳 Add Balance", "🎟️ View Coupons").

Respond STRICTLY with valid JSON only in this exact format:
{
  "title": "...",
  "message": "...",
  "suggestedType": "announcement" or "system" or "order_completed" or "payment_verified",
  "suggestedActionType": "game" or "wallet" or "orders" or "coupons" or "support" or "none",
  "suggestedActionLabel": "...",
  "suggestedPromoCode": "..."
}`;

    const aiRes = await generateCustomAiCompletion({
      systemInstruction: 'You are an expert gaming e-commerce marketing notification copywriter.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      responseFormat: 'json_object',
    });

    const text = aiRes.content || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      title: parsed.title || fallbackPresets.default.title,
      message: parsed.message || fallbackPresets.default.message,
      suggestedType: parsed.suggestedType || 'announcement',
      suggestedActionType: parsed.suggestedActionType || 'game',
      suggestedActionLabel: parsed.suggestedActionLabel || '⚡ View Offer',
      suggestedPromoCode: parsed.suggestedPromoCode || promoCode || undefined,
    };
  } catch (err: any) {
    console.warn('[AI Notification Composer] Exception:', err?.message || err);
    return fallbackPresets[topic] || fallbackPresets.default;
  }
}
