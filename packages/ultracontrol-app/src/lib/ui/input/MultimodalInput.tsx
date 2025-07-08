/**
 * Multimodal Input Component
 * 
 * Supports multiple input types:
 * - Text with natural language processing
 * - Voice input with speech-to-text
 * - Image paste/upload for screenshots
 * - Code snippets with syntax highlighting
 * - File drag-and-drop
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('MultimodalInput');

export interface InputData {
  type: 'text' | 'voice' | 'image' | 'code' | 'file';
  content: string | ArrayBuffer | File;
  metadata?: {
    language?: string;
    mimeType?: string;
    fileName?: string;
    timestamp?: Date;
    duration?: number;
  };
}

interface MultimodalInputProps {
  onSubmit: (data: InputData) => void | Promise<void>;
  placeholder?: string;
  maxLength?: number;
  supportedTypes?: InputData['type'][];
  autoFocus?: boolean;
  onTyping?: (isTyping: boolean) => void;
}

export const MultimodalInput: React.FC<MultimodalInputProps> = ({
  onSubmit,
  placeholder = 'Type a message, paste an image, or drag files...',
  maxLength = 10000,
  supportedTypes = ['text', 'voice', 'image', 'code', 'file'],
  autoFocus = false,
  onTyping
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<InputData['type']>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Handle typing indicator
  useEffect(() => {
    if (onTyping) {
      onTyping(inputValue.length > 0);
    }
  }, [inputValue, onTyping]);

  // Text input handling
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInputValue(value);
      
      // Auto-detect code blocks
      if (value.includes('```')) {
        setInputMode('code');
        // Extract language from code fence
        const match = value.match(/```(\w+)/);
        if (match) {
          setCodeLanguage(match[1]);
        }
      }
    }
  };

  // Submit handling
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!inputValue.trim() && attachments.length === 0) return;
    
    try {
      if (attachments.length > 0) {
        // Handle file attachments
        for (const file of attachments) {
          await onSubmit({
            type: 'file',
            content: file,
            metadata: {
              fileName: file.name,
              mimeType: file.type,
              timestamp: new Date()
            }
          });
        }
        setAttachments([]);
      }
      
      if (inputValue.trim()) {
        // Submit text/code input
        await onSubmit({
          type: inputMode,
          content: inputValue.trim(),
          metadata: {
            language: inputMode === 'code' ? codeLanguage : undefined,
            timestamp: new Date()
          }
        });
        setInputValue('');
        setInputMode('text');
      }
    } catch (error) {
      logger.error('Failed to submit input:', error);
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Switch to code mode on Ctrl+K
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setInputMode(inputMode === 'code' ? 'text' : 'code');
    }
  };

  // Paste handling
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageFile(file);
        }
      }
    }
  };

  // Image handling
  const handleImageFile = async (file: File) => {
    if (!supportedTypes.includes('image')) return;
    
    try {
      await onSubmit({
        type: 'image',
        content: file,
        metadata: {
          fileName: file.name,
          mimeType: file.type,
          timestamp: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to handle image:', error);
    }
  };

  // Voice recording
  const startRecording = async () => {
    if (!supportedTypes.includes('voice')) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await onSubmit({
          type: 'voice',
          content: audioBlob,
          metadata: {
            mimeType: 'audio/webm',
            timestamp: new Date(),
            duration: audioChunksRef.current.length
          }
        });
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      logger.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Drag and drop handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await handleImageFile(file);
      } else {
        setAttachments(prev => [...prev, file]);
      }
    }
  };

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div 
      className={`multimodal-input ${isDragging ? 'dragging' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Mode selector */}
      <div className="input-modes">
        {supportedTypes.map(type => (
          <button
            key={type}
            className={`mode-button ${inputMode === type ? 'active' : ''}`}
            onClick={() => setInputMode(type)}
            title={`Switch to ${type} input`}
          >
            {getModeIcon(type)}
          </button>
        ))}
      </div>
      
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((file, index) => (
            <div key={index} className="attachment">
              <span className="attachment-name">{file.name}</span>
              <button
                className="remove-attachment"
                onClick={() => removeAttachment(index)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Main input area */}
      <div className="input-area">
        {inputMode === 'code' && (
          <div className="code-header">
            <select
              className="language-select"
              value={codeLanguage}
              onChange={(e) => setCodeLanguage(e.target.value)}
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="html">HTML</option>
              <option value="css">CSS</option>
              <option value="sql">SQL</option>
              <option value="bash">Bash</option>
            </select>
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          className={`input-textarea ${inputMode === 'code' ? 'code-mode' : ''}`}
          value={inputValue}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={1}
          maxLength={maxLength}
        />
        
        {/* Character count */}
        <div className="input-footer">
          <span className="char-count">
            {inputValue.length} / {maxLength}
          </span>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="input-actions">
        {supportedTypes.includes('file') && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              className="action-button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
            >
              📎
            </button>
          </>
        )}
        
        {supportedTypes.includes('voice') && (
          <button
            className={`action-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? '⏹️' : '🎤'}
          </button>
        )}
        
        <button
          className="submit-button"
          onClick={() => handleSubmit()}
          disabled={!inputValue.trim() && attachments.length === 0}
        >
          Send
        </button>
      </div>
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-message">
            Drop files here
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get mode icons
function getModeIcon(type: InputData['type']): string {
  const icons = {
    text: '💬',
    voice: '🎤',
    image: '🖼️',
    code: '</>', 
    file: '📄'
  };
  return icons[type] || '📝';
}

// Code syntax highlighter component
interface CodeHighlighterProps {
  code: string;
  language: string;
}

export const CodeHighlighter: React.FC<CodeHighlighterProps> = ({ code, language }) => {
  // This would integrate with a syntax highlighting library like Prism or highlight.js
  return (
    <pre className={`code-highlighter language-${language}`}>
      <code>{code}</code>
    </pre>
  );
};

// Voice visualizer component
interface VoiceVisualizerProps {
  isRecording: boolean;
  audioData?: Uint8Array;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ isRecording, audioData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!isRecording || !canvasRef.current || !audioData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Simple waveform visualization
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#22c55e';
    
    const barWidth = canvas.width / audioData.length;
    
    for (let i = 0; i < audioData.length; i++) {
      const barHeight = (audioData[i] / 255) * canvas.height;
      ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
    }
  }, [isRecording, audioData]);
  
  return (
    <canvas
      ref={canvasRef}
      className="voice-visualizer"
      width={200}
      height={50}
    />
  );
};