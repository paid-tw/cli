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
  dotenv.config({ path: envPath, override: true });
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
    ...(providers[provider] ?? {}),
    ...cleanUndefined(input)
  };
  const next: PaidConfig = { ...existing, providers };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, TOML.stringify(next));
}

export async function setDefaultProvider(provider: ProviderName) {
  const existing = await getConfig();
  const next: PaidConfig = { ...existing, defaultProvider: provider };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, TOML.stringify(next));
}

export async function setOutputFormat(format: "json" | "pretty") {
  const existing = await getConfig();
  const next: PaidConfig = { ...existing, outputFormat: format };
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, TOML.stringify(next));
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
  runtime?: RuntimeEnv
): Promise<ProviderConfig> {
  const envPrefix = provider.toUpperCase();
  const env: ProviderConfig = {
    merchantId: process.env[`${envPrefix}_MERCHANT_ID`],
    hashKey: process.env[`${envPrefix}_HASH_KEY`],
    hashIv: process.env[`${envPrefix}_HASH_IV`],
    sandbox: process.env[`${envPrefix}_SANDBOX`] === "true"
  };

  const fileConfig = await getConfig();
  const fileProvider = fileConfig.providers?.[provider] ?? {};

  const envMode = resolvePaidEnv();
  const runtimeSandbox =
    runtime?.sandbox !== undefined ? runtime.sandbox : envMode !== undefined ? envMode : undefined;

  return {
    ...fileProvider,
    ...env,
    ...flags,
    sandbox: runtimeSandbox ?? flags?.sandbox ?? env.sandbox ?? fileProvider.sandbox
  };
}

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as T;
}

const KNOWN_PROVIDERS: ProviderName[] = ["payuni", "newebpay", "ecpay"];

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
