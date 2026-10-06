import { generateCustomAiCompletion } from './aiOpenRouter.js';

export interface GenerateProductContentInput {
  name: string;
  category?: string;
  gameName?: string;
  price?: number;
  packagesCount?: number;
  language?: 'en' | 'np' | 'mixed';
}

export interface GeneratedProductContent {
  description: string;
  shortDescription: string;
  metaKeywords: string[];
  suggestedBadges: string[];
  topUpInstructions: string;
}

export async function generateProductContent(input: GenerateProductContentInput): Promise<GeneratedProductContent> {
  const prompt = `You are the lead gaming product marketing specialist for Unx Games (Nepal's premier gaming top-up store).
Generate compelling, gamer-centric product content for the following game item.

GAME PRODUCT DETAILS:
- Product Name: ${input.name}
- Game Name: ${input.gameName || input.name}
- Category: ${input.category || 'Mobile Games'}
- Base Price: NPR Rs. ${input.price || 50}

OUTPUT FORMAT: Return a valid JSON object ONLY with the following schema:
{
  "description": "Engaging, professional 2-3 paragraph product description highlighting genuine publisher credits, 5-15 minute instant delivery, safe Nepal payments (eSewa/Khalti QR), zero ban risk, and 24/7 customer support.",
  "shortDescription": "One-sentence high-impact tagline.",
  "metaKeywords": ["array", "of", "6-8", "relevant", "nepal", "gaming", "seo", "tags"],
  "suggestedBadges": ["3-4 short uppercase promo badges, e.g. BESTSELLER, INSTANT, HOT DEAL, 100% SAFE"],
  "topUpInstructions": "Clear 4-step guide for Nepali players to find their Player UID and receive top-up."
}`;

  try {
    const aiRes = await generateCustomAiCompletion({
      systemInstruction: 'You are an expert gaming e-commerce copywriter. Output strictly valid JSON without Markdown backticks.',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      responseFormat: 'json_object',
    });

    const text = aiRes.content || '';
    const parsed = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

    return {
      description: parsed.description || `Instant and genuine ${input.name} top-up for gamers across Nepal with 5-15 minute delivery.`,
      shortDescription: parsed.shortDescription || `Top up ${input.name} instantly with eSewa & Khalti.`,
      metaKeywords: Array.isArray(parsed.metaKeywords) ? parsed.metaKeywords : [`${input.name} top up nepal`, 'unx games'],
      suggestedBadges: Array.isArray(parsed.suggestedBadges) ? parsed.suggestedBadges : ['HOT', 'INSTANT', '100% SAFE'],
      topUpInstructions: parsed.topUpInstructions || '1. Enter your Game UID\n2. Select package\n3. Scan eSewa QR\n4. Enjoy instant delivery in 5-15 minutes.',
    };
  } catch (err) {
    console.warn('[AI Product Gen] Fallback used due to error:', err);
    return {
      description: `Official instant top-up service for ${input.name || 'Game'}. Secure and reliable delivery with eSewa, Khalti, and IME Pay in Nepal. Direct Player UID credit in 5-15 minutes.`,
      shortDescription: `Fast, genuine ${input.name} instant top-up in Nepal.`,
      metaKeywords: [`${input.name} top up nepal`, `${input.name} esewa`, 'unx games'],
      suggestedBadges: ['POPULAR', 'INSTANT DELIVERY', 'OFFICIAL'],
      topUpInstructions: '1. Enter your Game Player ID / UID.\n2. Select your desired package.\n3. Pay seamlessly via eSewa QR Scan.\n4. Delivered to your game account in 5-15 minutes.',
    };
  }
}
