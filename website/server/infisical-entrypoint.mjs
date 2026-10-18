import { spawn, spawnSync } from "node:child_process";

const appArgs = process.argv.slice(2);
if (appArgs.length === 0) throw new Error("No application command provided");

const infisicalEnabled = process.env.INFISICAL_ENABLED === "true";
const clientId = process.env.INFISICAL_CLIENT_ID;
const clientSecret = process.env.INFISICAL_CLIENT_SECRET;
const projectId = process.env.INFISICAL_PROJECT_ID;
const environment = process.env.INFISICAL_ENV;

// The app never sees the Infisical config or credentials.
const containerEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith("INFISICAL_") && key !== "APP_RUNTIME_ENV_FILE",
  ),
);
let runtimeEnv = containerEnv;

function infisical(args, env = process.env) {
  // INFISICAL_DOMAIN (self-hosted instance) is read from env.
  const result = spawnSync("/usr/local/bin/infisical", args, {
    encoding: "utf8",
    env,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `infisical ${args[0]} failed${result.stderr ? `: ${result.stderr.trim()}` : ""}`,
    );
  }
  return result.stdout.trim();
}

if (infisicalEnabled) {
  if (!clientId || !clientSecret || !projectId || !environment) {
    throw new Error(
      "INFISICAL_ENABLED=true requires INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID, and INFISICAL_ENV",
    );
  }

  const token = infisical([
    "login",
    "--method=universal-auth",
    `--client-id=${clientId}`,
    `--client-secret=${clientSecret}`,
    "--plain",
    "--silent",
  ]);
  if (!token) throw new Error("Infisical Universal Auth returned an empty token");

  const secrets = JSON.parse(
    infisical(
      ["export", "--format=json", `--projectId=${projectId}`, `--env=${environment}`, "--silent"],
      { ...process.env, INFISICAL_TOKEN: token },
    ),
  );
  // The container's own env (compose `environment`, image ENV) wins: `infisical run` would let a secret
  // override NODE_ENV, DATABASE_URL, OG_CACHE_DIR, … pinned for the container.
  runtimeEnv = {
    ...Object.fromEntries(secrets.map(({ key, value }) => [key, value])),
    ...containerEnv,
  };
}

const child = spawn(process.execPath, appArgs, { env: runtimeEnv, stdio: "inherit" });
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
