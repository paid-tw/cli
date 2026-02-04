import { PaidConfig, resolveProviderName } from "./config.js";
import { ProviderName } from "./schema.js";
import stringWidth from "string-width";

export type DoctorResult = {
  provider: ProviderName;
  hasConfig: boolean;
  env: {
    required: string[];
    missing: string[];
    sources: Record<string, "dotenv" | "env" | "none">;
  };
  paidEnv?: string;
};

export async function runDoctor(providerInput: string | undefined, cfg: PaidConfig): Promise<DoctorResult> {
  const provider = (await resolveProviderName(providerInput)) as ProviderName;
  const envPrefix = provider.toUpperCase();

  const required = [
    `${envPrefix}_MERCHANT_ID`,
    `${envPrefix}_HASH_KEY`,
    `${envPrefix}_HASH_IV`
  ];

  const sources: Record<string, "dotenv" | "env" | "none"> = {};
  const missing: string[] = [];

  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      sources[key] = "none";
      missing.push(key);
      continue;
    }
    sources[key] = process.env.__PAID_DOTENV?.split(",").includes(key) ? "dotenv" : "env";
  }

  const hasConfig = Boolean(cfg.providers?.[provider]);
  const paidEnv = process.env.PAID_ENV;

  return {
    provider,
    hasConfig,
    env: { required, missing, sources },
    paidEnv
  };
}

export function formatDoctorPretty(result: DoctorResult) {
  const lines: string[] = [];
  lines.push(`Doctor (${formatProvider(result.provider)})`);
  lines.push("");

  for (const key of result.env.required) {
    const missing = result.env.missing.includes(key);
    const source = result.env.sources[key] ?? "none";
    const status = missing ? "✗" : "✓";
    const sourceText = missing ? "未設定" : `已設定（來源: ${source}）`;
    lines.push(`${status} ${pad(key, 22)}${sourceText}`);
    if (missing) {
      lines.push(`  建議：export ${key}=...`);
    }
  }

  if (result.hasConfig || result.env.missing.length > 0) {
    lines.push(
      `${result.hasConfig ? "✓" : "!"} ${pad("config.toml", 22)}${
        result.hasConfig ? "已設定" : "未設定"
      }`
    );
  }
  if (result.paidEnv) {
    lines.push(`✓ ${pad("PAID_ENV", 22)}${result.paidEnv}`);
  }

  const ok = result.env.missing.length === 0;
  lines.push("");
  lines.push(`結果：${ok ? "OK" : "WARN"}`);

  return lines.join("\n");
}

function pad(text: string, width: number) {
  const w = stringWidth(text);
  return text + " ".repeat(Math.max(1, width - w));
}

function formatProvider(provider: string) {
  switch (provider) {
    case "payuni":
      return "PAYUNi 統一金流";
    case "ecpay":
      return "綠界科技 ECPay";
    case "newebpay":
      return "NewebPay 藍新金流";
    default:
      return provider;
  }
}
