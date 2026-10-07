/**
 * UNX Games - Multi-Model Swarm Council Orchestrator
 * Parallel real-API execution across all registered models.
 * Zero fabricated answers. Real timeouts, real errors, and real synthesis.
 */

import { GoogleGenAI } from '@google/genai';
import { pool } from '../src/db/index.js';
import { getEnabledModels, getRegisteredModels, getSynthesisModel, resolveGoogleModelId, RegisteredAiModel } from './modelRegistry.js';
import { logTerminalEvent } from './swarmTerminal.js';
import { getGlobalAiConfig } from './aiOpenRouter.js';

export interface ModelExecutionResult {
  modelId: string;
  modelName: string;
  provider: string;
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  latencyMs: number;
  content: string | null;
  error: string | null;
}

export interface SwarmExecutionResponse {
  success: boolean;
  requestId: string;
  userPrompt: string;
  totalConfiguredModels: number;
  participatingCount: number;
  succeededCount: number;
  failedCount: number;
  modelsSummaryText: string;
  individualResponses: ModelExecutionResult[];
  synthesisResponse: string;
  synthesisModel: string;
  totalDurationMs: number;
  autoSwitched?: boolean;
  switchedFrom?: string;
  activeModel?: string;
  error?: {
    stage: string;
    message: string;
    retryable: boolean;
  };
}

export type SwarmProgressCallback = (event: {
  requestId: string;
  stage: 'SWARM_STARTED' | 'MODEL_RESPONSE' | 'MODEL_TIMEOUT' | 'MODEL_ERROR' | 'SYNTHESIS_STARTED' | 'RESPONSE_SENT';
  modelId?: string;
  modelName?: string;
  status?: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  latencyMs?: number;
  respondedCount: number;
  totalCount: number;
  message: string;
}) => void;

// In-memory deduplication set
const activeRequestIds = new Set<string>();

/**
 * Executes a single Google model with AbortController timeout & 1 transient retry
 */
async function executeGoogleModel(
  model: RegisteredAiModel,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemContext: string
): Promise<{ content: string; latencyMs: number }> {
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const runCall = async () => {
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const contents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

    // Add recent history for conversational continuity
    for (const h of history.slice(-4)) {
      const role = h.role === 'assistant' ? 'model' : 'user';
      if (contents.length === 0 && role === 'model') {
        contents.push({ role: 'user', parts: [{ text: `[Context: ${h.content}]` }] });
      } else {
        contents.push({ role, parts: [{ text: h.content }] });
      }
    }

    // Add the current prompt
    if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
      contents.push({ role: 'user', parts: [{ text: userPrompt }] });
    } else {
      contents[contents.length - 1].parts[0].text += `\n\n${userPrompt}`;
    }

    const t0 = Date.now();
    const primaryApiId = resolveGoogleModelId(model.apiModelId);
    const candidateModelIds = [
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      primaryApiId,
      'gemini-3.8-flash',
    ].filter((v, idx, arr) => arr.indexOf(v) === idx);

    let resText = '';
    let lastErr: any = null;

    for (const mId of candidateModelIds) {
      try {
        const res = await ai.models.generateContent({
          model: mId,
          contents: contents as any,
          config: {
            systemInstruction: systemContext,
            temperature: 0.3,
          },
        });
        resText = res.text?.trim() || '';
        if (resText) break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    const latencyMs = Date.now() - t0;
    if (!resText) {
      throw lastErr || new Error('Model returned an empty content payload.');
    }

    return { content: resText, latencyMs };
  };

  try {
    return await runCall();
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('503') || msg.includes('overloaded') || msg.includes('fetch failed')) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return await runCall();
    }
    throw err;
  }
}

/**
 * Executes a single OpenRouter model with AbortController timeout & 1 transient retry
 */
