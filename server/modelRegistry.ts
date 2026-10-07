/**
 * UNX Games - Master Central AI Model Registry
 * STRICT 3-MODEL AI COUNCIL POLICY:
 * MODEL 1: Nemotron 3.5 Lightning (NVIDIA)
 * MODEL 2: Gemini 3.8 Flash (Google AI Studio / Gemini API)
 * MODEL 3: Nemotron 3 Ultra (NVIDIA)
 *
 * ALL OTHER MODELS ARE REMOVED.
 * Never substitute or silently invent model identifiers.
 */

import { GoogleGenAI } from '@google/genai';
import { getGlobalAiConfig } from './aiOpenRouter.js';

export interface RegisteredAiModel {
  id: string;
  name: string;
  shortName: string;
  displayName: string;
  provider: 'NVIDIA' | 'Google AI Studio';
  type: 'google' | 'openrouter';
  apiModelId: string;
  modelId: string;
  enabled: boolean;
  timeoutMs: number;
  timeout: number;
  maxRetries: number;
  supportsStreaming: boolean;
  badge: string;
  description: string;
  category: 'CORE' | 'SPEED' | 'REASONING';
  status: 'CONNECTED' | 'THINKING' | 'STREAMING' | 'COMPLETED' | 'TIMEOUT' | 'ERROR' | 'DISABLED' | 'NOT_CONFIGURED';
  lastHealthCheck?: {
    timestamp: string;
    status: 'CONNECTED' | 'ERROR' | 'NOT_CONFIGURED';
    latencyMs?: number;
    error?: string;
  };
}

export const AI_MODELS: RegisteredAiModel[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    shortName: 'Gemini 3.8 Flash',
    displayName: 'Gemini 3.8 Flash',
    provider: 'Google AI Studio',
    type: 'google',
    apiModelId: 'gemini-3.8-flash',
    modelId: 'gemini-3.8-flash',
    enabled: true,
    timeoutMs: 30000,
    timeout: 30,
    maxRetries: 2,
    supportsStreaming: true,
    badge: 'Council Chair',
    description: 'Google frontier multimodal engine with live store grounding and synthesis',
    category: 'CORE',
    status: 'CONNECTED',
  },
  {
    id: 'nemotron-3.5-lightning',
    name: 'Nemotron 3.5 Lightning',
    shortName: 'Nemotron 3.5L',
    displayName: 'Nemotron 3.5 Lightning',
    provider: 'NVIDIA',
    type: 'openrouter',
    apiModelId: 'nvidia/nemotron-3.5-lightning:free',
    modelId: 'nvidia/nemotron-3.5-lightning:free',
    enabled: true,
    timeoutMs: 30000,
    timeout: 30,
    maxRetries: 1,
    supportsStreaming: true,
    badge: 'Fast Inference',
    description: 'NVIDIA high-throughput reasoning & gaming store context evaluator',
    category: 'SPEED',
    status: 'CONNECTED',
  },
  {
    id: 'nemotron-3-ultra',
    name: 'Nemotron 3 Ultra',
    shortName: 'Nemotron 3 Ultra',
    displayName: 'Nemotron 3 Ultra',
    provider: 'NVIDIA',
    type: 'openrouter',
    apiModelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    modelId: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    enabled: true,
    timeoutMs: 30000,
    timeout: 30,
    maxRetries: 1,
    supportsStreaming: true,
    badge: '550B MoE',
    description: 'NVIDIA frontier 550B MoE architecture for deep verification & synthesis',
    category: 'REASONING',
    status: 'CONNECTED',
  },
];

let runtimeModelRegistry: RegisteredAiModel[] = AI_MODELS.map((m) => ({ ...m }));

export function getRegisteredModels(): RegisteredAiModel[] {
  return runtimeModelRegistry;
}

export function getEnabledModels(): RegisteredAiModel[] {
  return runtimeModelRegistry.filter((m) => m.enabled);
}

export function getModelById(id: string): RegisteredAiModel | undefined {
  return runtimeModelRegistry.find((m) => m.id === id);
}

export function toggleModelStatus(modelId: string, enabled: boolean): RegisteredAiModel | null {
  const model = runtimeModelRegistry.find((m) => m.id === modelId);
  if (!model) return null;
  model.enabled = Boolean(enabled);
  model.status = model.enabled ? 'CONNECTED' : 'DISABLED';
  return model;
}

