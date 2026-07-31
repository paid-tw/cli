import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";
import * as TOML from "@iarna/toml";
import { ProviderName } from "./schema.js";
import dotenv from "dotenv";

export interface ProviderConfig {
  merchantId?: string;
  hashKey?: string;
  hashIv?: string;
  sandbox?: boolean;
}

export interface RuntimeEnv {
  sandbox?: boolean;
}

export interface PaidConfig {
  defaultProvider?: ProviderName;
  outputFormat?: "json" | "pretty";
  providers?: Record<string, ProviderConfig>;
}

const CONFIG_DIR = path.join(os.homedir(), ".config", "paid");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.toml");

export function loadDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fsSync.existsSync(envPath)) return;
  const result = dotenv.config({ path: envPath, override: true });
  if (result.parsed) {
    process.env.__PAID_DOTENV = Object.keys(result.parsed).join(",");
  }
}

export function getConfigPath() {
  return CONFIG_PATH;
}

export async function getConfig(): Promise<PaidConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return (TOML.parse(raw) as PaidConfig) ?? {};
  } catch {
    return {};
  }
}

export async function setProviderConfig(provider: ProviderName, input: ProviderConfig) {
  const existing = await getConfig();
  const providers = existing.providers ?? {};
  providers[provider] = {
    ...providers[provider],
    ...cleanUndefined(input),
  };
  const next: PaidConfig = { ...existing, providers };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, TOML.stringify(next as TOML.JsonMap));
}

export async function setDefaultProvider(provider: ProviderName) {
  const existing = await getConfig();
  const next: PaidConfig = { ...existing, defaultProvider: provider };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, TOML.stringify(next as TOML.JsonMap));
}

export async function setOutputFormat(format: "json" | "pretty") {
  const existing = await getConfig();
  const next: PaidConfig = { ...existing, outputFormat: format };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, TOML.stringify(next as TOML.JsonMap));
}

export async function resolveProviderName(input?: string): Promise<ProviderName> {
  if (input) {
    return ensureProviderName(input);
  }

  const envDefault = process.env.PAID_DEFAULT_PROVIDER;
  if (envDefault) {
    return ensureProviderName(envDefault);
  }

  const cfg = await getConfig();
  if (cfg.defaultProvider) {
    return ensureProviderName(cfg.defaultProvider);
  }

  const providers = Object.keys(cfg.providers ?? {}).filter(isKnownProvider);
  if (providers.length === 1) {
    return providers[0] as ProviderName;
  }

  throw new Error("未指定 provider，且找不到預設值");
}

export async function resolveProviderConfig(
  provider: ProviderName,
  flags?: ProviderConfig,
  runtime?: RuntimeEnv,
): Promise<ProviderConfig> {
  const env = loadEnvProviderConfig(provider);

  const fileConfig = await getConfig();
  // ecpay-ecpg may reuse [providers.ecpay] credentials when dedicated block absent.
  const fileProvider =
    fileConfig.providers?.[provider] ??
    (provider === "ecpay-ecpg" ? (fileConfig.providers?.ecpay ?? {}) : {});

  const envMode = resolvePaidEnv();
  const runtimeSandbox =
    runtime?.sandbox !== undefined ? runtime.sandbox : envMode !== undefined ? envMode : undefined;

  return mergeProviderConfig(fileProvider, env, flags, runtimeSandbox);
}

/**
 * Env prefix for a provider. Hyphenated names become underscores
 * (`ecpay-ecpg` → `ECPAY_ECPG`).
 */
export function providerEnvPrefix(provider: ProviderName): string {
  return provider.toUpperCase().replace(/-/g, "_");
}

/**
 * Read merchant credentials from env. For `ecpay-ecpg`, prefer `ECPAY_ECPG_*`
 * then fall back to shared `ECPAY_*` (same public stage merchant keys).
 */
function loadEnvProviderConfig(provider: ProviderName): ProviderConfig {
  const prefixes =
    provider === "ecpay-ecpg"
      ? (["ECPAY_ECPG", "ECPAY"] as const)
      : ([providerEnvPrefix(provider)] as const);

  const pick = (suffix: string): string | undefined => {
    for (const p of prefixes) {
      const v = process.env[`${p}_${suffix}`];
      if (v !== undefined && v !== "") return v;
    }
    return undefined;
  };

  const rawSandbox = pick("SANDBOX");
  return {
    merchantId: pick("MERCHANT_ID"),
    hashKey: pick("HASH_KEY"),
    hashIv: pick("HASH_IV"),
    sandbox: rawSandbox === undefined ? undefined : rawSandbox === "true",
  };
}

/**
 * Merge config sources by precedence (CLI flags &gt; env &gt; config.toml). Each layer
 * is stripped of `undefined` before spreading so an unset env var never clobbers
 * a value from config.toml; `sandbox` is resolved with `??` so an explicit
 * `false` still overrides lower layers but an absent one falls through.
 */
export function mergeProviderConfig(
  fileProvider: ProviderConfig,
  env: ProviderConfig,
  flags: ProviderConfig | undefined,
  runtimeSandbox: boolean | undefined,
): ProviderConfig {
  return {
    ...cleanUndefined(fileProvider),
    ...cleanUndefined(env),
    ...cleanUndefined(flags ?? {}),
    sandbox: runtimeSandbox ?? flags?.sandbox ?? env.sandbox ?? fileProvider.sandbox,
  };
}

function cleanUndefined<T extends object>(input: T): T {
  const entries = Object.entries(input as Record<string, unknown>).filter(
    ([, v]) => v !== undefined,
  );
  return Object.fromEntries(entries) as T;
}

const KNOWN_PROVIDERS: ProviderName[] = ["payuni", "newebpay", "ecpay", "ecpay-ecpg"];

function isKnownProvider(value: string): value is ProviderName {
  return KNOWN_PROVIDERS.includes(value as ProviderName);
}

function ensureProviderName(value: string): ProviderName {
  if (!isKnownProvider(value)) {
    throw new Error(`不支援的 provider: ${value}`);
  }
  return value;
}

function resolvePaidEnv(): boolean | undefined {
  const mode = process.env.PAID_ENV?.toLowerCase();
  if (!mode) return undefined;
  if (mode === "sandbox" || mode === "test") return true;
  if (mode === "production" || mode === "prod") return false;
  return undefined;
}