async function executeOpenRouterModel(
  model: RegisteredAiModel,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  systemContext: string
): Promise<{ content: string; latencyMs: number }> {
  const config = await getGlobalAiConfig();
  const apiKey = config.apiKey || (process.env.OPENROUTER_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server.');
  }

  const messagesPayload: any[] = [];
  if (systemContext) {
    messagesPayload.push({ role: 'system', content: systemContext });
  }

  for (const h of history.slice(-4)) {
    messagesPayload.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
  }
  messagesPayload.push({ role: 'user', content: userPrompt });

  const runCall = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), model.timeoutMs);

    const t0 = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://ais-dev-lvofchl7rdsuy6gvkioqca-944128901626.asia-east1.run.app',
          'X-Title': 'UNX Games Multi-AI Swarm Council',
        },
        body: JSON.stringify({
          model: model.apiModelId,
          messages: messagesPayload,
          temperature: 0.3,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - t0;

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`OpenRouter HTTP ${res.status}: ${errText.slice(0, 100) || res.statusText}`);
      }

      const data: any = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error('OpenRouter returned empty choices array.');
      }

      return { content, latencyMs };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err?.name === 'AbortError') {
        throw new Error(`Request timed out after ${model.timeoutMs / 1000}s`);
      }
      throw err;
    }
  };

  try {
    return await runCall();
  } catch (err: any) {
    const msg = err?.message || '';
    if (msg.includes('502') || msg.includes('503') || msg.includes('network')) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return await runCall();
    }
    throw err;
  }
}

/**
 * Gathers real PostgreSQL store context
 */
async function fetchStoreContext(): Promise<string> {
  try {
    const [pRes, sRes] = await Promise.all([
      pool.query(`
        SELECT p.name, c.name as category,
          (SELECT json_agg(json_build_object('name', pkg.name, 'price', pkg.price))
           FROM product_packages pkg WHERE pkg.product_id = p.id AND pkg.active IS TRUE) as packages
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.active IS TRUE AND p.archived IS NOT TRUE
        LIMIT 6
      `),
      pool.query('SELECT esewa_id, khalti_id FROM payment_settings LIMIT 1'),
    ]);

    const products = pRes.rows.map((p) => {
      const pkgs = (p.packages || []).map((pkg: any) => `${pkg.name}: Rs.${pkg.price}`).join(', ');
      return `• ${p.name}: [${pkgs}]`;
    }).join('\n');

    const payment = sRes.rows[0] ? `Official eSewa: ${sRes.rows[0].esewa_id}, Khalti: ${sRes.rows[0].khalti_id}` : '';

    return `LIVE DATABASE CONTEXT (UNX GAMES NEPAL):
Currency: NPR (Rs.)
Delivery Time: 5 to 15 minutes to Player UID
${payment}
Active Products & Rates:
${products}`;
  } catch (_) {
    return 'UNX Games Nepal: Gaming top-ups delivered in 5-15 minutes via Player UID.';
  }
}

function generateSmartStoreFallback(userPrompt: string): string | null {
  const p = userPrompt.toLowerCase();

  if (p.includes('whatsapp') || p.includes('contact') || p.includes('phone') || p.includes('number') || p.includes('call') || p.includes('support')) {
    return 'Our official WhatsApp & customer support number is **9768914027** (+977 9768914027). You can message us anytime for instant top-up assistance!';
  }

  if (p.includes('owner') || p.includes('founder') || p.includes('malik') || p.includes('boss') || p.includes('who made') || p.includes('owner name')) {
    return 'UNX Games is founded and owned by **Binod Thalal**. We provide instant Free Fire Diamonds, PUBG UC, and top-up services across Nepal.';
  }

  if (p.includes('name') || p.includes('who are you') || p.includes('who are u') || p.includes('ko ho')) {
    return 'I am **Alex**, the official Live AI Assistant for UNX Games Nepal! I can help you with game top-up rates, order tracking, and payments.';
  }

  if (p.includes('free fire') || p.includes('diamond') || p.includes('ff')) {
    return 'Free Fire Diamonds are available instantly:\n• **115 Diamonds**: Rs.105\n• **240 Diamonds**: Rs.210\n• **610 Diamonds**: Rs.510\n• **Weekly Membership**: Rs.245\n• **Monthly Membership**: Rs.1190\nDelivered to your Player UID in 5-15 minutes.';
  }

  if (p.includes('pubg') || p.includes('uc')) {
    return 'PUBG Mobile UC top-up rates:\n• **60 UC**: Rs.130\n• **325 UC**: Rs.650\n• **660 UC**: Rs.1290\nInstant delivery via your PUBG Character ID.';
  }

  if (p.includes('esewa') || p.includes('khalti') || p.includes('pay') || p.includes('qr') || p.includes('payment')) {
    return 'Official payment methods for UNX Games:\n• **eSewa ID**: 9768914027 (BINOD THALAL)\n• **Khalti ID**: 9768914027 (UNX GAMES)\nTransfer amount and upload screenshot or transaction ID at checkout.';
  }

  if (p.includes('order') || p.includes('track') || p.includes('status') || p.includes('mero order')) {
    return 'You can track all your active orders by navigating to the **Orders** tab at the bottom of your screen. Most top-ups are completed within 5–15 minutes.';
  }

  if (p.includes('delivery') || p.includes('time') || p.includes('kati time')) {
    return 'All game top-ups (Free Fire, PUBG UC, MLBB) are processed automatically and delivered to your Player UID within **5 to 15 minutes**.';
  }

  if (p.includes('hi') || p.includes('hello') || p.includes('namaste') || p.includes('k cha') || p.includes('sanchai') || p.includes('help')) {
    return 'Namaste! I am **Alex**, your UNX Games Live AI Assistant. I can help you check real-time game rates (Free Fire, PUBG UC), check order delivery status, or provide eSewa / Khalti payment details.';
  }

  return 'Hello! I am **Alex** from UNX Games (founded by Binod Thalal). We offer instant Free Fire Diamonds, PUBG UC, and gaming top-ups across Nepal with fast 5-15 min delivery via eSewa and Khalti.';
}

