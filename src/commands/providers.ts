import { Command } from "commander";
import { listProviders } from "../core/providers.js";
import { resolveProviderName } from "../core/config.js";
import { getPayment } from "../core/payments.js";
import { ProviderName } from "../core/schema.js";

export function registerProviderCommands(program: Command) {
  const providers = program.command("providers").description("支付服務清單");

  providers
    .command("list")
    .description("列出可用的支付服務")
    .action(() => {
      const result = listProviders();
      console.log(JSON.stringify(result, null, 2));
    });

  providers
    .command("ping")
    .description("連線測試（依 provider 實作）")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--id <id>", "交易 ID（MerTradeNo）")
    .option("--trade-no <tradeNo>", "UNi 序號（TradeNo）")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      const runtime = resolveRuntimeSandbox(opts);
      const provider = await resolveProviderName(opts.provider);
      if (provider !== "payuni") {
        throw new Error("目前僅支援 PAYUNi 連線測試");
      }
      if (!opts.id && !opts.tradeNo) {
        throw new Error("請提供 --id 或 --trade-no");
      }
      if (opts.id && opts.tradeNo) {
        throw new Error("請擇一使用 --id 或 --trade-no");
      }
      const result = await getPayment(
        {
          provider: provider as ProviderName,
          id: opts.id,
          tradeNo: opts.tradeNo
        },
        runtime
      );
      console.log(JSON.stringify(result, null, 2));
    });

  providers.addHelpText(
    "after",
    `\nExamples:\n  paid providers list\n  paid providers ping --provider=payuni --id=ORDER-123\n  paid providers ping --provider=payuni --trade-no=UNI123456789\n`
  );
}

function resolveRuntimeSandbox(opts: { sandbox?: boolean; production?: boolean }) {
  if (opts.sandbox && opts.production) {
    throw new Error("請擇一使用 --sandbox 或 --production");
  }
  if (opts.sandbox) return { sandbox: true };
  if (opts.production) return { sandbox: false };
  return undefined;
}
