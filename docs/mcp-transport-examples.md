# MCP Transport Examples

This document provides practical examples of how to use different MCP transport types with your Mindicity API.

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

## HTTP Transport Example

### Configuration
```bash
MCP_ENABLED=true
MCP_TRANSPORT=http
MCP_HOST=localhost
MCP_PORT=3233
MCP_SERVER_NAME=my-api
MCP_SERVER_VERSION=1.0.0
```

### Usage with curl
```bash
# Test MCP request
curl -X POST http://localhost:3233/mcp \
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
  const response = await fetch('http://localhost:3233/mcp', {
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

// Example usage
const apiInfo = await callMcpTool('get_api_info');
console.log(apiInfo);
```

## SSE Transport Example

### Configuration
```bash
MCP_ENABLED=true
MCP_TRANSPORT=sse
MCP_HOST=localhost
MCP_PORT=3233
MCP_SERVER_NAME=my-api
MCP_SERVER_VERSION=1.0.0
```

### Server Information
```bash
# Get server info
curl http://localhost:3233/mcp/info
```

### Event Stream Connection
```javascript
// Connect to SSE stream
const eventSource = new EventSource('http://localhost:3233/mcp/events');

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
  const response = await fetch('http://localhost:3233/mcp', {
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
        const eventSource = new EventSource('http://localhost:3233/mcp/events');
        
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
                const response = await fetch('http://localhost:3233/mcp', {
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

| Feature | Stdio | HTTP | SSE |
|---------|-------|------|-----|
| **Use Case** | CLI tools, direct process | Web APIs, REST clients | Real-time web apps |
| **Complexity** | Simple | Medium | Medium |
| **Real-time Events** | No | No | Yes |
| **Web Compatible** | No | Yes | Yes |
| **Firewall Friendly** | N/A | Yes | Yes |
| **Load Balancing** | No | Yes | Yes |
| **Debugging** | Hard | Easy | Easy |

## Production Considerations

### Stdio Transport
- ✅ Lowest latency
- ✅ No network overhead
- ❌ Not web-accessible
- ❌ Single process only

### HTTP Transport
- ✅ Web-compatible
- ✅ Load balancer friendly
- ✅ Easy to debug
- ❌ No real-time events
- ❌ Higher latency

### SSE Transport
- ✅ Real-time events
- ✅ Web-compatible
- ✅ Bi-directional communication
- ❌ More complex setup
- ❌ Browser connection limits

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