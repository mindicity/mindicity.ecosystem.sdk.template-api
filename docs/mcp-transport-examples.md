# MCP Transport Examples

This document provides practical examples of how to use different MCP transport types with your Mindicity API.

## 🚨 MANDATORY MCP TOOL IMPLEMENTATION

**CRITICAL:** When creating new API modules, MCP tools MUST be implemented according to these rules:

### Default Implementation: HTTP Transport

**IF NO TRANSPORT SPECIFIED**: MCP tools MUST be implemented for **HTTP transport** (default)

```typescript
// User Request Examples → MANDATORY HTTP Implementation
"Create users API module"
"Create products API with CRUD operations"
"Add orders module with status management"

// Result: HTTP transport with full MCP tools mandatorily implemented
```

### Explicit SSE Implementation

**IF SSE EXPLICITLY REQUESTED**: MCP tools MUST be implemented **ONLY for SSE transport**

```typescript
// User Request Examples → SSE Implementation
"Create notifications API with SSE transport"
"Create chat API for real-time messaging"
"Add events module with server-sent events"

// Result: SSE transport only (basic connectivity, limited functionality)
```

## Transport Examples

## Stdio Transport Example

### Configuration
```bash
MCP_ENABLED=true
MCP_TRANSPORT=stdio
MCP_SERVER_NAME=my-api
MCP_SERVER_VERSION=1.0.0
```

### Usage with Kiro
```json
{
  "mcpServers": {
    "my-api": {
      "command": "node",
      "args": ["dist/main.js"],
      "env": {
        "MCP_ENABLED": "true",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

## HTTP Transport Example (Default for New Modules)

### Configuration

```bash
MCP_ENABLED=true
MCP_TRANSPORT=http
MCP_HOST=localhost
MCP_PORT=3235
MCP_SERVER_NAME=my-api
MCP_SERVER_VERSION=1.0.0
```

**Why HTTP is Default:**
- ✅ **Complete MCP functionality** - All tools and resources available
- ✅ **Production ready** - Robust error handling and comprehensive logging
- ✅ **MCP Inspector compatible** - Works with all MCP debugging tools
- ✅ **Easy testing** - Use any HTTP client (curl, Postman, MCP Inspector)
- ✅ **Automatic implementation** - Tools generated automatically for new API modules

### Usage with curl

```bash
# Test MCP request
curl -X POST http://localhost:3235/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

### Usage with JavaScript

```javascript
async function callMcpTool(toolName, params = {}) {
  const response = await fetch('http://localhost:3235/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    })
  });
  
  return response.json();
}

// Example usage - automatically generated tools
const apiInfo = await callMcpTool('get_api_info');
const usersList = await callMcpTool('get_users_list', { page: 1, limit: 10 });
const newUser = await callMcpTool('create_user', { name: 'John Doe', email: 'john@example.com' });
console.log(apiInfo, usersList, newUser);
```

## SSE Transport Example (Explicit Request Only)

### Configuration

```bash
MCP_ENABLED=true
MCP_TRANSPORT=sse
MCP_HOST=localhost
MCP_PORT=3235
MCP_SERVER_NAME=my-api
MCP_SERVER_VERSION=1.0.0
```

**When to Use SSE:**
- ⚠️ **Limited functionality** - Only supports `initialize` method
- ⚠️ **No tools or resources** - Redirects to HTTP transport for full functionality
- ✅ **Real-time events** - Suitable for streaming notifications (future use)
- ✅ **Explicit request only** - Must be specifically requested for real-time features

### Server Information

```bash
# Get server info
curl http://localhost:3235/mcp/info
```

### Event Stream Connection

```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3235/mcp/events');

eventSource.onopen = () => {
  console.log('Connected to MCP server');
};

eventSource.addEventListener('connected', (event) => {
  const data = JSON.parse(event.data);
  console.log('Server connected:', data);
});

eventSource.addEventListener('mcp-request', (event) => {
  const data = JSON.parse(event.data);
  console.log('MCP request processed:', data);
});

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
};
```

