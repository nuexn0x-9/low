# LOW Model Context Protocol (MCP) Bridge Notes

This document specifies the architectural foundation for exposing **LOW Universal Agent Connect** as an official Model Context Protocol (MCP) server for Claude Desktop, Cursor, and other MCP-compliant agents.

---

## 1. Mapping Agent Actions to MCP Tools

In an MCP bridge, each Agent Connect action maps cleanly to an MCP Tool:

| MCP Tool Name | Target Agent Action | Parameters | Description |
|---|---|---|---|
| `low.get_document` | `get_document` | `sessionId`, `token` | Read complete design document |
| `low.list_screens` | `list_screens` | `sessionId`, `token` | List screen summaries & element counts |
| `low.create_screen` | `create_screen` | `sessionId`, `token`, `name`, `elements?` | Create a new mobile screen |
| `low.add_element` | `add_element` | `sessionId`, `token`, `screenId`, `element` | Add element to screen |
| `low.update_element` | `update_element` | `sessionId`, `token`, `screenId`, `elementId`, `patch` | Update styling or properties |
| `low.resize_element` | `resize_element` | `sessionId`, `token`, `screenId`, `elementId`, `width`, `height` | Resize element dimensions |
| `low.duplicate_element` | `duplicate_element` | `sessionId`, `token`, `screenId`, `elementId`, `offsetX?`, `offsetY?` | Duplicate element with offset |
| `low.batch_update` | `batch_update` | `sessionId`, `token`, `operations` | Atomic execution of up to 25 operations |
| `low.create_ai_draft` | `create_ai_draft` | `sessionId`, `token`, `resultType`, `prompt` | Request AI engine design generation |
| `low.apply_ai_draft` | `apply_ai_draft` | `sessionId`, `token`, `draftId` | Apply validated AI draft to canvas |
| `low.undo_last_change` | `undo_last_agent_change` | `sessionId`, `token` | Undo the last mutation |

---

## 2. Bridge Transport Architecture

```
+------------------------+      stdio / SSE       +----------------------+
| External AI Agent      | <===================> | low-mcp-server       |
| (Claude, Cursor, etc.) |                        | (Python / TypeScript)|
+------------------------+                        +----------------------+
                                                             |
                                                             | HTTP Requests
                                                             | (X-LOW-Token)
                                                             v
                                                  +----------------------+
                                                  | LOW Backend          |
                                                  | (/api/agent/...)     |
                                                  +----------------------+
```

- **Authentication**: Token passed as environment variable `LOW_TOKEN` or parameter per tool call.
- **Connection**: `stdio` transport for desktop agents (e.g. Claude Desktop `claude_desktop_config.json`), `sse` transport for remote deployments.