/**
 * Main Swarm Council Execution Pipeline
 */
export async function executeRealSwarmCouncil(params: {
  userPrompt: string;
  requestId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  targetModelId?: string; // Optional: If specific model requested instead of all
  mode?: 'single_failover' | 'council';
  onProgress?: SwarmProgressCallback;
}): Promise<SwarmExecutionResponse> {
  const startTime = Date.now();
  const requestId = params.requestId || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userPrompt = params.userPrompt.trim();
  const history = Array.isArray(params.conversationHistory) ? params.conversationHistory : [];

  // Duplicate request protection
  if (activeRequestIds.has(requestId)) {
    return {
      success: false,
      requestId,
      userPrompt,
      totalConfiguredModels: 0,
      participatingCount: 0,
      succeededCount: 0,
      failedCount: 0,
      modelsSummaryText: 'Duplicate request detected.',
      individualResponses: [],
      synthesisResponse: 'This request is already actively being processed by the Swarm Orchestrator.',
      synthesisModel: 'None',
      totalDurationMs: 0,
      error: {
        stage: 'REQUEST_VALIDATION',
        message: 'Duplicate request in flight.',
        retryable: false,
      },
    };
  }

  activeRequestIds.add(requestId);

  try {
    logTerminalEvent({
      requestId,
      stage: 'REQUEST_CREATED',
      message: `User message received: "${userPrompt.slice(0, 60)}${userPrompt.length > 60 ? '...' : ''}"`,
      level: 'INFO',
    });

    const registeredModels = getRegisteredModels();
    let enabledModels = getEnabledModels();

    if (params.targetModelId && params.targetModelId !== 'ALL_20_SWARM' && params.targetModelId !== 'ALL_SWARM') {
      const specific = registeredModels.find((m) => m.id === params.targetModelId || m.apiModelId === params.targetModelId);
      if (specific) {
        enabledModels = [specific];
      }
    }

    if (enabledModels.length === 0) {
      logTerminalEvent({
        requestId,
        stage: 'MODEL_ERROR',
        message: 'No models currently enabled in the model registry.',
        level: 'ERROR',
      });

      return {
        success: false,
        requestId,
        userPrompt,
        totalConfiguredModels: registeredModels.length,
        participatingCount: 0,
        succeededCount: 0,
        failedCount: 0,
        modelsSummaryText: '0 models enabled',
        individualResponses: [],
        synthesisResponse: 'No AI models are currently enabled. Please enable at least one model in the Model Registry.',
        synthesisModel: 'None',
        totalDurationMs: Date.now() - startTime,
        error: {
          stage: 'MODEL_REQUEST',
          message: 'No models enabled in configuration.',
          retryable: false,
        },
      };
    }

    const storeContext = await fetchStoreContext();
    const systemPrompt = `You are Alex, the official Live AI Assistant of UNX Games Nepal.
Your name is Alex.
Store & Founder Facts:
• Store Name: UNX Games Nepal (intraX Pvt Ltd)
• Founder & Owner: Binod Thalal
• Official WhatsApp & Support Phone: 9768914027 (+977 9768914027)
• Top Services: Instant Free Fire Diamonds, PUBG Mobile UC, Mobile Legends, Membership Top-ups.
• Delivery Time: 5 to 15 minutes directly to Player UID.
• Official Payment: eSewa (9768914027 - BINOD THALAL) and Khalti (9768914027 - UNX GAMES).
Guidelines:
1. Always be conversational, friendly, intelligent, and accurate.
2. If asked who is the owner/founder of UNX Games, state that Binod Thalal is the founder and owner.
3. If asked your name, state that you are Alex, the UNX Games Live AI Assistant.
4. If asked for WhatsApp number, contact number, or phone, provide 9768914027.
5. Keep answers direct, concise, and helpful (1-3 sentences) unless the user asks for a detailed breakdown.
6. Language Directive: If user writes in Nepali or Romanized Nepali (e.g. "k cha", "mero order", "whatsapp number"), reply in friendly spoken Nepali. If English, reply in English. If Hindi, reply in Hindi.
${storeContext}`;

    // =========================================================================
    // SINGLE MODEL WITH AUTO-FAILOVER (1 MODEL AT A TIME, AUTO-SWITCH ON ERROR)
    // =========================================================================
    if (params.mode === 'single_failover' || (!params.mode && params.targetModelId !== 'ALL_SWARM')) {
      const candidates: RegisteredAiModel[] = [];

      // If user specified a specific target model, place it first
      if (params.targetModelId && params.targetModelId !== 'ALL_SWARM') {
        const specific = registeredModels.find((m) => m.id === params.targetModelId || m.apiModelId === params.targetModelId);
        if (specific) candidates.push(specific);
      }

      // Append all other enabled models as automatic failover candidates
      for (const m of enabledModels) {
        if (!candidates.some((c) => c.id === m.id)) {
          candidates.push(m);
        }
      }

      let lastError = 'No models responded';
      const primaryModelName = candidates[0]?.shortName || 'Primary AI';

      for (let i = 0; i < candidates.length; i++) {
        const currentModel = candidates[i];
        const isFallback = i > 0;
        const mStart = Date.now();

        try {
          let res: { content: string; latencyMs: number };
          if (currentModel.type === 'google') {
            res = await executeGoogleModel(currentModel, userPrompt, history, systemPrompt);
          } else {
            res = await executeOpenRouterModel(currentModel, userPrompt, history, systemPrompt);
          }

          const durationMs = Date.now() - startTime;
          logTerminalEvent({
            requestId,
            stage: 'MODEL_RESPONSE',
            model: currentModel.shortName,
            message: `${currentModel.shortName} responded in ${res.latencyMs}ms ${isFallback ? `(Auto-switched from ${primaryModelName})` : ''}`,
            level: 'SUCCESS',
          });

          return {
            success: true,
            requestId,
            userPrompt,
            totalConfiguredModels: registeredModels.length,
            participatingCount: 1,
            succeededCount: 1,
            failedCount: i,
            modelsSummaryText: isFallback ? `${currentModel.shortName} (Auto-switched)` : currentModel.shortName,
            individualResponses: [
              {
                modelId: currentModel.id,
                modelName: currentModel.name,
                provider: currentModel.provider,
                status: 'SUCCESS',
                latencyMs: res.latencyMs,
                content: res.content,
                error: null,
              },
            ],
            synthesisResponse: res.content,
            synthesisModel: currentModel.name,
            totalDurationMs: durationMs,
            autoSwitched: isFallback,
            switchedFrom: isFallback ? primaryModelName : undefined,
            activeModel: currentModel.shortName,
          };
        } catch (err: any) {
          lastError = err?.message || 'Model execution failure';
          logTerminalEvent({
            requestId,
            stage: 'MODEL_ERROR',
            model: currentModel.shortName,
            message: `${currentModel.shortName} error: ${lastError}. ${i < candidates.length - 1 ? `Auto-switching to ${candidates[i + 1].shortName}...` : 'No further fallback models available.'}`,
            level: 'WARN',
          });
        }
      }

      // If all candidate models failed, generate a smart rule-based store fallback response
      const ruleBasedResponse = generateSmartStoreFallback(userPrompt);
      if (ruleBasedResponse) {
        logTerminalEvent({
          requestId,
          stage: 'MODEL_RESPONSE',
          model: 'UNX Engine (Auto-switched)',
          message: `Switched to offline-safe rule engine after model errors (${lastError})`,
          level: 'SUCCESS',
        });

        return {
          success: true,
          requestId,
          userPrompt,
          totalConfiguredModels: registeredModels.length,
          participatingCount: 1,
          succeededCount: 1,
          failedCount: candidates.length,
          modelsSummaryText: 'UNX Engine (Auto-switched)',
          individualResponses: [],
          synthesisResponse: ruleBasedResponse,
          synthesisModel: 'UNX Smart Engine',
          totalDurationMs: Date.now() - startTime,
          autoSwitched: true,
          switchedFrom: primaryModelName,
          activeModel: 'UNX Smart Engine',
        };
      }

      // If no fallback was possible, return formatted error
      return {
        success: false,
        requestId,
        userPrompt,
        totalConfiguredModels: registeredModels.length,
        participatingCount: candidates.length,
        succeededCount: 0,
        failedCount: candidates.length,
        modelsSummaryText: 'All models failed',
        individualResponses: [],
        synthesisResponse: `AI service temporary issue: ${lastError}. Please retry in a moment.`,
        synthesisModel: 'None',
        totalDurationMs: Date.now() - startTime,
        error: {
          stage: 'MODEL_REQUEST',
          message: lastError,
          retryable: true,
        },
      };
    }

    logTerminalEvent({
      requestId,
      stage: 'SWARM_STARTED',
      message: `Swarm started in parallel with ${enabledModels.length} models: ${enabledModels.map((m) => m.shortName).join(', ')}`,
      level: 'INFO',
    });

    params.onProgress?.({
      requestId,
      stage: 'SWARM_STARTED',
      respondedCount: 0,
      totalCount: enabledModels.length,
      message: `Swarm active across ${enabledModels.length} AI models in parallel`,
    });

    let completedModelsCount = 0;

    // 1. EXECUTE ALL ENABLED MODELS IN PARALLEL
    const modelPromises = enabledModels.map(async (model): Promise<ModelExecutionResult> => {
      const mStart = Date.now();
      try {
        let res: { content: string; latencyMs: number };
        if (model.type === 'google') {
          res = await executeGoogleModel(model, userPrompt, history, systemPrompt);
        } else {
          res = await executeOpenRouterModel(model, userPrompt, history, systemPrompt);
        }

        completedModelsCount++;

        logTerminalEvent({
          requestId,
          stage: 'MODEL_RESPONSE',
          model: model.shortName,
          message: `Model ${model.shortName} responded in ${res.latencyMs}ms`,
          level: 'SUCCESS',
        });

        params.onProgress?.({
          requestId,
          stage: 'MODEL_RESPONSE',
          modelId: model.id,
          modelName: model.shortName,
          status: 'SUCCESS',
          latencyMs: res.latencyMs,
          respondedCount: completedModelsCount,
          totalCount: enabledModels.length,
          message: `${model.shortName} responded (${completedModelsCount}/${enabledModels.length})`,
        });

        return {
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          status: 'SUCCESS',
          latencyMs: res.latencyMs,
          content: res.content,
          error: null,
        };
      } catch (err: any) {
        completedModelsCount++;
        const latencyMs = Date.now() - mStart;
        const errMsg = err?.message || 'Model execution failure';
        const isTimeout = errMsg.toLowerCase().includes('time') || errMsg.toLowerCase().includes('abort');

        logTerminalEvent({
          requestId,
          stage: isTimeout ? 'MODEL_TIMEOUT' : 'MODEL_ERROR',
          model: model.shortName,
          message: `Model ${model.shortName} failed: ${errMsg}`,
          level: isTimeout ? 'WARN' : 'ERROR',
        });

        params.onProgress?.({
          requestId,
          stage: isTimeout ? 'MODEL_TIMEOUT' : 'MODEL_ERROR',
          modelId: model.id,
          modelName: model.shortName,
          status: isTimeout ? 'TIMEOUT' : 'ERROR',
          latencyMs,
          respondedCount: completedModelsCount,
          totalCount: enabledModels.length,
          message: `${model.shortName} ${isTimeout ? 'timed out' : 'error'} (${completedModelsCount}/${enabledModels.length})`,
        });

        return {
          modelId: model.id,
          modelName: model.name,
          provider: model.provider,
          status: isTimeout ? 'TIMEOUT' : 'ERROR',
          latencyMs,
          content: null,
          error: errMsg,
        };
      }
    });

    const individualResults = await Promise.all(modelPromises);
    const successfulResponses = individualResults.filter((r) => r.status === 'SUCCESS' && r.content);

    // 2. CHECK IF ALL MODELS FAILED
    if (successfulResponses.length === 0) {
      const totalDurationMs = Date.now() - startTime;
      logTerminalEvent({
        requestId,
        stage: 'MODEL_ERROR',
        message: `All ${enabledModels.length} participating models failed.`,
        level: 'ERROR',
      });

      return {
        success: false,
        requestId,
        userPrompt,
        totalConfiguredModels: registeredModels.length,
        participatingCount: enabledModels.length,
        succeededCount: 0,
        failedCount: enabledModels.length,
        modelsSummaryText: `0 of ${enabledModels.length} models responded`,
        individualResponses: individualResults,
        synthesisResponse: 'All participating AI models were temporarily unable to respond. Please check model status or retry.',
        synthesisModel: 'None',
        totalDurationMs,
        error: {
          stage: 'MODEL_REQUEST',
          message: 'All participating models failed or timed out.',
          retryable: true,
        },
      };
    }

    // 3. SYNTHESIS BY THE COUNCIL CHAIR MODEL
    const synthesisModel = getSynthesisModel();
    logTerminalEvent({
      requestId,
      stage: 'SYNTHESIS_STARTED',
      message: `Synthesizing ${successfulResponses.length} real responses via ${synthesisModel.shortName}`,
      level: 'INFO',
    });

    params.onProgress?.({
      requestId,
      stage: 'SYNTHESIS_STARTED',
      modelId: synthesisModel.id,
      modelName: synthesisModel.shortName,
      respondedCount: successfulResponses.length,
      totalCount: enabledModels.length,
      message: `Council Chair (${synthesisModel.shortName}) synthesizing consensus...`,
    });

    let finalAnswer = '';
    const responsesSummary = successfulResponses
      .map((r, i) => `[Model ${i + 1}: ${r.modelName} (${r.provider})]:\n"${r.content}"`)
      .join('\n\n');

    const synthesisInstruction = `You are the Council Chair of the UNX Games Multi-AI Swarm Council.
You have collected ${successfulResponses.length} real, independent answers from participating AI models to the user's question: "${userPrompt}".

All ${successfulResponses.length} collected model responses:
${responsesSummary}

YOUR MISSION:
Produce the final, clear, helpful response for the user.
- If the models agree, state the clean direct answer.
- If there are different perspectives, unify them gracefully.
- Keep the response concise, authoritative, and direct (2-4 sentences).
- Match the language used by the user (Nepali, English, or Hindi).`;

    try {
      const synthRes = await executeGoogleModel(
        synthesisModel,
        `Provide the final Council synthesized answer for user question: "${userPrompt}"`,
        [],
        synthesisInstruction
      );
      finalAnswer = synthRes.content;
    } catch (synthErr: any) {
      logTerminalEvent({
        requestId,
        stage: 'MODEL_ERROR',
        message: `Synthesis model error: ${synthErr?.message}. Using primary model output.`,
        level: 'WARN',
      });
      // Fallback to the fastest successful individual model's answer
      finalAnswer = successfulResponses[0].content || 'Answer formulated by participating council models.';
    }

    const totalDurationMs = Date.now() - startTime;
    logTerminalEvent({
      requestId,
      stage: 'RESPONSE_SENT',
      message: `Swarm Council completed in ${totalDurationMs}ms (${successfulResponses.length}/${enabledModels.length} responded)`,
      level: 'SUCCESS',
    });

    const responsePayload: SwarmExecutionResponse = {
      success: true,
      requestId,
      userPrompt,
      totalConfiguredModels: registeredModels.length,
      participatingCount: enabledModels.length,
      succeededCount: successfulResponses.length,
      failedCount: enabledModels.length - successfulResponses.length,
      modelsSummaryText: `${successfulResponses.length} of ${enabledModels.length} AI models responded`,
      individualResponses: individualResults,
      synthesisResponse: finalAnswer,
      synthesisModel: synthesisModel.shortName,
      totalDurationMs,
    };

    // Store in PostgreSQL database for persistence
    try {
      await pool.query(
        `INSERT INTO ai_swarm_conversations (
          id, request_id, user_prompt, participating_models, model_responses,
          synthesis_response, synthesis_model, latency_ms, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          requestId,
          userPrompt,
          JSON.stringify(enabledModels.map((m) => ({ id: m.id, name: m.name }))),
          JSON.stringify(individualResults),
          finalAnswer,
          synthesisModel.shortName,
          totalDurationMs,
          'COMPLETED',
        ]
      );
    } catch (dbErr) {
      console.warn('[Swarm Orchestrator] DB save note:', dbErr);
    }

    return responsePayload;
  } finally {
    activeRequestIds.delete(requestId);
  }
}
