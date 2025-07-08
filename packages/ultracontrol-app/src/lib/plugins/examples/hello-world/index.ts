/**
 * Hello World Plugin
 * 
 * Example plugin demonstrating the UltraControl plugin API
 */

import type { 
  Plugin, 
  PluginContext, 
  PluginManifest,
  Disposable
} from '../../api/PluginAPI';
import manifest from './plugin.json';

export class HelloWorldPlugin implements Plugin {
  public manifest: PluginManifest = manifest as PluginManifest;
  
  private context!: PluginContext;
  private messageCount = 0;
  private intervalId?: NodeJS.Timeout;
  
  /**
   * Activate the plugin
   */
  async activate(context: PluginContext): Promise<void> {
    this.context = context;
    
    context.logger.info('Hello World plugin activated!');
    
    // Register commands
    this.registerCommands();
    
    // Register UI components
    this.registerUI();
    
    // Listen to events
    this.setupEventListeners();
    
    // Start periodic greeting if configured
    const config = context.configuration;
    if (config.get('autoGreet', false)) {
      this.startAutoGreeting();
    }
    
    // Show activation message
    await context.ui.showInformationMessage(
      'Hello World plugin is now active!',
      'Show Info',
      'Dismiss'
    ).then(action => {
      if (action === 'Show Info') {
        this.showInfo();
      }
    });
  }
  
  /**
   * Deactivate the plugin
   */
  async deactivate(): Promise<void> {
    this.context.logger.info('Hello World plugin deactivated!');
    
    // Stop auto greeting
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    
    // Cleanup is handled automatically by subscriptions
  }
  
  /**
   * Get plugin exports
   */
  getExports(): any {
    return {
      sayHelloTo: (name: string) => this.sayHelloTo(name),
      getMessageCount: () => this.messageCount
    };
  }
  
  /**
   * Register commands
   */
  private registerCommands(): void {
    // Say Hello command
    this.context.subscriptions.push(
      this.context.commands.registerCommand('sayHello', () => {
        this.sayHello();
      })
    );
    
    // Show Info command
    this.context.subscriptions.push(
      this.context.commands.registerCommand('showInfo', () => {
        this.showInfo();
      })
    );
    
    // Custom greeting command
    this.context.subscriptions.push(
      this.context.commands.registerCommand('customGreeting', async () => {
        const name = await this.context.ui.showInputBox({
          title: 'Custom Greeting',
          prompt: 'Enter a name to greet',
          placeHolder: 'World'
        });
        
        if (name) {
          this.sayHelloTo(name);
        }
      })
    );
  }
  
  /**
   * Register UI components
   */
  private registerUI(): void {
    // Register the panel component
    this.context.subscriptions.push(
      this.context.ui.registerComponent('HelloWorldPanel', {
        render: () => this.renderPanel()
      })
    );
    
    // Create status bar item
    const statusItem = this.context.ui.createStatusBarItem();
    statusItem.text = '👋 Hello';
    statusItem.tooltip = 'Click to say hello';
    statusItem.command = 'hello-world.sayHello';
    statusItem.show();
    
    this.context.subscriptions.push(statusItem);
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for configuration changes
    this.context.subscriptions.push(
      this.context.configuration.onDidChange(event => {
        if (event.affectsConfiguration('autoGreet')) {
          const autoGreet = this.context.configuration.get('autoGreet', false);
          if (autoGreet) {
            this.startAutoGreeting();
          } else {
            this.stopAutoGreeting();
          }
        }
      })
    );
    
    // Listen for custom events
    this.context.subscriptions.push(
      this.context.events.on('workspace:opened', () => {
        this.context.logger.info('Workspace opened, saying hello!');
        this.sayHello();
      })
    );
    
    // Create custom event emitter
    const greetingEmitter = this.context.events.createEventEmitter<{
      greeting: string;
      timestamp: Date;
    }>();
    
    // Emit events when greeting
    this.context.subscriptions.push({
      dispose: () => greetingEmitter.dispose()
    });
  }
  
