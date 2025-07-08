/**
 * WebSocket Mock for Testing
 * 
 * Simulates WebSocket behavior for testing purposes
 */

export class WebSocketMock {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  public readyState: number = WebSocketMock.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;

  private sentMessages: any[] = [];
  private messageHandlers: Map<string, Function[]> = new Map();
  private connectionHeaders: Record<string, string> = {};
  private reconnectCount = 0;
  
  public failConnection = false;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    
    // Simulate connection
    setTimeout(() => {
      if (!this.failConnection) {
        this.readyState = WebSocketMock.OPEN;
        if (this.onopen) {
          this.onopen(new Event('open'));
        }
      } else {
        this.readyState = WebSocketMock.CLOSED;
        if (this.onerror) {
          this.onerror(new Event('error'));
        }
      }
    }, 10);
  }

  send(data: string | ArrayBuffer | Blob): void {
    if (this.readyState !== WebSocketMock.OPEN) {
      throw new Error('WebSocket is not open');
    }

    let message: any;
    if (typeof data === 'string') {
      try {
        message = JSON.parse(data);
      } catch {
        message = data;
      }
    } else {
      message = data;
    }

    this.sentMessages.push(message);
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocketMock.CLOSING;
    
    setTimeout(() => {
      this.readyState = WebSocketMock.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code, reason }));
      }
    }, 10);
  }

  // Testing helpers
  simulateMessage(message: any): void {
    if (this.onmessage && this.readyState === WebSocketMock.OPEN) {
      const event = new MessageEvent('message', {
        data: JSON.stringify(message)
      });
      this.onmessage(event);
    }
  }

  simulateRawMessage(data: string): void {
    if (this.onmessage && this.readyState === WebSocketMock.OPEN) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }
  }

  simulateError(error: Error): void {
    if (this.onerror) {
      const event = new Event('error');
      Object.defineProperty(event, 'error', { value: error });
      this.onerror(event);
    }
  }

  getLastSentMessage(): any {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  getSentMessageCount(): number {
    return this.sentMessages.length;
  }

  getSentMessages(): any[] {
    return [...this.sentMessages];
  }

  clearSentMessages(): void {
    this.sentMessages = [];
  }

  setConnectionHeaders(headers: Record<string, string>): void {
    this.connectionHeaders = headers;
  }

  getConnectionHeaders(): Record<string, string> {
    return { ...this.connectionHeaders };
  }

  incrementReconnectCount(): void {
    this.reconnectCount++;
  }

  getReconnectCount(): number {
    return this.reconnectCount;
  }

  addEventListener(event: string, handler: Function): void {
    if (!this.messageHandlers.has(event)) {
      this.messageHandlers.set(event, []);
    }
    this.messageHandlers.get(event)!.push(handler);
  }

  removeEventListener(event: string, handler: Function): void {
    const handlers = this.messageHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }
}