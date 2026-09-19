import { afterEach, describe, expect, test } from "vitest";
import type { Config, PluginInput } from "@opencode-ai/plugin";
import context7 from "./index.js";

const originalApiKey = process.env.CONTEXT7_API_KEY;

async function configure(config: Config, options?: Record<string, unknown>): Promise<void> {
  const hooks = await context7.server({} as PluginInput, options);
  await hooks.config?.(config);
}

afterEach(() => {
  if (originalApiKey === undefined) delete process.env.CONTEXT7_API_KEY;
  else process.env.CONTEXT7_API_KEY = originalApiKey;
});

describe("Context7 OpenCode plugin", () => {
  test("configures the OAuth endpoint and bundled skill by default", async () => {
    delete process.env.CONTEXT7_API_KEY;
    const config: Config = {};

    await configure(config);

    expect(config.mcp?.context7).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp/oauth",
      enabled: true,
    });
    expect((config as Config & { skills?: { paths?: string[] } }).skills?.paths).toHaveLength(1);
  });

  test("uses the API key option without leaking it into the URL", async () => {
    delete process.env.CONTEXT7_API_KEY;
    const config: Config = {};

    await configure(config, { apiKey: "ctx7sk-test" });

    expect(config.mcp?.context7).toEqual({
      type: "remote",
      url: "https://mcp.context7.com/mcp",
      enabled: true,
      headers: { Authorization: "Bearer ctx7sk-test" },
      oauth: false,
    });
  });

  test("prefers an explicit plugin API key over the environment", async () => {
    process.env.CONTEXT7_API_KEY = "ctx7sk-env";
    const config: Config = {};

    await configure(config, { apiKey: "ctx7sk-option" });

    expect(config.mcp?.context7).toMatchObject({
      headers: { Authorization: "Bearer ctx7sk-option" },
    });
  });

  test("preserves user-owned MCP configuration and deduplicates the skill path", async () => {
    delete process.env.CONTEXT7_API_KEY;
    const custom = {
      type: "remote" as const,
      url: "https://context7.internal.example/mcp",
      enabled: false,
      oauth: false as const,
    };
    const config = {
      mcp: { context7: custom },
      skills: { paths: [] as string[] },
    } as Config & { skills: { paths: string[] } };

    await configure(config);
    await configure(config);

    expect(config.mcp?.context7).toBe(custom);
    expect(config.skills.paths).toHaveLength(1);
  });
});
