import { Command } from "commander";
import { getConfig } from "../core/config.js";
import { formatDoctorPretty, runDoctor } from "../core/doctor.js";
import { success, error, formatOutput } from "../core/output.js";

export function registerDoctorCommand(program: Command) {
  program
    .command("doctor")
    .description("檢查設定與環境變數")
    .option("--provider <provider>", "支付服務 (payuni/newebpay/ecpay)")
    .option("--format <format>", "輸出格式 (json/pretty)")
    .option("--json", "JSON 格式輸出（等同 --format=json）")
    .action(async (opts) => {
      try {
        const cfg = await getConfig();
        const result = await runDoctor(opts.provider, cfg);
        
        // Support both --json and --format=json
        const useJson = opts.json || opts.format === "json";
        const response = success(result, {
          command: "doctor",
        });

        if (useJson) {
          console.log(formatOutput(response, true));
        } else {
          // Pretty format - use existing formatter
          console.log(formatDoctorPretty(result));
        }

        if (result.env.missing.length) {
          throw new Error("缺少必要環境變數");
        }
      } catch (err) {
        const useJson = opts.json || opts.format === "json";
        const response = error(
          "DOCTOR_CHECK_FAILED",
          err instanceof Error ? err.message : String(err),
          {
            suggestions: [
              "請指定 --provider 或設定預設 provider",
              "例如：paid doctor --provider=payuni",
              "或：paid config set --default-provider=payuni"
            ]
          },
          { command: "doctor" }
        );
        console.error(formatOutput(response, useJson));
        process.exit(1);
      }
    });
}