  /**
   * Say hello
   */
  private sayHello(): void {
    const greeting = this.context.configuration.get('greeting', 'Hello');
    const showTimestamp = this.context.configuration.get('showTimestamp', true);
    
    let message = `${greeting}, World!`;
    
    if (showTimestamp) {
      message += ` (${new Date().toLocaleTimeString()})`;
    }
    
    this.messageCount++;
    
    // Log to output channel
    const output = this.context.logger.createChannel('Hello World');
    output.appendLine(message);
    output.show();
    
    // Emit event
    this.context.events.emit('hello-world:greeted', {
      message,
      count: this.messageCount
    });
  }
  
  /**
   * Say hello to specific name
   */
  private sayHelloTo(name: string): void {
    const greeting = this.context.configuration.get('greeting', 'Hello');
    const message = `${greeting}, ${name}!`;
    
    this.messageCount++;
    
    this.context.ui.showInformationMessage(message);
    
    this.context.logger.info(message);
  }
  
  /**
   * Show plugin info
   */
  private async showInfo(): Promise<void> {
    const info = [
      `Plugin: ${this.manifest.name} v${this.manifest.version}`,
      `Author: ${this.manifest.author.name}`,
      `Message Count: ${this.messageCount}`,
      '',
      'Commands:',
      '- Say Hello (Ctrl+Alt+H)',
      '- Show Plugin Info',
      '- Custom Greeting'
    ].join('\n');
    
    await this.context.ui.showInformationMessage(info, 'OK');
  }
  
  /**
   * Start auto greeting
   */
  private startAutoGreeting(): void {
    if (this.intervalId) {
      return;
    }
    
    const interval = this.context.configuration.get('greetInterval', 60000);
    
    this.intervalId = setInterval(() => {
      this.sayHello();
    }, interval);
    
    this.context.logger.info(`Started auto greeting every ${interval}ms`);
  }
  
  /**
   * Stop auto greeting
   */
  private stopAutoGreeting(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.context.logger.info('Stopped auto greeting');
    }
  }
  
  /**
   * Render the panel UI
   */
  private renderPanel(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'hello-world-panel';
    container.style.padding = '20px';
    
    const header = document.createElement('h2');
    header.textContent = 'Hello World Plugin';
    container.appendChild(header);
    
    const stats = document.createElement('div');
    stats.innerHTML = `
      <p>Messages sent: <strong>${this.messageCount}</strong></p>
      <p>Status: <strong>Active</strong></p>
    `;
    container.appendChild(stats);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '20px';
    
    const helloButton = document.createElement('button');
    helloButton.textContent = 'Say Hello';
    helloButton.onclick = () => this.sayHello();
    buttonContainer.appendChild(helloButton);
    
    const customButton = document.createElement('button');
    customButton.textContent = 'Custom Greeting';
    customButton.style.marginLeft = '10px';
    customButton.onclick = () => {
      this.context.commands.executeCommand('hello-world.customGreeting');
    };
    buttonContainer.appendChild(customButton);
    
    container.appendChild(buttonContainer);
    
    // Configuration section
    const configSection = document.createElement('div');
    configSection.style.marginTop = '30px';
    configSection.innerHTML = '<h3>Configuration</h3>';
    
    const greetingInput = document.createElement('input');
    greetingInput.type = 'text';
    greetingInput.value = this.context.configuration.get('greeting', 'Hello');
    greetingInput.placeholder = 'Greeting text';
    greetingInput.onchange = async (e) => {
      await this.context.configuration.update(
        'greeting', 
        (e.target as HTMLInputElement).value
      );
    };
    
    const timestampCheckbox = document.createElement('input');
    timestampCheckbox.type = 'checkbox';
    timestampCheckbox.checked = this.context.configuration.get('showTimestamp', true);
    timestampCheckbox.onchange = async (e) => {
      await this.context.configuration.update(
        'showTimestamp',
        (e.target as HTMLInputElement).checked
      );
    };
    
    const timestampLabel = document.createElement('label');
    timestampLabel.textContent = ' Show timestamp';
    timestampLabel.prepend(timestampCheckbox);
    
    configSection.appendChild(greetingInput);
    configSection.appendChild(document.createElement('br'));
    configSection.appendChild(timestampLabel);
    
    container.appendChild(configSection);
    
    return container;
  }
}

// Export as default for plugin loader
export default HelloWorldPlugin;