### Making Requests with SSE

```javascript
async function makeMcpRequest(method, params = {}) {
  const response = await fetch('http://localhost:3235/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: method,
      params: params
    })
  });
  
  return response.json();
}

// The request will also be broadcast to SSE clients
const result = await makeMcpRequest('tools/call', {
  name: 'get_api_health'
});
```

### HTML Example for SSE
```html
<!DOCTYPE html>
<html>
<head>
    <title>MCP SSE Example</title>
</head>
<body>
    <h1>MCP Server Events</h1>
    <div id="events"></div>
    <button onclick="makeRequest()">Test API Health</button>

    <script>
        const eventsDiv = document.getElementById('events');
        
        // Connect to SSE
        const eventSource = new EventSource('http://localhost:3235/mcp/events');
        
        eventSource.onmessage = (event) => {
            const div = document.createElement('div');
            div.textContent = `Event: ${event.data}`;
            eventsDiv.appendChild(div);
        };
        
        eventSource.addEventListener('connected', (event) => {
            const div = document.createElement('div');
            div.textContent = `Connected: ${event.data}`;
            div.style.color = 'green';
            eventsDiv.appendChild(div);
        });
        
        eventSource.addEventListener('mcp-request', (event) => {
            const div = document.createElement('div');
            div.textContent = `MCP Request: ${event.data}`;
            div.style.color = 'blue';
            eventsDiv.appendChild(div);
        });
        
        async function makeRequest() {
            try {
                const response = await fetch('http://localhost:3235/mcp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: Date.now(),
                        method: 'tools/call',
                        params: {
                            name: 'get_api_health'
                        }
                    })
                });
                
                const result = await response.json();
                console.log('Response:', result);
            } catch (error) {
                console.error('Error:', error);
            }
        }
    </script>
</body>
</html>
```

## Transport Comparison

| Feature | Stdio | HTTP (Default) | SSE (Explicit Only) |
|---------|-------|----------------|---------------------|
| **Use Case** | CLI tools, direct process | Web APIs, REST clients, **New API modules** | Real-time web apps (explicit request) |
| **Complexity** | Simple | Medium | Medium |
| **Real-time Events** | No | No | Yes |
| **Web Compatible** | No | Yes | Yes |
| **Firewall Friendly** | N/A | Yes | Yes |
| **Load Balancing** | No | Yes | Yes |
| **Debugging** | Hard | Easy | Easy |
| **MCP Tools** | Full | **Full (Auto-generated)** | Limited (Basic connectivity only) |
| **Implementation** | Manual | **Mandatory for new modules** | Explicit request only |

## Production Considerations

### Stdio Transport

- ✅ Lowest latency
- ✅ No network overhead
- ❌ Not web-accessible
- ❌ Single process only

### HTTP Transport (Default for New Modules)

- ✅ Web-compatible
- ✅ Load balancer friendly
- ✅ Easy to debug
- ✅ **Mandatory MCP tool implementation**
- ✅ **Complete functionality**
- ❌ No real-time events
- ❌ Higher latency

### SSE Transport (Explicit Request Only)

- ✅ Real-time events
- ✅ Web-compatible
- ✅ Bi-directional communication
- ❌ More complex setup
- ❌ Browser connection limits
- ❌ **Limited functionality** (basic connectivity only)
- ❌ **Must be explicitly requested**

## Security Considerations

### HTTP/SSE Transports
- Always use HTTPS in production
- Implement proper authentication
- Consider rate limiting
- Use CORS appropriately
- Monitor for abuse

### Example Production Configuration
```bash
# Production HTTP/SSE setup
MCP_ENABLED=true
MCP_TRANSPORT=https  # Use HTTPS in production
MCP_HOST=0.0.0.0     # Bind to all interfaces
MCP_PORT=443         # Standard HTTPS port
MCP_SERVER_NAME=production-api
MCP_SERVER_VERSION=1.0.0
```