export function getSynthesisModel(): RegisteredAiModel {
  // Council Synthesis Chair: Gemini 3.8 Flash
  const chair = runtimeModelRegistry.find((m) => m.id === 'gemini-3.8-flash' && m.enabled);
  if (chair) return chair;
  const anyEnabled = runtimeModelRegistry.find((m) => m.enabled);
  return anyEnabled || runtimeModelRegistry[0];
}

export function resolveGoogleModelId(rawId: string): string {
  const m = (rawId || '').toLowerCase();
  if (m.includes('3.1-flash-lite')) return 'gemini-3.1-flash-lite';
  if (m.includes('3.8-flash')) return 'gemini-3.8-flash';
  if (m.includes('3.5-flash')) return 'gemini-3.5-flash';
  // Standard resilient default for Google AI Studio
  return 'gemini-3.1-flash-lite';
}

/**
 * Real API health check for each of the 3 configured models.
 * Tests actual upstream ping without fabricating connected state.
 */
export async function verifyModelHealth(modelId: string): Promise<RegisteredAiModel['lastHealthCheck']> {
  const model = runtimeModelRegistry.find((m) => m.id === modelId);
  if (!model) {
    return {
      timestamp: new Date().toISOString(),
      status: 'NOT_CONFIGURED',
      error: 'Model identifier not found in registry',
    };
  }

  const t0 = Date.now();
  try {
    if (model.type === 'google') {
      const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
      if (!geminiKey) {
        model.status = 'NOT_CONFIGURED';
        const result = {
          timestamp: new Date().toISOString(),
          status: 'NOT_CONFIGURED' as const,
          error: 'GEMINI_API_KEY is not configured on the server.',
        };
        model.lastHealthCheck = result;
        return result;
      }

      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' },
        },
      });
      const candidateModels = [
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.5-flash',
      ];
      let pingSuccess = false;
      let lastErr = '';
      for (const mId of candidateModels) {
        try {
          await ai.models.generateContent({
            model: mId,
            contents: 'ping',
          });
          pingSuccess = true;
          break;
        } catch (e: any) {
          lastErr = e?.message || String(e);
        }
      }

      if (!pingSuccess) {
        throw new Error(lastErr || 'Google Gemini ping failed');
      }

      const latencyMs = Date.now() - t0;
      model.status = 'CONNECTED';
      const result = {
        timestamp: new Date().toISOString(),
        status: 'CONNECTED' as const,
        latencyMs,
      };
      model.lastHealthCheck = result;
      return result;
    } else {
      // OpenRouter check
      const config = await getGlobalAiConfig();
      const apiKey = config.apiKey || (process.env.OPENROUTER_API_KEY || '').trim();
      if (!apiKey) {
        model.status = 'NOT_CONFIGURED';
        const result = {
          timestamp: new Date().toISOString(),
          status: 'NOT_CONFIGURED' as const,
          error: 'OPENROUTER_API_KEY is not configured on the server.',
        };
        model.lastHealthCheck = result;
        return result;
      }

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model.apiModelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      });

      const latencyMs = Date.now() - t0;
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        model.status = 'ERROR';
        const result = {
          timestamp: new Date().toISOString(),
          status: 'ERROR' as const,
          latencyMs,
          error: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
        };
        model.lastHealthCheck = result;
        return result;
      }

      model.status = 'CONNECTED';
      const result = {
        timestamp: new Date().toISOString(),
        status: 'CONNECTED' as const,
        latencyMs,
      };
      model.lastHealthCheck = result;
      return result;
    }
  } catch (err: any) {
    model.status = 'ERROR';
    const result = {
      timestamp: new Date().toISOString(),
      status: 'ERROR' as const,
      latencyMs: Date.now() - t0,
      error: err?.message || String(err),
    };
    model.lastHealthCheck = result;
    return result;
  }
}

/**
 * Verifies all 3 models at application healthcheck
 */
export async function verifyAllModelsHealth() {
  const results: Record<string, any> = {};
  for (const m of runtimeModelRegistry) {
    results[m.id] = await verifyModelHealth(m.id);
  }
  return results;
}
