# 🔌 Ora MCP (Model Context Protocol) Server

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/Protocol-MCP-orange.svg)](https://modelcontextprotocol.io/)

> A **Model Context Protocol (MCP)** server for **Ora Components**, enabling LLMs and AI coding assistants to programmatically discover, inspect, and generate standard component architectures.

This package exposes tools, resources, and prompt templates directly to your editor's AI, allowing it to write syntactically correct, lifecycle-safe, and highly-performant Ora Component compositions.

---

## ⚡ Features Exposed

*   🔍 **Schema Discovery**: Instantly lookup API parameters, builder methods, and styling options for all 17+ components.
*   📐 **Template Injector**: Generate boilerplates for components adhering strictly to the monorepo's conventions (Builder Pattern, `registerDestroy` cleanups).
*   🎨 **Design System Inspector**: Query Tailwind CSS utilities, HSL color tokens, and theme-variable guidelines.
*   💡 **Best Practices Reference**: Guides on reactivity, event handling, and memory leak preventions.

---

## 🚀 Installation & Running

### Build the MCP Server
To compile the TypeScript source files of the server:
```bash
npm run build
```

### Start the Server
To launch the MCP server in standard I/O (stdio) mode (suitable for integration with Cline, Cursor, or Claude Desktop):
```bash
npm run start
```

---

## ⚙️ Configuration for Claude Desktop

Add this configuration block to your Claude Desktop configuration file (usually located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ora-components": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://mcp.ora-components.com/api/mcp"
      ]
    }
  }
}
```
