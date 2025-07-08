# UltraControl Unified API Interface

A comprehensive API interface specification that provides a unified abstraction layer across bolt.new, devin-clone, and OpenHands.

## Overview

The Unified API Interface enables seamless integration and communication between the three core tools in the UltraControl ecosystem:

- **bolt.new**: Browser-based code execution and web development
- **devin-clone**: AI-powered task planning and decomposition
- **OpenHands**: Autonomous AI agents for software development

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UltraControl Application                  │
├─────────────────────────────────────────────────────────────┤
│                    Unified API Interface                     │
├─────────────┬────────────────┬──────────────────────────────┤
│  bolt.new   │  devin-clone   │       OpenHands              │
│  Adapter    │    Adapter     │        Adapter               │
├─────────────┼────────────────┼──────────────────────────────┤
│  bolt.new   │  devin-clone   │       OpenHands              │
│    API      │     API        │         API                  │
└─────────────┴────────────────┴──────────────────────────────┘
```

## Core Interfaces

### 1. Base Types (`interfaces/base.ts`)

Foundational types used across all interfaces:

- **ApiResponse**: Standard response wrapper with success/error handling
- **ApiError**: Structured error information
- **Pagination**: Common pagination parameters and responses
- **Operation**: Long-running operation tracking
- **Resource**: Base resource type with metadata

### 2. Execution Interface (`interfaces/execution.ts`)

Handles code execution across different environments:

```typescript
interface ExecutionRequest {
  code: string;
  language: string;
  runtime?: RuntimeType;
  environment?: ExecutionEnvironment;
  context?: ExecutionContext;
}
```

Supported environments:
- `browser`: WebContainer (bolt.new)
- `docker`: Containerized execution (OpenHands)
- `local`: Local machine execution
- `sandbox`: Isolated sandbox
- `cloud`: Cloud-based execution

### 3. File System Interface (`interfaces/filesystem.ts`)

Unified file operations across all tools:

```typescript
interface IFileSystemClient {
  read(request: FileReadRequest): Promise<ApiResponse<FileContent>>;
  write(request: FileWriteRequest): Promise<ApiResponse<void>>;
  list(request: DirectoryListRequest): Promise<ApiResponse<PaginatedResponse<FileStat>>>;
  search(request: FileSearchRequest): Promise<ApiResponse<PaginatedResponse<FileSearchResult>>>;
  watch(request: FileWatchRequest): Promise<ApiResponse<string>>;
}
```

Features:
- File CRUD operations
- Directory management
- File search with content matching
- Real-time file watching
- File versioning and diff

### 4. Agent Interface (`interfaces/agent.ts`)

Unified agent management and orchestration:

```typescript
interface Agent {
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  configuration: AgentConfiguration;
  status: AgentStatus;
}
```

Agent types:
- `executor`: Immediate code execution (bolt.new)
- `planner`: Task planning and decomposition (devin)
- `autonomous`: Self-directed problem solving (OpenHands)
- `assistant`: General purpose helper
- `specialist`: Domain-specific expert

### 5. Project Interface (`interfaces/project.ts`)

Project and workspace management:

```typescript
interface Project {
  name: string;
  type: ProjectType;
  language: ProjectLanguage;
  framework?: ProjectFramework;
  dependencies?: ProjectDependency[];
  configuration?: ProjectConfiguration;
}
```

## Usage

### Basic Client Usage

```typescript
import { createApiClient } from '@/lib/api/client';
import type { IApiClient } from '@/lib/api/interfaces';

// Create client instance
const client: IApiClient = createApiClient({
  baseUrl: 'http://localhost:8000',
  auth: {
    type: 'bearer',
    credentials: 'your-api-token'
  }
});

// Connect to the service
await client.connect();

// Execute code
const result = await client.execution.execute({
  code: 'console.log("Hello, World!")',
  language: 'javascript',
  environment: 'browser'
});

// Work with files
const files = await client.filesystem.list({
  path: '/project',
  recursive: true
});

// Create an agent
const agent = await client.agent.createAgent({
  name: 'Code Assistant',
  type: 'executor',
  capabilities: ['code-generation', 'code-execution']
});

// Assign a task
const task = await client.agent.createTask(agent.data.id, {
  title: 'Implement user authentication',
  description: 'Add JWT-based auth to the Express API'
});
```

### Event Handling

```typescript
// Subscribe to file changes
const unsubscribe = client.filesystem.onFileChange((event) => {
  console.log(`File ${event.path} was ${event.event}`);
});

// Subscribe to agent events
client.agent.onAgentEvent((event) => {
  if (event.type === 'task.completed') {
    console.log(`Task ${event.taskId} completed`);
  }
});

