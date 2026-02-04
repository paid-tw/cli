import { Command } from "commander";
import { createPayment, getPayment, refundPayment } from "../core/payments.js";
import { PaymentMethod, ProviderName } from "../core/schema.js";

export function registerPaymentsCommands(program: Command) {
  const payments = program.command("payments").description("交易建立、查詢、退款");

  payments
    .command("create")
    .description("建立交易")
    .requiredOption("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .requiredOption("--amount <amount>", "金額")
    .option("--currency <currency>", "幣別", "TWD")
    .requiredOption("--method <method>", "付款方式 (card/linepay/atm/cvs)")
    .requiredOption("--order-id <orderId>", "訂單編號")
    .option("--item-desc <desc>", "商品描述")
    .option("--return-url <url>", "Return URL")
    .option("--notify-url <url>", "Notify URL")
    .action(async (opts) => {
      const result = await createPayment({
        provider: opts.provider as ProviderName,
        amount: Number(opts.amount),
        currency: opts.currency,
        method: opts.method as PaymentMethod,
        orderId: opts.orderId,
        itemDesc: opts.itemDesc,
        returnUrl: opts.returnUrl,
        notifyUrl: opts.notifyUrl
      });
      console.log(JSON.stringify(result, null, 2));
    });

  payments
    .command("get")
    .description("查詢交易")
    .requiredOption("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .requiredOption("--id <id>", "交易 ID")
    .action(async (opts) => {
      const result = await getPayment({
        provider: opts.provider as ProviderName,
        id: opts.id
      });
      console.log(JSON.stringify(result, null, 2));
    });

  payments
    .command("refund")
    .description("退款")
    .requiredOption("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .requiredOption("--id <id>", "交易 ID")
    .option("--amount <amount>", "退款金額，預設全額")
    .action(async (opts) => {
      const result = await refundPayment({
        provider: opts.provider as ProviderName,
        id: opts.id,
        amount: opts.amount ? Number(opts.amount) : undefined
      });
      console.log(JSON.stringify(result, null, 2));
    });
}
