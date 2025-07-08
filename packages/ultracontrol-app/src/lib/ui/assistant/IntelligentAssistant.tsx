/**
 * Intelligent Assistant Component
 * 
 * Provides context-aware assistance with:
 * - Project understanding
 * - Intent inference
 * - Proactive suggestions
 * - Code generation
 * - Error resolution
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { createScopedLogger } from '@/lib/utils/logger';
import { LLMManager } from '@/lib/llm/manager';
import { ContextManager } from '@/lib/llm/context';
import type { Task } from '@/lib/agents/orchestrator/TaskDecomposer';

const logger = createScopedLogger('IntelligentAssistant');

export interface AssistantSuggestion {
  id: string;
  type: 'code' | 'task' | 'fix' | 'refactor' | 'explain' | 'next-step';
  title: string;
  description: string;
  confidence: number;
  data: any;
  actions: SuggestionAction[];
}

export interface SuggestionAction {
  id: string;
  label: string;
  primary?: boolean;
  handler: () => void | Promise<void>;
}

export interface ProjectContext {
  files: FileContext[];
  dependencies: string[];
  recentErrors: ErrorContext[];
  currentTask?: Task;
  completedTasks: Task[];
  activeAgents: string[];
}

export interface FileContext {
  path: string;
  language: string;
  content?: string;
  lastModified: Date;
  imports?: string[];
  exports?: string[];
}

export interface ErrorContext {
  message: string;
  file?: string;
  line?: number;
  timestamp: Date;
  resolved?: boolean;
}

interface IntelligentAssistantProps {
  llmManager: LLMManager;
  contextManager: ContextManager;
  onSuggestionApply?: (suggestion: AssistantSuggestion) => void;
  maxSuggestions?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const IntelligentAssistant: React.FC<IntelligentAssistantProps> = ({
  llmManager,
  contextManager,
  onSuggestionApply,
  maxSuggestions = 5,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}) => {
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectContext, setProjectContext] = useState<ProjectContext | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [assistantMode, setAssistantMode] = useState<'proactive' | 'reactive'>('proactive');
  
  // Get data from stores
  // const currentTask = useStore(currentTaskStore);
  // const openFiles = useStore(openFilesStore);
  // const recentErrors = useStore(errorsStore);

  // Gather project context
  const gatherProjectContext = useCallback(async (): Promise<ProjectContext> => {
    // This would integrate with the actual project analysis
    const context: ProjectContext = {
      files: [
        {
          path: '/src/App.tsx',
          language: 'typescript',
          lastModified: new Date(),
          imports: ['react', './components/Header'],
          exports: ['App']
        },
        {
          path: '/src/server.py',
          language: 'python',
          lastModified: new Date(),
          imports: ['fastapi', 'sqlalchemy'],
          exports: ['app']
        }
      ],
      dependencies: ['react', 'typescript', 'fastapi', 'postgresql'],
      recentErrors: [
        {
          message: "Cannot find module './components/Header'",
          file: '/src/App.tsx',
          line: 3,
          timestamp: new Date(),
          resolved: false
        }
      ],
      activeAgents: ['bolt', 'openhands'],
      completedTasks: []
    };
    
    return context;
  }, []);

  // Analyze project and generate suggestions
  const analyzePr
  oject = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      const context = await gatherProjectContext();
      setProjectContext(context);
      
      // Generate suggestions using LLM
      const suggestions = await generateSuggestions(context, llmManager, contextManager);
      setSuggestions(suggestions.slice(0, maxSuggestions));
    } catch (error) {
      logger.error('Failed to analyze project:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [gatherProjectContext, llmManager, contextManager, maxSuggestions]);

  // Auto-refresh suggestions
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(analyzeProject, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, analyzeProject]);

  // Initial analysis
  useEffect(() => {
    analyzeProject();
  }, [analyzeProject]);

  // Handle suggestion actions
  const handleSuggestionAction = useCallback(async (suggestion: AssistantSuggestion, action: SuggestionAction) => {
    try {
      await action.handler();
      
      if (onSuggestionApply) {
        onSuggestionApply(suggestion);
      }
      
      // Remove applied suggestion
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
    } catch (error) {
      logger.error('Failed to apply suggestion:', error);
    }
  }, [onSuggestionApply]);

  // Categorize suggestions
  const categorizedSuggestions = useMemo(() => {
    const categories: Record<string, AssistantSuggestion[]> = {
      errors: [],
      improvements: [],
      nextSteps: [],
      explanations: []
    };
    
    suggestions.forEach(suggestion => {
      switch (suggestion.type) {
        case 'fix':
          categories.errors.push(suggestion);
          break;
        case 'refactor':
        case 'code':
          categories.improvements.push(suggestion);
          break;
        case 'next-step':
        case 'task':
          categories.nextSteps.push(suggestion);
          break;
        case 'explain':
          categories.explanations.push(suggestion);
          break;
      }
    });
    
    return categories;
  }, [suggestions]);

  return (
    <div className="intelligent-assistant">
      {/* Assistant Header */}
      <div className="assistant-header">
        <div className="header-content">
          <h2>AI Assistant</h2>
          <span className={`status ${isAnalyzing ? 'analyzing' : 'ready'}`}>
            {isAnalyzing ? '🔄 Analyzing...' : '✨ Ready'}
          </span>
        </div>
        
        <div className="header-actions">
          <select
            className="mode-select"
            value={assistantMode}
            onChange={(e) => setAssistantMode(e.target.value as 'proactive' | 'reactive')}
          >
            <option value="proactive">Proactive</option>
            <option value="reactive">Reactive</option>
          </select>
          
          <button
            className="refresh-button"
            onClick={analyzeProject}
            disabled={isAnalyzing}
          >
            🔄
          </button>
        </div>
      </div>
      
      {/* Project Overview */}
      {projectContext && (
        <div className="project-overview">
          <h3>Project Context</h3>
          <div className="context-stats">
            <div className="stat">
              <span className="label">Files</span>
              <span className="value">{projectContext.files.length}</span>
            </div>
            <div className="stat">
              <span className="label">Dependencies</span>
              <span className="value">{projectContext.dependencies.length}</span>
            </div>
            <div className="stat">
              <span className="label">Active Errors</span>
              <span className="value error">{projectContext.recentErrors.filter(e => !e.resolved).length}</span>
            </div>
            <div className="stat">
              <span className="label">Active Agents</span>
              <span className="value">{projectContext.activeAgents.length}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Suggestions */}
      <div className="suggestions-container">
        {/* Error Fixes */}
        {categorizedSuggestions.errors.length > 0 && (
          <SuggestionCategory
            title="🔧 Fix Errors"
            suggestions={categorizedSuggestions.errors}
            onAction={handleSuggestionAction}
            selectedId={selectedSuggestion}
            onSelect={setSelectedSuggestion}
          />
        )}
        
        {/* Code Improvements */}
        {categorizedSuggestions.improvements.length > 0 && (
          <SuggestionCategory
            title="💡 Improvements"
            suggestions={categorizedSuggestions.improvements}
            onAction={handleSuggestionAction}
            selectedId={selectedSuggestion}
            onSelect={setSelectedSuggestion}
          />
        )}
        
        {/* Next Steps */}
        {categorizedSuggestions.nextSteps.length > 0 && (
          <SuggestionCategory
            title="👉 Next Steps"
            suggestions={categorizedSuggestions.nextSteps}
            onAction={handleSuggestionAction}
            selectedId={selectedSuggestion}
            onSelect={setSelectedSuggestion}
          />
        )}
        
        {/* Explanations */}
        {categorizedSuggestions.explanations.length > 0 && (
          <SuggestionCategory
            title="📚 Learn More"
            suggestions={categorizedSuggestions.explanations}
            onAction={handleSuggestionAction}
            selectedId={selectedSuggestion}
            onSelect={setSelectedSuggestion}
          />
        )}
        
        {/* Empty state */}
        {suggestions.length === 0 && !isAnalyzing && (
          <div className="empty-state">
            <p>No suggestions at the moment. Keep coding! 🚀</p>
          </div>
        )}
      </div>
      
      {/* Assistant Chat */}
      <AssistantChat
        llmManager={llmManager}
        contextManager={contextManager}
        projectContext={projectContext}
      />
    </div>
  );
};

