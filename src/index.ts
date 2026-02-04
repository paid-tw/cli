#!/usr/bin/env node
import { Command } from "commander";
import { registerTwCommands } from "./commands/auth.js";
import { registerPaymentsCommands } from "./commands/payments.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerProviderCommands } from "./commands/providers.js";

const program = new Command();

program
  .name("paid")
  .description("paid CLI: 台灣金流整合工具（MVP: PAYUNi）")
  .version("0.1.0")
  .showHelpAfterError()
  .showSuggestionAfterError();

registerPaymentsCommands(program);
registerConfigCommands(program);
registerProviderCommands(program);
registerTwCommands(program);

program.addHelpText(
  "after",
  `\npaid-tw (optional):\n  paid tw --help\n\nExamples:\n  paid providers list\n\n  paid payments create --provider=payuni --amount=100 --currency=TWD --method=card --order-id=ORDER123 \\\n    --item-desc="T-shirt" --return-url=https://example.com/return --notify-url=https://example.com/notify\n\n  paid payments get --provider=payuni --id=Ax234234jisdi\n\n  paid payments refund --provider=payuni --id=Ax234234jisdi --amount=100\n\nOptional (paid.tw OAuth only):\n  paid tw auth login\n  paid tw auth status\n\n  paid config set --provider=payuni --merchant-id=MS12345678 --hash-key=... --hash-iv=... --sandbox\n  paid config set --default-provider=payuni\n  paid config get --provider=payuni\n\nConfig priority:\n  1) CLI flags\n  2) ENV\n  3) ~/.config/paid/config.toml\n\nDefault provider priority:\n  1) --provider\n  2) PAID_DEFAULT_PROVIDER\n  3) config.toml defaultProvider\n  4) 單一 providers 自動選擇\n\nENV (PAYUNi):\n  PAYUNI_MERCHANT_ID\n  PAYUNI_HASH_KEY\n  PAYUNI_HASH_IV\n  PAYUNI_SANDBOX=true\n\nENV (default provider):\n  PAID_DEFAULT_PROVIDER=payuni\n\nPayment methods:\n  card | linepay | atm | cvs\n`
);

program.parseAsync(process.argv);
