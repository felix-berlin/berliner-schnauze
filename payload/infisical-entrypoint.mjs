import { spawn, spawnSync } from "node:child_process";

const appArgs = process.argv.slice(2);
if (appArgs.length === 0) throw new Error("No application command provided");

const infisicalEnabled = process.env.INFISICAL_ENABLED === "true";
const clientId = process.env.INFISICAL_CLIENT_ID;
const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
const projectId = process.env.INFISICAL_PROJECT_ID;
const environment = process.env.INFISICAL_ENV;

let runtimeEnv = process.env;
let command = process.execPath;
let commandArgs = appArgs;

if (infisicalEnabled) {
  if (!clientId || !clientSecret || !projectId || !environment) {
    throw new Error(
      "INFISICAL_ENABLED=true requires INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID, and INFISICAL_ENV",
    );
  }

  const login = spawnSync(
    "/usr/local/bin/infisical",
    [
      "login",
      "--method=universal-auth",
      `--client-id=${clientId}`,
      `--client-secret=${clientSecret}`,
      "--plain",
      "--silent",
    ],
    { encoding: "utf8" },
  );
  if (login.error) throw login.error;
  if (login.status !== 0) {
    throw new Error(
      `Infisical Universal Auth failed${login.stderr ? `: ${login.stderr.trim()}` : ""}`,
    );
  }

  const token = login.stdout.trim();
  if (!token) throw new Error("Infisical Universal Auth returned an empty token");

  runtimeEnv = { ...process.env, INFISICAL_TOKEN: token };
  delete runtimeEnv.INFISICAL_CLIENT_ID;
  delete runtimeEnv.INFISICAL_CLIENT_SECRET;
  delete runtimeEnv.INFISICAL_PROJECT_ID;
  delete runtimeEnv.INFISICAL_ENV;
  delete runtimeEnv.INFISICAL_ENABLED;
  delete runtimeEnv.INFISICAL_WEB_CLIENT_ID;
  delete runtimeEnv.INFISICAL_WEB_CLIENT_SECRET;
  delete runtimeEnv.INFISICAL_CMS_CLIENT_ID;
  delete runtimeEnv.INFISICAL_CMS_CLIENT_SECRET;
  delete runtimeEnv.APP_RUNTIME_ENV_FILE;

  command = "/usr/local/bin/infisical";
  commandArgs = [
    "sm",
    "run",
    `--projectId=${projectId}`,
    `--env=${environment}`,
    "--",
    process.execPath,
    ...appArgs,
  ];
}

const child = spawn(command, commandArgs, { stdio: "inherit", env: runtimeEnv });
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => child.kill(signal));
}
child.once("error", (error) => {
  console.error("Failed to start application:", error);
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
