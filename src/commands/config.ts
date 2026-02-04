import { Command } from "commander";
import { getConfig, setDefaultProvider, setProviderConfig } from "../core/config.js";
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
    .description("寫入設定")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--default-provider <provider>", "預設支付服務")
    .option("--merchant-id <id>", "商店代號")
    .option("--hash-key <key>", "HashKey")
    .option("--hash-iv <iv>", "HashIV")
    .option("--sandbox", "使用測試環境")
    .action(async (opts) => {
      if (!opts.provider && !opts.defaultProvider) {
        throw new Error("請提供 --provider 或 --default-provider");
      }

      if (opts.defaultProvider) {
        await setDefaultProvider(opts.defaultProvider as ProviderName);
      }

      if (opts.provider) {
        await setProviderConfig(opts.provider as ProviderName, {
          merchantId: opts.merchantId,
          hashKey: opts.hashKey,
          hashIv: opts.hashIv,
          sandbox: Boolean(opts.sandbox)
        });
      }

      console.log("設定已更新");
    });

  config.addHelpText(
    "after",
    `\nExamples:\n  paid config get\n  paid config get --provider=payuni\n\n  paid config set --default-provider=payuni\n  paid config set --provider=payuni --merchant-id=MS12345678 --hash-key=... --hash-iv=...\n  paid config set --provider=payuni --sandbox\n\nNotes:\n  設定檔位置: ~/.config/paid/config.toml\n  CLI flags 會覆蓋 env 與設定檔\n`
  );
}
