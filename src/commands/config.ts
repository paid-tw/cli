import { Command } from "commander";
import { getConfig, setDefaultProvider, setOutputFormat, setProviderConfig } from "../core/config.js";
import { ProviderName } from "../core/schema.js";
import { success, error, formatOutput } from "../core/output.js";

export function registerConfigCommands(program: Command) {
  const config = program.command("config").description("設定檔操作");

  config
    .command("get")
    .description("取得設定")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--json", "JSON 格式輸出")
    .action(async (opts) => {
      try {
        const cfg = await getConfig();
        const data = opts.provider
          ? cfg.providers?.[opts.provider as ProviderName] ?? {}
          : cfg;
        
        const response = success(data, {
          command: "config get",
        });
        console.log(formatOutput(response, opts.json ?? false));
      } catch (err) {
        const response = error(
          "CONFIG_GET_FAILED",
          err instanceof Error ? err.message : String(err),
          err,
          { command: "config get" }
        );
        console.error(formatOutput(response, opts.json ?? false));
        process.exit(1);
      }
    });

  config
    .command("set")
    .description("寫入設定")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--default-provider <provider>", "預設支付服務")
    .option("--output-format <format>", "輸出格式 (json/pretty)")
    .option("--merchant-id <id>", "商店代號")
    .option("--hash-key <key>", "HashKey")
    .option("--hash-iv <iv>", "HashIV")
    .option("--sandbox", "使用測試環境")
    .option("--json", "JSON 格式輸出")
    .action(async (opts) => {
      try {
        if (!opts.provider && !opts.defaultProvider && !opts.outputFormat) {
          throw new Error("請提供 --provider、--default-provider 或 --output-format");
        }

        const updates: Record<string, unknown> = {};

        if (opts.defaultProvider) {
          await setDefaultProvider(opts.defaultProvider as ProviderName);
          updates.defaultProvider = opts.defaultProvider;
        }

        if (opts.outputFormat) {
          const format = opts.outputFormat;
          if (format !== "json" && format !== "pretty") {
            throw new Error("輸出格式僅支援 json 或 pretty");
          }
          await setOutputFormat(format);
          updates.outputFormat = format;
        }

        if (opts.provider) {
          const providerConfig = {
            merchantId: opts.merchantId,
            hashKey: opts.hashKey,
            hashIv: opts.hashIv,
            sandbox: Boolean(opts.sandbox)
          };
          await setProviderConfig(opts.provider as ProviderName, providerConfig);
          updates.provider = opts.provider;
          updates.config = providerConfig;
        }

        const response = success(
          { message: "設定已更新", updates },
          { command: "config set" }
        );
        console.log(formatOutput(response, opts.json ?? false));
      } catch (err) {
        const response = error(
          "CONFIG_SET_FAILED",
          err instanceof Error ? err.message : String(err),
          err,
          { command: "config set" }
        );
        console.error(formatOutput(response, opts.json ?? false));
        process.exit(1);
      }
    });

  config.addHelpText(
    "after",
    `\nExamples:\n  paid config get\n  paid config get --provider=payuni\n\n  paid config set --default-provider=payuni\n  paid config set --output-format=pretty\n  paid config set --provider=payuni --merchant-id=MS12345678 --hash-key=... --hash-iv=...\n  paid config set --provider=payuni --sandbox\n\nNotes:\n  設定檔位置: ~/.config/paid/config.toml\n  CLI flags 會覆蓋 env 與設定檔\n`
  );
}
