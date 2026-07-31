import { Command } from "commander";
import { createPayment, getPayment, refundPayment } from "../core/payments.js";
import { PaymentMethod, ProviderName } from "../core/schema.js";
import { resolveProviderName } from "../core/config.js";
import { formatPaymentOutput } from "../core/format.js";
import { success, formatOutput, errorFromException } from "../core/output.js";

export function registerPaymentsCommands(program: Command) {
  const payments = program.command("payments").description("交易建立、查詢、退款");

  payments
    .command("create")
    .description("建立交易")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay/ecpay-ecpg)")
    .requiredOption("--amount <amount>", "金額")
    .option("--currency <currency>", "幣別", "TWD")
    .requiredOption("--method <method>", "付款方式 (card/linepay/atm/cvs)")
    .requiredOption("--order-id <orderId>", "訂單編號")
    .option("--item-desc <desc>", "商品描述")
    .option("--return-url <url>", "Return URL / OrderResultURL")
    .option("--notify-url <url>", "Notify URL / ReturnURL")
    .option("--email <email>", "消費者 email（ecpay-ecpg 與 phone 擇一必填）")
    .option("--phone <phone>", "消費者電話（ecpay-ecpg 與 email 擇一必填）")
    .option("--json", "JSON 格式輸出")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      try {
        const runtime = resolveRuntimeSandbox(opts);
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
            notifyUrl: opts.notifyUrl,
            email: opts.email,
            phone: opts.phone,
          },
          runtime,
        );
        const response = success(result, {
          command: "payments create",
          environment:
            runtime?.sandbox === true
              ? "sandbox"
              : runtime?.sandbox === false
                ? "production"
                : undefined,
        });
        console.log(formatOutput(response, opts.json ?? false));
      } catch (err) {
        const response = errorFromException("PAYMENT_CREATE_FAILED", err, {
          command: "payments create",
        });
        console.error(formatOutput(response, opts.json ?? false));
        process.exit(1);
      }
    });

  payments
    .command("get")
    .description("查詢交易")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay/ecpay-ecpg)")
    .option("--id <id>", "交易 ID（MerTradeNo）")
    .option("--trade-no <tradeNo>", "UNi 序號（TradeNo）")
    .option("--format <format>", "輸出格式 (json/pretty)")
    .option("--json", "JSON 格式輸出（等同 --format=json）")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      try {
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
            tradeNo: opts.tradeNo,
          },
          runtime,
        );

        // Support both --json and --format=json
        const useJson = opts.json || opts.format === "json";
        const response = success(result, {
          command: "payments get",
          environment:
            runtime?.sandbox === true
              ? "sandbox"
              : runtime?.sandbox === false
                ? "production"
                : undefined,
        });

        if (useJson) {
          console.log(formatOutput(response, true));
        } else {
          // Pretty format - use existing formatter
          console.log(formatPaymentOutput(result, "pretty"));
        }
      } catch (err) {
        const useJson = opts.json || opts.format === "json";
        const response = errorFromException("PAYMENT_GET_FAILED", err, {
          command: "payments get",
        });
        console.error(formatOutput(response, useJson));
        process.exit(1);
      }
    });

  payments
    .command("refund")
    .description("退款")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay/ecpay-ecpg)")
    .requiredOption("--id <id>", "交易 ID")
    .option("--amount <amount>", "退款金額，預設全額")
    .option("--json", "JSON 格式輸出")
    .option("--sandbox", "使用測試環境（覆蓋設定）")
    .option("--production", "使用正式環境（覆蓋設定）")
    .action(async (opts) => {
      try {
        const runtime = resolveRuntimeSandbox(opts);
        const provider = await resolveProviderName(opts.provider);
        const result = await refundPayment(
          {
            provider: provider as ProviderName,
            id: opts.id,
            amount: opts.amount ? Number(opts.amount) : undefined,
          },
          runtime,
        );
        const response = success(result, {
          command: "payments refund",
          environment:
            runtime?.sandbox === true
              ? "sandbox"
              : runtime?.sandbox === false
                ? "production"
                : undefined,
        });
        console.log(formatOutput(response, opts.json ?? false));
      } catch (err) {
        const response = errorFromException("PAYMENT_REFUND_FAILED", err, {
          command: "payments refund",
        });
        console.error(formatOutput(response, opts.json ?? false));
        process.exit(1);
      }
    });

  payments.addHelpText(
    "after",
    `\nExamples:\n  paid payments create --provider=payuni --amount=100 --currency=TWD --method=card --order-id=ORDER123 \\\n    --item-desc="T-shirt" --return-url=https://example.com/return --notify-url=https://example.com/notify\n\n  paid payments create --provider=ecpay-ecpg --amount=100 --method=card --order-id=ORDER123 \\\n    --notify-url=https://example.com/notify --email=buyer@example.com --sandbox\n\n  paid payments get --provider=payuni --id=Ax234234jisdi\n\n  paid payments refund --provider=ecpay --id=ORDER123 --amount=100\n\nNotes:\n  --method: card | linepay | atm | cvs\n  --amount 需為數字\n  provider: payuni | newebpay | ecpay (AIO 導轉) | ecpay-ecpg (站內付 2.0 Token)\n  ecpay-ecpg create 回傳 mode:token（給前端 JS），需 --email 或 --phone\n  ecpay-ecpg 憑證: ECPAY_ECPG_* 或共用 ECPAY_*\n  provider 預設順序: --provider > PAID_DEFAULT_PROVIDER > config.toml > 單一 providers 自動選擇\n  環境覆蓋: --sandbox / --production / PAID_ENV\n  --format: json | pretty\n`,
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
