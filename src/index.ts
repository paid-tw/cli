#!/usr/bin/env node
import { Command } from "commander";
import { registerAuthCommands } from "./commands/auth.js";
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

registerAuthCommands(program);
registerPaymentsCommands(program);
registerConfigCommands(program);
registerProviderCommands(program);

program.addHelpText(
  "after",
  `\nExamples:\n  paid auth login\n  paid providers list\n  paid payments create --provider=payuni --amount=100 --currency=TWD --method=card --order-id=ORDER123\n  paid payments get --provider=payuni --id=Ax234234jisdi\n  paid payments refund --provider=payuni --id=Ax234234jisdi --amount=100\n  paid config set --provider=payuni --merchant-id=MS12345678 --hash-key=... --hash-iv=...\n  paid config get --provider=payuni\n\nConfig priority:\n  1) CLI flags\n  2) ENV\n  3) ~/.config/paid/config.toml\n`
);

program.parseAsync(process.argv);
