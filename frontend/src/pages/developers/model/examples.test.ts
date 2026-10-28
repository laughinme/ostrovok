import { describe, expect, it } from "vitest";
import { EXAMPLES, curl, mcpConfig, preview } from "./examples";

describe("developer examples", () => {
  it("builds a POST curl with the JSON body", () => {
    const text = curl("https://okno.example", EXAMPLES[0]!);
    expect(text).toContain("curl -X POST 'https://okno.example/api/v1/intents'");
    expect(text).toContain('"text":');
  });
  it("points MCP clients at /mcp on the same origin", () => {
    expect(JSON.parse(mcpConfig("http://localhost:8080")).mcpServers.okno.url).toBe(
      "http://localhost:8080/mcp",
    );
  });
  it("cuts long previews", () => {
    expect(preview({ text: "x".repeat(50) }, 20).endsWith("…")).toBe(true);
  });
});