// Clean up
unsubscribe();
await client.disconnect();
```

### Error Handling

```typescript
import { isErrorResponse, isApiError } from '@/lib/api/interfaces';

const response = await client.execution.execute(request);

if (isErrorResponse(response)) {
  console.error(`API Error: ${response.error.message}`);
  
  if (response.error.code === 'TIMEOUT') {
    // Handle timeout specifically
  }
}
```

## Implementation Guide

### Creating an Adapter

To integrate a new tool or service:

```typescript
import type { IExecutionClient } from '@/lib/api/interfaces';

export class MyToolExecutionAdapter implements IExecutionClient {
  async execute(request: ExecutionRequest): Promise<ApiResponse<ExecutionResult>> {
    // Transform request to tool-specific format
    const toolRequest = this.transformRequest(request);
    
    // Call tool's native API
    const toolResult = await myToolApi.run(toolRequest);
    
    // Transform response to unified format
    return this.transformResponse(toolResult);
  }
  
  // Implement other required methods...
}
```

### Extending Interfaces

Add new capabilities by extending existing interfaces:

```typescript
// Custom agent capability
interface CustomAgentCapability extends AgentCapability {
  customFeature: string;
}

// Extended agent interface
interface ExtendedAgent extends Agent {
  customCapabilities: CustomAgentCapability[];
}
```

## Best Practices

1. **Always use type imports**: 
   ```typescript
   import type { IApiClient } from '@/lib/api/interfaces';
   ```

2. **Handle pagination**: 
   ```typescript
   let allItems = [];
   let page = 1;
   let hasMore = true;
   
   while (hasMore) {
     const response = await client.filesystem.list({ 
       path: '/', 
       page, 
       pageSize: 100 
     });
     
     if (isSuccessResponse(response)) {
       allItems.push(...response.data.items);
       hasMore = response.data.hasNext;
       page++;
     }
   }
   ```

3. **Use type guards**:
   ```typescript
   if (isApiError(error)) {
     logger.error(`[${error.code}] ${error.message}`);
   }
   ```

4. **Subscribe to events selectively**:
   ```typescript
   // Only subscribe to specific agent events
   client.agent.onAgentEvent((event) => {
     if (event.agentId === myAgent.id && event.type === 'action.completed') {
       handleActionComplete(event);
     }
   });
   ```

## Type Safety

The API is fully typed with TypeScript. Use the provided types for maximum type safety:

```typescript
import type { 
  ExecutionRequest,
  ExecutionResult,
  AgentTask,
  FileSearchResult 
} from '@/lib/api/interfaces';

// Type-safe function
async function executeAndSearch(
  client: IApiClient,
  code: string
): Promise<FileSearchResult[]> {
  // TypeScript ensures all required fields are provided
  const execResult = await client.execution.execute({
    code,
    language: 'typescript',
    environment: 'browser'
  });
  
  if (isSuccessResponse(execResult)) {
    const searchResult = await client.filesystem.search({
      query: 'TODO',
      searchIn: 'content'
    });
    
    return isSuccessResponse(searchResult) ? searchResult.data.items : [];
  }
  
  return [];
}
```

## Migration Guide

### From bolt.new API
```typescript
// Before (bolt.new specific)
const webcontainer = await WebContainer.boot();
await webcontainer.spawn('npm', ['install']);

// After (unified API)
const result = await client.execution.execute({
  code: 'npm install',
  language: 'shell',
  environment: 'browser'
});
```

### From devin-clone API
```typescript
// Before (devin specific)
const task = await devinApi.createTask({
  description: 'Build a REST API'
});

// After (unified API)
const agent = await client.agent.createAgent({
  type: 'planner',
  name: 'Devin'
});
const task = await client.agent.createTask(agent.data.id, {
  title: 'Build a REST API',
  description: 'Create a RESTful API with Express'
});
```

### From OpenHands API
```typescript
// Before (OpenHands specific)
const agent = new Agent({ name: 'coder' });
await agent.run('implement login');

// After (unified API)
const agent = await client.agent.createAgent({
  type: 'autonomous',
  name: 'coder'
});
await client.agent.createTask(agent.data.id, {
  title: 'implement login',
  goal: 'Implement secure user login'
});
```

## Contributing

When adding new functionality:

1. Define interfaces in the appropriate file under `interfaces/`
2. Extend existing interfaces when possible
3. Add type guards for new types
4. Update this documentation
5. Create adapter implementations for each tool
6. Add comprehensive tests

## Future Enhancements

- GraphQL support
- WebSocket subscriptions for all operations
- Batch operations API
- Plugin system for extending capabilities
- Advanced caching strategies
- Offline support with sync