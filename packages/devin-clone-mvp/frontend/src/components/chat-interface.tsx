"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { chatApi, type ChatMessage, type ChatSession } from "@/lib/api"
import {
  Send,
  Bot,
  User,
  Plus,
  Loader2,
  Code2,
  Copy,
  Check,
} from "lucide-react"
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// import { prism } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface ChatInterfaceProps {
  projectId: string
  onCodeInsert?: (code: string, language: string) => void
}

interface CodeBlock {
  language: string
  code: string
}

export function ChatInterface({ projectId, onCodeInsert }: ChatInterfaceProps) {
  const { toast } = useToast()
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [copiedBlocks, setCopiedBlocks] = useState<Set<number>>(new Set())

  useEffect(() => {
    loadSessions()
  }, [projectId])

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function loadSessions() {
    try {
      const data = await chatApi.listSessions(projectId)
      setSessions(data.sessions)
      
      if (data.sessions.length > 0 && !currentSessionId) {
        setCurrentSessionId(data.sessions[0].id)
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "チャットセッションの読み込みに失敗しました",
        variant: "destructive",
      })
    }
  }

  async function loadMessages(sessionId: string) {
    setIsLoading(true)
    try {
      const session = await chatApi.getSession(projectId, sessionId)
      setMessages(session.messages)
    } catch (error) {
      toast({
        title: "エラー",
        description: "メッセージの読み込みに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function createNewSession() {
    try {
      const session = await chatApi.createSession(projectId, {
        title: `Chat ${new Date().toLocaleString('ja-JP')}`
      })
      setSessions([session, ...sessions])
      setCurrentSessionId(session.id)
      setMessages([])
    } catch (error) {
      toast({
        title: "エラー",
        description: "新規チャットの作成に失敗しました",
        variant: "destructive",
      })
    }
  }

  async function sendMessage() {
    if (!input.trim() || !currentSessionId || isSending) return

    const messageContent = input.trim()
    setInput("")
    setIsSending(true)

    // Add user message optimistically
    const tempUserMessage: ChatMessage = {
      id: 'temp-user',
      session_id: currentSessionId,
      role: 'user',
      content: messageContent,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempUserMessage])

    try {
      // Stream response
      const response = await chatApi.streamMessage(projectId, {
        message: messageContent,
        session_id: currentSessionId,
        stream: true
      })

      let assistantMessage: ChatMessage = {
        id: 'temp-assistant',
        session_id: currentSessionId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev.filter(m => m.id !== 'temp-user'), tempUserMessage, assistantMessage])

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader available')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.content) {
                assistantMessage.content += data.content
                setMessages(prev => 
                  prev.map(m => m.id === 'temp-assistant' 
                    ? { ...assistantMessage } 
                    : m
                  )
                )
              }
              
              if (data.done) {
                // Extract code blocks
                assistantMessage.code_blocks = extractCodeBlocks(assistantMessage.content)
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      // Reload messages to get proper IDs
      await loadMessages(currentSessionId)
      
    } catch (error) {
      toast({
        title: "エラー",
        description: "メッセージの送信に失敗しました",
        variant: "destructive",
      })
      // Remove temporary messages on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')))
    } finally {
      setIsSending(false)
      // Focus back to input after sending
      inputRef.current?.focus()
    }
  }

  function extractCodeBlocks(content: string): CodeBlock[] {
    const pattern = /```(\w+)?\n(.*?)```/gs
    const matches = [...content.matchAll(pattern)]
    
    return matches.map(match => ({
      language: match[1] || 'plaintext',
      code: match[2].trim()
    }))
  }

  function copyCodeBlock(code: string, index: number) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedBlocks(prev => new Set([...prev, index]))
      setTimeout(() => {
        setCopiedBlocks(prev => {
          const newSet = new Set(prev)
          newSet.delete(index)
          return newSet
        })
      }, 2000)
      
      toast({
        title: "コピー完了",
        description: "コードがクリップボードにコピーされました",
      })
    })
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      sendMessage()
    }
  }

  function renderMessageContent(message: ChatMessage) {
    const content = message.content
    const codeBlocks = extractCodeBlocks(content)
    
    if (codeBlocks.length === 0) {
      return <p className="whitespace-pre-wrap">{content}</p>
    }

    let lastIndex = 0
    const elements: React.ReactNode[] = []

    codeBlocks.forEach((block, index) => {
      const blockStart = content.indexOf('```', lastIndex)
      const textBefore = content.slice(lastIndex, blockStart)
      
      if (textBefore) {
        elements.push(
          <p key={`text-${index}`} className="whitespace-pre-wrap mb-4">
            {textBefore}
          </p>
        )
      }

      elements.push(
        <div key={`code-${index}`} className="mb-4">
          <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg">
            <span className="text-sm font-mono text-muted-foreground">
              {block.language}
            </span>
            <div className="flex items-center space-x-2">
              {onCodeInsert && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCodeInsert(block.code, block.language)}
                  aria-label={`${block.language}コードをエディタに挿入`}
                >
                  <Code2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyCodeBlock(block.code, index)}
                aria-label="コードをコピー"
              >
                {copiedBlocks.has(index) ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <pre className="bg-muted p-4 rounded-b-lg overflow-x-auto">
            <code className={`language-${block.language}`}>{block.code}</code>
          </pre>
        </div>
      )

      lastIndex = content.indexOf('```', blockStart + 3) + 3
    })

    const remainingText = content.slice(lastIndex)
    if (remainingText) {
      elements.push(
        <p key="text-end" className="whitespace-pre-wrap">
          {remainingText}
        </p>
      )
    }

    return <div>{elements}</div>
  }

  function scrollToBottom() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }

  return (
    <div className="h-full flex flex-col" role="region" aria-label="AIチャット">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">AI アシスタント</CardTitle>
        <Button
          size="sm"
          onClick={createNewSession}
          aria-label="新しいチャットセッションを作成"
        >
          <Plus className="mr-2 h-4 w-4" />
          新規チャット
        </Button>
      </CardHeader>

      <div className="flex-1 overflow-hidden">
        <ScrollArea ref={scrollRef} className="h-full px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">メッセージを読み込み中...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>AIアシスタントに質問してみましょう</p>
              <p className="text-sm mt-2">コードの生成、説明、修正などができます</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8">
                      <Bot className="h-4 w-4" />
                      <AvatarFallback>AI</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                    role="article"
                    aria-label={`${message.role === "user" ? "ユーザー" : "AI"}のメッセージ`}
                  >
                    {renderMessageContent(message)}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <User className="h-4 w-4" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isSending && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8">
                    <Bot className="h-4 w-4" />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">応答を生成中...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力... (Cmd/Ctrl + Enter で送信)"
            disabled={isSending}
            aria-label="メッセージを入力"
            aria-describedby="send-instructions"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isSending}
            aria-label="メッセージを送信"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div id="send-instructions" className="sr-only">
          Enterキーで改行、Cmd/Ctrl + Enterで送信
        </div>
      </div>
    </div>
  )
}