import { Command } from "commander";
import { getConfig, resolveProviderName } from "../core/config.js";
import { ProviderName } from "../core/schema.js";

export function registerDoctorCommand(program: Command) {
  program
    .command("doctor")
    .description("檢查設定與環境變數")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .action(async (opts) => {
      const cfg = await getConfig();
      const provider = (await resolveProviderName(opts.provider)) as ProviderName;
      const envPrefix = provider.toUpperCase();

      const missing: string[] = [];
      if (!process.env[`${envPrefix}_MERCHANT_ID`]) missing.push(`${envPrefix}_MERCHANT_ID`);
      if (!process.env[`${envPrefix}_HASH_KEY`]) missing.push(`${envPrefix}_HASH_KEY`);
      if (!process.env[`${envPrefix}_HASH_IV`]) missing.push(`${envPrefix}_HASH_IV`);

      const hasConfig = Boolean(cfg.providers?.[provider]);

      console.log(JSON.stringify({
        provider,
        hasConfig,
        env: {
          required: [
            `${envPrefix}_MERCHANT_ID`,
            `${envPrefix}_HASH_KEY`,
            `${envPrefix}_HASH_IV`
          ],
          missing
        }
      }, null, 2));

      if (missing.length) {
        throw new Error("缺少必要環境變數");
      }
    });
}
