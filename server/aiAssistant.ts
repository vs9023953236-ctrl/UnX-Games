import { pool } from '../src/db/index.js';
import { generateCustomAiCompletion, getGlobalAiConfig } from './aiOpenRouter.js';

export interface AssistantMessage {
  role: 'user' | 'assistant' | 'model' | 'system';
  content: string;
  reasoning_details?: unknown;
}

export interface AssistantAction {
  label: string;
  type: 'navigate' | 'external_link' | 'quick_send';
  target?: string;
}

export interface ProductCardData {
  id: string;
  name: string;
  category?: string;
  gameId?: string;
  packages: Array<{
    id: string;
    name: string;
    price: number;
    amount?: number;
    badge?: string;
  }>;
}

export interface PaymentInfoData {
  esewaId?: string;
  esewaName?: string;
  khaltiId?: string;
  khaltiName?: string;
  supportPhone?: string;
  bankName?: string;
  bankAccount?: string;
}

export interface AssistantResponse {
  reply: string;
  reasoning_details?: unknown;
  actions?: AssistantAction[];
  detectedIntent?: string;
  orderInfo?: any;
  productCard?: ProductCardData | null;
  paymentInfo?: PaymentInfoData | null;
  modelUsed?: string;
}

export interface AssistantRequest {
  messages: AssistantMessage[];
  userContext?: {
    id?: string;
    userId?: string;
    name?: string;
    email?: string;
    walletBalance?: number;
    currentTab?: string;
  };
}

