import { Command } from "commander";
import { createPayment, getPayment, refundPayment } from "../core/payments.js";
import { PaymentMethod, ProviderName } from "../core/schema.js";
import { getConfig, resolveProviderName } from "../core/config.js";
import { formatPaymentOutput, OutputFormat } from "../core/format.js";

export function registerPaymentsCommands(program: Command) {
  const payments = program.command("payments").description("交易建立、查詢、退款");

  payments
    .command("create")
    .description("建立交易")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .requiredOption("--amount <amount>", "金額")
    .option("--currency <currency>", "幣別", "TWD")
    .requiredOption("--method <method>", "付款方式 (card/linepay/atm/cvs)")
    .requiredOption("--order-id <orderId>", "訂單編號")
    .option("--item-desc <desc>", "商品描述")
    .option("--return-url <url>", "Return URL")
    .option("--notify-url <url>", "Notify URL")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      const runtime = resolveRuntimeSandbox(opts);
      if (!opts.id && !opts.tradeNo) {
        throw new Error("請提供 --id 或 --trade-no");
      }
      if (opts.id && opts.tradeNo) {
        throw new Error("請擇一使用 --id 或 --trade-no");
      }
      const provider = await resolveProviderName(opts.provider);
      const result = await createPayment(
        {
          provider: provider as ProviderName,
          amount: Number(opts.amount),
          currency: opts.currency,
          method: opts.method as PaymentMethod,
          orderId: opts.orderId,
          itemDesc: opts.itemDesc,
          returnUrl: opts.returnUrl,
          notifyUrl: opts.notifyUrl
        },
        runtime
      );
      console.log(JSON.stringify(result, null, 2));
    });

  payments
    .command("get")
    .description("查詢交易")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--id <id>", "交易 ID（MerTradeNo）")
    .option("--trade-no <tradeNo>", "UNi 序號（TradeNo）")
    .option("--format <format>", "輸出格式 (json/pretty)")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      const runtime = resolveRuntimeSandbox(opts);
      if (!opts.id && !opts.tradeNo) {
        throw new Error("請提供 --id 或 --trade-no");
      }
      if (opts.id && opts.tradeNo) {
        throw new Error("請擇一使用 --id 或 --trade-no");
      }
      const provider = await resolveProviderName(opts.provider);
      const result = await getPayment(
        {
          provider: provider as ProviderName,
          id: opts.id,
          tradeNo: opts.tradeNo
        },
        runtime
      );
      const outputFormat = await resolveOutputFormat(opts.format);
      console.log(formatPaymentOutput(result, outputFormat));
    });

  payments
    .command("refund")
    .description("退款")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .requiredOption("--id <id>", "交易 ID")
    .option("--amount <amount>", "退款金額，預設全額")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      const runtime = resolveRuntimeSandbox(opts);
      const provider = await resolveProviderName(opts.provider);
      const result = await refundPayment(
        {
          provider: provider as ProviderName,
          id: opts.id,
          amount: opts.amount ? Number(opts.amount) : undefined
        },
        runtime
      );
      console.log(JSON.stringify(result, null, 2));
    });

  payments.addHelpText(
    "after",
    `\nExamples:\n  paid payments create --provider=payuni --amount=100 --currency=TWD --method=card --order-id=ORDER123 \\\n    --item-desc="T-shirt" --return-url=https://example.com/return --notify-url=https://example.com/notify\n\n  paid payments create --provider=payuni --amount=200 --method=linepay --order-id=ORDER124\n\n  paid payments get --provider=payuni --id=Ax234234jisdi\n\n  paid payments refund --provider=payuni --id=Ax234234jisdi --amount=100\n\nNotes:\n  --method: card | linepay | atm | cvs\n  --amount 需為數字\n  provider 預設順序: --provider > PAID_DEFAULT_PROVIDER > config.toml > 單一 providers 自動選擇\n  環境覆蓋: --sandbox / --production / PAID_ENV\n  PAYUNi 查詢: --id=MerTradeNo 或 --trade-no=TradeNo\n  PAYUNi 查詢: 會自動帶 Version=2.0、Timestamp、User-Agent=payuni\n  --format: json | pretty\n`
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

async function resolveOutputFormat(format?: string): Promise<OutputFormat> {
  if (format === "json" || format === "pretty") return format;
  const cfg = await getConfig();
  if (cfg.outputFormat === "json" || cfg.outputFormat === "pretty") {
    return cfg.outputFormat;
  }
  return "json";
}
