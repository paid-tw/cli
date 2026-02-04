import { Command } from "commander";
import { listProviders } from "../core/providers.js";

export function registerProviderCommands(program: Command) {
  const providers = program.command("providers").description("支付服務清單");

  providers
    .command("list")
    .description("列出可用的支付服務")
    .action(() => {
      const result = listProviders();
      console.log(JSON.stringify(result, null, 2));
    });

  providers.addHelpText(
    "after",
    `\nExamples:\n  paid providers list\n`
  );
}