function cleanModelId(raw: string): string {
  if (!raw) return 'nvidia/nemotron-3-ultra-550b-a55b:free';
  let m = raw.trim();
  m = m.replace(/^model\s*:\s*/i, '');
  m = m.replace(/^['"]+|['"]+$/g, '').trim();
  return m || 'nvidia/nemotron-3-ultra-550b-a55b:free';
}

function cleanApiKey(raw: string): string {
  if (!raw) return '';
  let k = raw.trim();
  k = k.replace(/^apiKey\s*:\s*/i, '');
  k = k.replace(/^['"]+|['"]+$/g, '').trim();
  return k;
}

// Retrieve custom OpenRouter AI config from settings table or environment
export async function getCustomAiConfig(): Promise<{
  apiKey: string;
  model: string;
  reasoningEnabled: boolean;
}> {
  let dbApiKey = '';
  let dbModel = '';
  let dbReasoning = true;

  try {
    const res = await pool.query(
      `SELECT key, value FROM settings WHERE key IN ('openrouter_api_key', 'openrouter_model', 'openrouter_reasoning_enabled')`
    );
    for (const row of res.rows) {
      if (row.key === 'openrouter_api_key') dbApiKey = row.value || '';
      if (row.key === 'openrouter_model') dbModel = row.value || '';
      if (row.key === 'openrouter_reasoning_enabled') dbReasoning = row.value !== 'false';
    }
  } catch (_) {
    // If settings query fails, continue with env
  }

  const apiKey = cleanApiKey(process.env.OPENROUTER_API_KEY || dbApiKey || '');
  const model = cleanModelId(process.env.OPENROUTER_MODEL || dbModel || 'nvidia/nemotron-3-ultra-550b-a55b:free');

  return {
    apiKey,
    model,
    reasoningEnabled: dbReasoning,
  };
}

// Update custom OpenRouter AI config in database settings
export async function updateCustomAiConfig(config: {
  apiKey?: string;
  model?: string;
  reasoningEnabled?: boolean;
}): Promise<boolean> {
  try {
    if (config.apiKey !== undefined) {
      await pool.query(
        `INSERT INTO settings (id, key, value, type, updated_at)
         VALUES ('openrouter_api_key', 'openrouter_api_key', $1, 'string', NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [config.apiKey.trim()]
      );
    }
    if (config.model !== undefined) {
      await pool.query(
        `INSERT INTO settings (id, key, value, type, updated_at)
         VALUES ('openrouter_model', 'openrouter_model', $1, 'string', NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [config.model.trim()]
      );
    }
    if (config.reasoningEnabled !== undefined) {
      await pool.query(
        `INSERT INTO settings (id, key, value, type, updated_at)
         VALUES ('openrouter_reasoning_enabled', 'openrouter_reasoning_enabled', $1, 'boolean', NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [String(config.reasoningEnabled)]
      );
    }
    return true;
  } catch (err) {
    console.warn('[Custom AI] Config update note:', err);
    return false;
  }
}

// Helper to extract Order Codes, Phone Numbers (e.g. 9768914027), or UIDs
function extractOrderCode(text: string): string | null {
  if (!text) return null;
  // 1. Order Code prefix (e.g. UNX-X2GQZ8Z9, GHN-1024, ORD-9921)
  const match = text.match(/(?:GHN|ORD|UNX)[-_]?[A-Z0-9]{3,14}/i);
  if (match) return match[0].toUpperCase();

  // 2. Hash Code (e.g. #UNX1024)
  const hashMatch = text.match(/#([A-Z0-9]{3,14})\b/i);
  if (hashMatch && hashMatch[1]) return hashMatch[1].toUpperCase();

  // 3. Mobile Phone Numbers (10 digits starting with 9, e.g., 9768914027, 9800000000)
  const phoneMatch = text.match(/\b(?:\+?977)?(9[78]\d{8})\b/);
  if (phoneMatch && phoneMatch[1]) return phoneMatch[1];

  // 4. Standalone numbers (4 to 12 digits, e.g. UIDs, Order numbers)
  const numMatch = text.match(/\b\d{4,12}\b/);
  if (numMatch) return numMatch[0];

  return null;
}

// Helper to find best matching product from user query
function findMatchingProduct(query: string, products: any[]): any | null {
  const q = query.toLowerCase();
  for (const p of products) {
    const pName = (p.name || '').toLowerCase();
    const pSlug = (p.slug || '').toLowerCase();
    const pCat = (p.category_name || '').toLowerCase();

    if ((q.includes('free fire') || q.includes('diamond') || q.includes('ff')) && pName.includes('free fire')) return p;
    if ((q.includes('pubg') || q.includes('uc') || q.includes('bgmi')) && pName.includes('pubg')) return p;
    if ((q.includes('robux') || q.includes('roblox')) && (pName.includes('roblox') || pName.includes('robux'))) return p;
    if ((q.includes('mlbb') || q.includes('mobile legends')) && pName.includes('mobile legends')) return p;
    if ((q.includes('valorant') || q.includes('vp')) && pName.includes('valorant')) return p;
    if ((q.includes('clash') || q.includes('gems')) && pName.includes('clash')) return p;
    if (q.includes('genshin') && pName.includes('genshin')) return p;
    if ((q.includes('cod') || q.includes('cp')) && (pName.includes('call of duty') || pName.includes('cod'))) return p;

    if (q.includes(pName) || pName.includes(q)) return p;
    if (pSlug && q.includes(pSlug)) return p;
    if (pCat && q.includes(pCat)) return p;
  }
  return null;
}

// Real-time live context query directly from PostgreSQL / Supabase
export async function getLiveStoreContext(
  userContext?: AssistantRequest['userContext'],
  userQuery: string = '',
  conversationHistory: AssistantMessage[] = []
) {
  let productsList: any[] = [];
  let paymentSettings: any = null;
  let matchedOrders: any[] = [];
  let userRecentOrders: any[] = [];

  try {
    // 1. Fetch real active products & packages from PostgreSQL / Supabase
    const prodRes = await pool.query(`
      SELECT p.id, p.name, p.slug, c.name as category_name, p.game_id,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pkg.id,
              'name', pkg.name,
              'price', pkg.price,
              'amount', pkg.amount,
              'badge', pkg.badge
            ) ORDER BY pkg.display_order ASC, pkg.price ASC
          ) FROM product_packages pkg WHERE pkg.product_id = p.id AND pkg.active IS NOT FALSE),
          '[]'::json
        ) as packages
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.archived IS NOT TRUE AND p.active IS NOT FALSE
      ORDER BY p.display_order ASC
      LIMIT 30
    `);
    productsList = prodRes.rows || [];
  } catch (err) {
    console.warn('[AI Assistant] Products query note:', err);
  }

  try {
    // 2. Fetch live payment settings from PostgreSQL / Supabase
    const payRes = await pool.query(`SELECT * FROM payment_settings LIMIT 1`);
    if (payRes.rows && payRes.rows[0]) {
      paymentSettings = payRes.rows[0];
    }
  } catch (err) {
    console.warn('[AI Assistant] Payment settings query note:', err);
  }

  // 3. Scan user query AND conversation history for Order Code / Mobile Number / Player UID
  let combinedQuery = userQuery;
  if (conversationHistory.length > 0) {
    const recentUserMsgs = conversationHistory
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .slice(-3)
      .join(' ');
    combinedQuery = `${recentUserMsgs} ${userQuery}`;
  }

  const extractedCode = extractOrderCode(userQuery) || extractOrderCode(combinedQuery);
  if (extractedCode) {
    try {
      const ordRes = await pool.query(
        `SELECT o.id, o.order_code, o.order_number, o.order_status, o.payment_status,
                o.total_amount, o.game_uid, o.created_at, o.rejection_reason,
                o.customer_phone_snapshot, o.customer_email_snapshot,
                p.name as product_name, pkg.name as package_name,
                pay.method as payment_method
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         LEFT JOIN product_packages pkg ON o.package_id = pkg.id
         LEFT JOIN LATERAL (
           SELECT method FROM payments
           WHERE order_id = o.id OR order_id = o.order_code OR id = o.payment_id
           ORDER BY created_at DESC LIMIT 1
         ) pay ON true
         WHERE UPPER(o.order_code) = $1 
            OR UPPER(o.order_number) = $1 
            OR UPPER(o.id) = $1 
            OR o.order_code ILIKE '%' || $1 || '%'
            OR o.customer_phone_snapshot ILIKE '%' || $1 || '%'
            OR o.game_uid ILIKE '%' || $1 || '%'
         ORDER BY o.created_at DESC
         LIMIT 5`,
        [extractedCode]
      );
      matchedOrders = ordRes.rows || [];
    } catch (err) {
      console.warn('[AI Assistant] Order lookup query note:', err);
    }
  }

  // 4. If customer is authenticated, fetch their latest orders
  const custId = userContext?.userId || userContext?.id;
  if (custId && custId !== '00000000-0000-0000-0000-000000000000') {
    try {
      const myOrdRes = await pool.query(
        `SELECT o.id, o.order_code, o.order_number, o.order_status, o.payment_status,
                o.total_amount, o.game_uid, o.created_at, o.rejection_reason,
                p.name as product_name, pkg.name as package_name,
                pay.method as payment_method
         FROM orders o
         LEFT JOIN products p ON o.product_id = p.id
         LEFT JOIN product_packages pkg ON o.package_id = pkg.id
         LEFT JOIN LATERAL (
           SELECT method FROM payments
           WHERE order_id = o.id OR order_id = o.order_code OR id = o.payment_id
           ORDER BY created_at DESC LIMIT 1
         ) pay ON true
         WHERE o.customer_id::text = $1 OR o.customer_email_snapshot = $2
         ORDER BY o.created_at DESC
         LIMIT 5`,
        [custId, userContext?.email || '']
      );
      userRecentOrders = myOrdRes.rows || [];
    } catch (err) {
      console.warn('[AI Assistant] Recent orders query note:', err);
    }
  }

  return {
    productsList,
    paymentSettings,
    matchedOrders,
    userRecentOrders,
    extractedCode,
  };
}

// Intelligent human-like fallback strictly adhering to user intent & language matching
function buildIntelligentFallback(
  userQuery: string,
  context: Awaited<ReturnType<typeof getLiveStoreContext>>,
  userContext?: AssistantRequest['userContext']
): AssistantResponse {
  const q = userQuery.toLowerCase().trim();
  const custName = userContext?.name ? userContext.name.split(' ')[0] : 'Sir';

  const isEnglish = !(
    q.includes('namaste') ||
    q.includes('k cha') ||
    q.includes('k chha') ||
    q.includes('kasto') ||
    q.includes('mero') ||
    q.includes('bhayo') ||
    q.includes('aayena') ||
    q.includes('kasari') ||
    q.includes('tirne') ||
    q.includes('garnus') ||
    q.includes('parcha') ||
    q.includes('kata') ||
    q.includes('huncha') ||
    q.includes('hajur') ||
    q.includes('tapai') ||
    q.includes('chaiyo') ||
    q.includes('kinne') ||
    q.includes('bhan') ||
    q.includes('kaise') ||
    q.includes('kya') ||
    q.includes('bhai')
  );

  const defaultPaymentInfo: PaymentInfoData = {
    esewaId: context.paymentSettings?.esewa_id || '9768914027',
    esewaName: context.paymentSettings?.esewa_name || 'BINOD THALAL (UNX GAMES)',
    khaltiId: context.paymentSettings?.khalti_id || '9768914027',
    khaltiName: context.paymentSettings?.khalti_name || 'UNX GAMES OFFICIAL',
    supportPhone: '9768914027',
  };

  // 1. Natural Human Greeting Intent
  const greetings = ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'k cha', 'k chha', 'kasto cha', 'good morning', 'good evening', 'salam', 'hola', 'yo', 'sup'];
  if (greetings.some(g => q === g || q.startsWith(g + ' ') || q.startsWith(g + '!') || q.startsWith(g + '?') || q.startsWith(g + '.'))) {
    return {
      reply: isEnglish
        ? `Hello ${custName}! 👋 I am Alex, your UnX Gaming Support Assistant. How can I help you today?`
        : `Namaste ${custName}! 👋 Ma Alex, UnX Gaming Support. Aaj kun game ko top-up garne ho ya order track garna cha?`,
      detectedIntent: 'greeting',
    };
  }

  // 2. Specific Game Matching (Free Fire, PUBG, Robux, etc.)
  const matchedProd = findMatchingProduct(q, context.productsList);
  if (matchedProd) {
    const minPkg = matchedProd.packages?.[0];
    const priceText = minPkg ? `starting from Rs. ${minPkg.price}` : 'starting at best price';
    return {
      reply: isEnglish
        ? `Here are the latest live rates for **${matchedProd.name}** in the card below (${priceText}). Delivery is instant within 5–15 minutes to your Player UID!`
        : `Hajur sir! **${matchedProd.name}** ko latest live rates tala card ma cha (${priceText}). Delivery instant 5–15 min ma Player UID ma huncha!`,
      detectedIntent: 'product_rates',
      productCard: {
        id: matchedProd.id,
        name: matchedProd.name,
        category: matchedProd.category_name,
        packages: (matchedProd.packages || []).slice(0, 8),
      },
    };
  }

  // 3. Specific Owner / Founder Query Intent
  if (q.includes('owner') || q.includes('creator') || q.includes('founder') || q.includes('malik') || q.includes('boss') || q.includes('binod')) {
    return {
      reply: isEnglish
        ? `Unx Games is owned and managed by **Binod Thalal** (+977-9768914027). You can contact him directly on WhatsApp for official business or support! 👑`
        : `Unx Games ko owner **Binod Thalal** (+977-9768914027) hununhuncha sir! Kunai official inquiry ko lagi WhatsApp ma chat garna saknuhuncha! 👑`,
      detectedIntent: 'owner_query',
      actions: [{ label: 'WhatsApp Owner', type: 'external_link', target: 'https://wa.me/9779768914027' }],
    };
  }

  // 4. Specific Order Search with Extracted Code/Phone/UID
  if (context.extractedCode) {
    if (context.matchedOrders.length > 0) {
      const order = context.matchedOrders[0];
      const code = order.order_code || order.order_number || order.id?.slice(0, 8);
      const status = order.order_status?.toUpperCase() || 'PROCESSING';
      const uid = order.game_uid || 'N/A';
      const item = order.package_name || order.product_name || 'Game Topup';
      return {
        reply: isEnglish
          ? `Found Order **#${code}** (${item})! Status: **${status}**. Player UID: \`${uid}\`. Delivery time is 5–15 minutes!`
          : `Sir, Order **#${code}** (${item}) ko status **${status}** cha! UID: \`${uid}\`. Delivery 5–15 min bhitra huncha.`,
        orderInfo: order,
        detectedIntent: 'order_status',
        actions: [{ label: 'View Orders', type: 'navigate', target: 'orders' }],
      };
    } else {
      return {
        reply: isEnglish
          ? `I searched our database for **${context.extractedCode}**, but couldn't find any orders matching this Order Code / Phone / UID. Please verify your details or contact manager (+977-9768914027)!`
          : `Sir, hamro database ma **${context.extractedCode}** ko kunai order bhetiyenah. Kripaya Order Code ya mobile number verify garnus!`,
        detectedIntent: 'order_not_found',
        actions: [{ label: 'WhatsApp Manager', type: 'external_link', target: 'https://wa.me/9779768914027' }],
      };
    }
  }

  // 5. Order Tracking / Status Intent (ONLY if query specifically asks about orders)
  const isOrderQuery =
    q.includes('order') ||
    q.includes('track') ||
    q.includes('mero order') ||
    q.includes('aayena') ||
    q.includes('status') ||
    q.includes('k bhayo') ||
    q.includes('check my order') ||
    q.includes('my order');

  if (isOrderQuery) {
    const order = context.matchedOrders[0] || context.userRecentOrders[0];
    if (order) {
      const code = order.order_code || order.order_number || order.id?.slice(0, 8);
      const status = order.order_status?.toUpperCase() || 'PROCESSING';
      const uid = order.game_uid || 'N/A';
      return {
        reply: isEnglish
          ? `Your recent Order **#${code}** status is **${status}**. Player UID: \`${uid}\`. Delivery completes within 5–15 minutes!`
          : `Sir, tapai ko Order **#${code}** ko status **${status}** cha! UID: \`${uid}\`. Delivery 5–15 min bhitra complete huncha.`,
        orderInfo: order,
        detectedIntent: 'order_status',
      };
    }

    return {
      reply: isEnglish
        ? `To track your order, please provide your **Order Code** (e.g. \`UNX-XXXX\`) or registered mobile number!`
        : `Namaste sir! Tapai ko order check garna kripaya tapai ko **Order ID** (e.g. \`UNX-XXXX\`) ya registered mobile number bhannus na, ma turuntai status check garchu!`,
      detectedIntent: 'ask_order_code',
    };
  }

  // 4. Payment Steps / eSewa / Khalti Intent
  if (q.includes('esewa') || q.includes('khalti') || q.includes('qr') || q.includes('payment') || q.includes('kaise pay') || q.includes('kasari tirne') || q.includes('tirne tarika') || q.includes('pay garne')) {
    return {
      reply: isEnglish
        ? `You can scan the official eSewa or Khalti QR code in the card below and paste the **Ref ID** into your checkout order! 💳`
        : `Hajur sir! Tala ko card bata eSewa / Khalti QR ma payment garera receipt ko **Ref ID** order checkout ma paste garnus, 5-15 min ma top-up hunchha! 💳`,
      detectedIntent: 'payment_guide',
      paymentInfo: defaultPaymentInfo,
    };
  }

  // 5. Delivery Speed / Time Queries
  if (q.includes('delivery') || q.includes('time') || q.includes('kati time') || q.includes('kitna time') || q.includes('kab aayega') || q.includes('speed') || q.includes('fast')) {
    return {
      reply: isEnglish
        ? `Our standard delivery speed is **5 to 15 minutes** directly to your in-game Player UID upon payment verification! ⚡`
        : `Sir, hamro standard delivery speed **5 dekhi 15 minute** bhitra huncha! ⚡ Payment verify hune bittikai Player UID ma direct transfer huncha.`,
      detectedIntent: 'delivery_speed',
    };
  }

  // 6. Finding UID Guide Intent
  if (q.includes('uid') || q.includes('player id') || q.includes('character id') || q.includes('kata huncha') || q.includes('kaha milega') || q.includes('kasari herne')) {
    return {
      reply: isEnglish
        ? `In Free Fire, your numeric UID is found under your profile icon (top-left). In PUBG Mobile, it is the Character ID under your avatar. Copy and paste it in checkout!`
        : `Free Fire ma top-left profile icon muni numeric UID huncha sir, PUBG ma banner muni 10-digit Character ID huncha! Copy garera order form ma halnus.`,
      detectedIntent: 'uid_guide',
    };
  }

  // 7. General Pricing / Rate List Intent
  if (q.includes('rate') || q.includes('price') || q.includes('bhav') || q.includes('kati parcha') || q.includes('catalog')) {
    const firstProd = (context.productsList || [])[0];
    return {
      reply: isEnglish
        ? `We offer Free Fire Diamonds, PUBG Mobile UC, Roblox Robux, and Mobile Legends top-ups. Which game's rates would you like to view?`
        : `Hajur sir! Hamro store ma Free Fire, PUBG Mobile, Roblox Robux, MLBB available cha. Kun game ko rates chaiyeko ho, name bhannus na!`,
      detectedIntent: 'pricing_catalog',
      productCard: firstProd ? {
        id: firstProd.id,
        name: firstProd.name,
        category: firstProd.category_name,
        packages: (firstProd.packages || []).slice(0, 8),
      } : null,
    };
  }

  // 8. Contact Human Support / WhatsApp Intent
  if (q.includes('admin') || q.includes('human') || q.includes('support') || q.includes('contact') || q.includes('whatsapp') || q.includes('phone') || q.includes('number')) {
    return {
      reply: isEnglish
        ? `To chat directly with our human store manager on WhatsApp (+977-9768914027), please tap the WhatsApp button above! 👤`
        : `Hajur sir! Hamro human store manager (+977-9768914027) sanga sidhai chat garna mathi ko WhatsApp button tap garnus! 👤`,
      detectedIntent: 'human_support',
    };
  }

  // 9. Conversational Default
  return {
    reply: isEnglish
      ? `Hello ${custName}! 🙏 How can I help you today? Feel free to ask about diamond/UC rates, order status, or payment guides!`
      : `Namaste ${custName}! 🙏 Ma tapailai k ma sahayog garam? Kunai game ko diamond/UC rates janna cha ya order track garnu cha bhane bhannus na!`,
    detectedIntent: 'general_welcome',
  };
}

export async function handleAssistantChat(req: AssistantRequest): Promise<AssistantResponse> {
  const userMessages = req.messages.filter(m => m.role === 'user');
  const lastUserMsg = userMessages[userMessages.length - 1]?.content || 'Hello';

  // 1. Fetch live PostgreSQL context (products, real prices, payment info, order status)
  const context = await getLiveStoreContext(req.userContext, lastUserMsg, req.messages);

  // Check matching product & payment info to attach to rich UI
  const matchedProd = findMatchingProduct(lastUserMsg, context.productsList);
  const targetOrder = context.matchedOrders[0] || (lastUserMsg.toLowerCase().includes('order') ? context.userRecentOrders[0] : null);

  const paymentInfo: PaymentInfoData = {
    esewaId: context.paymentSettings?.esewa_id || '9768914027',
    esewaName: context.paymentSettings?.esewa_name || 'BINOD THALAL (UNX GAMES)',
    khaltiId: context.paymentSettings?.khalti_id || '9768914027',
    khaltiName: context.paymentSettings?.khalti_name || 'UNX GAMES OFFICIAL',
    supportPhone: '9768914027',
  };

  const productCard: ProductCardData | null = matchedProd ? {
    id: matchedProd.id,
    name: matchedProd.name,
    category: matchedProd.category_name,
    packages: (matchedProd.packages || []).slice(0, 8),
  } : null;

  // Format products catalog string from live database
  const catalogSummary = (context.productsList || []).map(p => {
    const pkgDetails = (p.packages || []).map((pkg: any) => `${pkg.name}: Rs.${pkg.price}`).join(', ');
    return `• ${p.name} (${p.category_name || 'Game'}): [${pkgDetails}]`;
  }).join('\n');

  // Format orders context if any
  let orderContextStr = 'No specific order searched yet.';
  if (context.matchedOrders.length > 0) {
    orderContextStr = `MATCHED ORDERS IN DATABASE FOR QUERY:\n` + context.matchedOrders.map(o => 
      `Order #${o.order_code || o.order_number || o.id}: Status=${o.order_status}, Payment=${o.payment_status}, Item=${o.package_name || o.product_name}, UID=${o.game_uid}, Amount=NPR ${o.total_amount}, RejectionReason=${o.rejection_reason || 'None'}`
    ).join('\n');
  } else if (context.userRecentOrders.length > 0) {
    orderContextStr = `CUSTOMER'S RECENT ORDERS IN DATABASE:\n` + context.userRecentOrders.map(o => 
      `Order #${o.order_code || o.order_number || o.id}: Status=${o.order_status}, Payment=${o.payment_status}, Item=${o.package_name || o.product_name}, UID=${o.game_uid}, Amount=NPR ${o.total_amount}, RejectionReason=${o.rejection_reason || 'None'}`
    ).join('\n');
  }

  const systemInstruction = `You are "Alex", powered by NVIDIA Nemotron 3 Ultra (550B MoE) — senior AI customer care lead at Unx Games (Nepal's #1 gaming top-up store).
You possess ChatGPT & Gemini level conversational intelligence, deep natural language fluency, and real-time live database context.

CRITICAL DIRECTIVES:
1. PRECISE & DIRECT (1 TO 2 SHORT CLEAR SENTENCES):
   - Answer EXACTLY what the user asks. Analyze what the user's message is actually asking.
   - If user asks about Free Fire diamonds or rates: State that the latest rates are displayed below in the live card, and ask which pack they want.
   - If user asks about PUBG UC, Robux, MLBB: State rates directly from the live database.
   - If user asks about their order: State the exact status from the LIVE DATABASE ORDER STATUS CONTEXT.
   - If user asks how to pay: Explain in 1 short sentence to pay via eSewa or Khalti QR and enter the Ref ID in checkout.
   - If user asks delivery time: "Hamro delivery 5 dekhi 15 minute bhitra sidhai tapai ko Player UID ma huncha sir!"
   - If user asks casual gaming, general questions, or tech/AI questions: Answer intelligently, accurately, and politely like ChatGPT / Gemini.
   - Do NOT write huge paragraphs or giant bullet lists. The mobile app automatically renders interactive cards right below your message!

2. STRICT DYNAMIC LANGUAGE MATCHING:
   - If user writes in English (e.g., "Hello", "What is the price of Free Fire diamonds?", "How to track order?"): ALWAYS REPLY IN CRISP, POLITE ENGLISH.
   - If user writes in Nepali / Romanized Nepali (e.g., "Namaste", "Mero order k bhayo?", "Free fire ko rate k cha?"): ALWAYS REPLY IN NATURAL SPOKEN ROMANIZED NEPALI.
   - If user writes in Hindi / Hinglish: ALWAYS REPLY IN CLEAN HINDI / HINGLISH.
   - ALWAYS MATCH the exact language the user used in their latest message!

3. UNX GAMES STORE DATA & KNOWLEDGE:
   - Currency: Nepalese Rupee (NPR / Rs.).
   - Payment Methods: Official eSewa QR, Khalti QR, Gamer Wallet, Mobile Banking.
   - Delivery Speed: 5–15 Minutes directly via Player UID.
   - Official WhatsApp Support Hotline: +977-9768914027.

LIVE DATABASE PRODUCTS & REAL RATES:
${catalogSummary || 'Products are retrieved live from PostgreSQL.'}

LIVE DATABASE ORDER STATUS CONTEXT:
${orderContextStr}`;

  // =========================================================================
  // PRIORITY 1: LIVE MULTI-MODEL AI API ENGINE (OpenRouter + Gemini Cascade)
  // =========================================================================
  try {
    const aiResult = await generateCustomAiCompletion({
      systemInstruction,
      messages: req.messages,
      temperature: 0.35,
      responseFormat: 'text',
    });

    if (aiResult && aiResult.content && aiResult.content.trim()) {
      const replyText = aiResult.content.trim();
      const lowerReply = replyText.toLowerCase();
      const lowerLast = lastUserMsg.toLowerCase();

      const actions: AssistantAction[] = [];
      if (context.matchedOrders.length > 0 || lowerReply.includes('order') || lowerLast.includes('order')) {
        actions.push({ label: 'View Orders', type: 'navigate', target: 'orders' });
      }
      if (matchedProd) {
        actions.push({ label: `Order ${matchedProd.name}`, type: 'navigate', target: 'shop' });
      } else if (lowerReply.includes('store') || lowerReply.includes('shop') || lowerLast.includes('rate') || lowerLast.includes('price')) {
        actions.push({ label: 'Open Store', type: 'navigate', target: 'shop' });
      }
      if (lowerReply.includes('whatsapp') || lowerLast.includes('whatsapp') || lowerLast.includes('admin') || lowerLast.includes('contact') || lowerLast.includes('owner')) {
        actions.push({ label: 'WhatsApp Manager', type: 'external_link', target: 'https://wa.me/9779768914027' });
      }

      const shouldShowPayment = lowerReply.includes('esewa') || lowerReply.includes('khalti') || lowerReply.includes('qr') || lowerReply.includes('payment') || lowerLast.includes('esewa') || lowerLast.includes('khalti') || lowerLast.includes('pay');

      return {
        reply: replyText,
        reasoning_details: aiResult.reasoning_details,
        actions,
        orderInfo: targetOrder,
        productCard: productCard,
        paymentInfo: shouldShowPayment ? paymentInfo : null,
        modelUsed: aiResult.modelUsed || 'Nemotron 3 Ultra (550B)',
      };
    }
  } catch (err) {
    console.warn('[AI Assistant] Universal AI Model execution note:', err);
  }

  // =========================================================================
  // PRIORITY 2: INTELLIGENT POSTGRESQL CONTEXT FALLBACK
  // =========================================================================
  return buildIntelligentFallback(lastUserMsg, context, req.userContext);
}
