import { Command } from "commander";
import { getConfig, setProviderConfig } from "../core/config.js";
import { ProviderName } from "../core/schema.js";

export function registerConfigCommands(program: Command) {
  const config = program.command("config").description("設定檔操作");

  config
    .command("get")
    .description("取得設定")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .action(async (opts) => {
      const cfg = await getConfig();
      if (!opts.provider) {
        console.log(JSON.stringify(cfg, null, 2));
        return;
      }
      const providerCfg = cfg.providers?.[opts.provider as ProviderName] ?? {};
      console.log(JSON.stringify(providerCfg, null, 2));
    });

  config
    .command("set")
    .description("寫入設定（僅更新 provider 區塊）")
    .requiredOption("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--merchant-id <id>", "商店代號")
    .option("--hash-key <key>", "HashKey")
    .option("--hash-iv <iv>", "HashIV")
    .option("--sandbox", "使用測試環境")
    .action(async (opts) => {
      await setProviderConfig(opts.provider as ProviderName, {
        merchantId: opts.merchantId,
        hashKey: opts.hashKey,
        hashIv: opts.hashIv,
        sandbox: Boolean(opts.sandbox)
      });
      console.log("設定已更新");
    });
}