// Suggestion Category Component
interface SuggestionCategoryProps {
  title: string;
  suggestions: AssistantSuggestion[];
  onAction: (suggestion: AssistantSuggestion, action: SuggestionAction) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const SuggestionCategory: React.FC<SuggestionCategoryProps> = ({
  title,
  suggestions,
  onAction,
  selectedId,
  onSelect
}) => {
  return (
    <div className="suggestion-category">
      <h3>{title}</h3>
      <div className="suggestions-list">
        {suggestions.map(suggestion => (
          <div
            key={suggestion.id}
            className={`suggestion-card ${selectedId === suggestion.id ? 'selected' : ''}`}
            onClick={() => onSelect(suggestion.id === selectedId ? null : suggestion.id)}
          >
            <div className="suggestion-header">
              <span className="suggestion-title">{suggestion.title}</span>
              <span className="confidence">{Math.round(suggestion.confidence * 100)}%</span>
            </div>
            
            {selectedId === suggestion.id && (
              <>
                <div className="suggestion-description">
                  {suggestion.description}
                </div>
                
                <div className="suggestion-actions">
                  {suggestion.actions.map(action => (
                    <button
                      key={action.id}
                      className={`action-button ${action.primary ? 'primary' : 'secondary'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction(suggestion, action);
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Assistant Chat Component
interface AssistantChatProps {
  llmManager: LLMManager;
  contextManager: ContextManager;
  projectContext: ProjectContext | null;
}

const AssistantChat: React.FC<AssistantChatProps> = ({
  llmManager,
  contextManager,
  projectContext
}) => {
  const [question, setQuestion] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  
  const handleAsk = async () => {
    if (!question.trim()) return;
    
    setIsThinking(true);
    setResponse(null);
    
    try {
      // Add project context to the conversation
      const contextPrompt = projectContext 
        ? `Given the following project context:
           - Files: ${projectContext.files.map(f => f.path).join(', ')}
           - Dependencies: ${projectContext.dependencies.join(', ')}
           - Recent errors: ${projectContext.recentErrors.length}
           
           User question: ${question}`
        : question;
      
      const result = await llmManager.complete({
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent coding assistant. Provide helpful, concise responses based on the project context.'
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        temperature: 0.7,
        maxTokens: 500
      });
      
      setResponse(result.content);
    } catch (error) {
      logger.error('Failed to get assistant response:', error);
      setResponse('Sorry, I encountered an error while processing your question.');
    } finally {
      setIsThinking(false);
    }
  };
  
  return (
    <div className="assistant-chat">
      <h3>Ask the Assistant</h3>
      
      <div className="chat-input">
        <input
          type="text"
          placeholder="Ask a question about your code..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          disabled={isThinking}
        />
        <button
          className="ask-button"
          onClick={handleAsk}
          disabled={isThinking || !question.trim()}
        >
          {isThinking ? '🤔' : '→'}
        </button>
      </div>
      
      {response && (
        <div className="chat-response">
          <p>{response}</p>
        </div>
      )}
    </div>
  );
};

// Generate suggestions using LLM
async function generateSuggestions(
  context: ProjectContext,
  llmManager: LLMManager,
  contextManager: ContextManager
): Promise<AssistantSuggestion[]> {
  const suggestions: AssistantSuggestion[] = [];
  
  // Generate error fix suggestions
  for (const error of context.recentErrors.filter(e => !e.resolved)) {
    suggestions.push({
      id: `fix-${error.timestamp.getTime()}`,
      type: 'fix',
      title: `Fix: ${error.message}`,
      description: `Resolve the error in ${error.file} at line ${error.line}`,
      confidence: 0.9,
      data: error,
      actions: [
        {
          id: 'auto-fix',
          label: 'Auto Fix',
          primary: true,
          handler: async () => {
            logger.info('Applying auto fix for error:', error);
          }
        },
        {
          id: 'explain',
          label: 'Explain Error',
          handler: async () => {
            logger.info('Explaining error:', error);
          }
        }
      ]
    });
  }
  
  // Generate improvement suggestions
  if (context.files.some(f => f.language === 'typescript')) {
    suggestions.push({
      id: 'improve-types',
      type: 'refactor',
      title: 'Add TypeScript strict mode',
      description: 'Enable strict type checking for better type safety',
      confidence: 0.8,
      data: { file: 'tsconfig.json' },
      actions: [
        {
          id: 'apply',
          label: 'Apply',
          primary: true,
          handler: async () => {
            logger.info('Enabling TypeScript strict mode');
          }
        }
      ]
    });
  }
  
  // Generate next step suggestions
  suggestions.push({
    id: 'next-step-1',
    type: 'next-step',
    title: 'Add unit tests',
    description: 'Create unit tests for your recent code changes',
    confidence: 0.7,
    data: { files: context.files.slice(0, 2) },
    actions: [
      {
        id: 'generate-tests',
        label: 'Generate Tests',
        primary: true,
        handler: async () => {
          logger.info('Generating unit tests');
        }
      }
    ]
  });
  
  return suggestions;
}