export function subscriptionEnvironment(source = process.env) {
  const env = { ...source };
  for (const key of Object.keys(env)) {
    if (
      /^(OPENAI_|CODEX_API_KEY$|ANTHROPIC_|AWS_|AZURE_|GOOGLE_|GCLOUD_|GCP_|NODE_OPTIONS$|NODE_PATH$|CLAUDE_CODE_USE_(BEDROCK|VERTEX|FOUNDRY)$|CLAUDE_CODE_OAUTH_TOKEN$|CODEX_(APP_TOOLS_PIPE_PATH|SESSION_ID|THREAD_ID|TASK_WORKSPACE_VERIFYING_IDENTITY|INTERNAL_ORIGINATOR_OVERRIDE)$)/i.test(key)
    )
      delete env[key];
  }
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1";
  return env;
}

export function requireIncludedBilling(argv, providers) {
  if (providers.includes("codex") && !argv.includes("--codex-credits-unavailable"))
    throw new Error(
      "Codex requires --codex-credits-unavailable: confirm no usage credits are available and automatic reload is off. Subscription authentication alone does not prevent credit spending.",
    );
  if (providers.includes("claude") && !argv.includes("--claude-extra-usage-disabled"))
    throw new Error(
      "Claude requires --claude-extra-usage-disabled to honor zero additional spending",
    );
}
