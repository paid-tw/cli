import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import * as TOML from "@iarna/toml";
import { ProviderName } from "./schema.js";

export interface ProviderConfig {
  merchantId?: string;
  hashKey?: string;
  hashIv?: string;
  sandbox?: boolean;
}

export interface PaidConfig {
  providers?: Record<string, ProviderConfig>;
}

const CONFIG_DIR = path.join(os.homedir(), ".config", "paid");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.toml");

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

export async function resolveProviderConfig(
  provider: ProviderName,
  flags?: ProviderConfig
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

  return {
    ...fileProvider,
    ...env,
    ...flags
  };
}

function cleanUndefined<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as T;
}
