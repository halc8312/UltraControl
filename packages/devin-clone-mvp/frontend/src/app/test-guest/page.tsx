'use client'

import { useState } from 'react'

export default function TestGuestPage() {
  const [result, setResult] = useState<string>('まだテストを実行していません')
  const [isLoading, setIsLoading] = useState(false)

  const testBackendConnection = async () => {
    console.log('🚀 Starting backend test...')
    setIsLoading(true)
    setResult('バックエンド接続をテスト中...')
    
    try {
      console.log('📡 Calling backend directly...')
      const response = await fetch('http://localhost:8000/api/v1/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('📊 Response status:', response.status)
      const data = await response.json()
      console.log('✅ Response data:', data)
      setResult(`✅ バックエンド成功!\n\nステータス: ${response.status}\n\nレスポンス:\n${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      console.error('❌ Backend error:', error)
      setResult(`❌ バックエンドエラー:\n${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testFrontendAPI = async () => {
    console.log('🚀 Starting frontend API test...')
    setIsLoading(true)
    setResult('フロントエンドAPI経由でテスト中...')
    
    try {
      console.log('📡 Calling frontend API...')
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('📊 Response status:', response.status)
      const data = await response.json()
      console.log('✅ Response data:', data)
      setResult(`✅ フロントエンドAPI成功!\n\nステータス: ${response.status}\n\nレスポンス:\n${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      console.error('❌ Frontend API error:', error)
      setResult(`❌ フロントエンドAPIエラー:\n${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const checkEnvironment = () => {
    console.log('🔍 Checking environment variables...')
    const envInfo = {
      'NODE_ENV': process.env.NODE_ENV,
      'NEXT_PUBLIC_API_URL': process.env.NEXT_PUBLIC_API_URL,
      'Current URL': window.location.href,
      'User Agent': navigator.userAgent.substring(0, 50) + '...'
    }
    
    setResult(`🔍 環境変数チェック:\n\n${JSON.stringify(envInfo, null, 2)}`)
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
          ゲストログイン デバッグページ
        </h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <button 
              onClick={testBackendConnection}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1rem',
                backgroundColor: isLoading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginBottom: '0.5rem'
              }}
            >
              {isLoading ? '実行中...' : '🔗 バックエンド直接テスト (localhost:8000)'}
            </button>
          </div>
          
                     <div style={{ marginBottom: '1rem' }}>
             <button 
               onClick={testFrontendAPI}
               disabled={isLoading}
               style={{
                 width: '100%',
                 padding: '1rem',
                 fontSize: '1rem',
                 backgroundColor: isLoading ? '#ccc' : '#28a745',
                 color: 'white',
                 border: 'none',
                 borderRadius: '0.5rem',
                 cursor: isLoading ? 'not-allowed' : 'pointer',
                 marginBottom: '0.5rem'
               }}
             >
               {isLoading ? '実行中...' : '🌐 フロントエンドAPI経由テスト (/api/auth/guest)'}
             </button>
           </div>
           
           <div style={{ marginBottom: '1rem' }}>
             <button 
               onClick={checkEnvironment}
               disabled={isLoading}
               style={{
                 width: '100%',
                 padding: '1rem',
                 fontSize: '1rem',
                 backgroundColor: isLoading ? '#ccc' : '#ffc107',
                 color: 'black',
                 border: 'none',
                 borderRadius: '0.5rem',
                 cursor: isLoading ? 'not-allowed' : 'pointer'
               }}
             >
               {isLoading ? '実行中...' : '🔍 環境変数チェック'}
             </button>
           </div>
        </div>
        
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '0.5rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>テスト結果:</h3>
          <pre style={{ 
            fontSize: '0.875rem', 
            whiteSpace: 'pre-wrap', 
            wordWrap: 'break-word',
            margin: 0,
            fontFamily: 'Consolas, Monaco, monospace'
          }}>
            {result}
          </pre>
        </div>
        
        <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#6c757d' }}>
          <h4>使用方法:</h4>
          <ol>
            <li>まず「バックエンド直接テスト」を実行してください</li>
            <li>次に「フロントエンドAPI経由テスト」を実行してください</li>
            <li>ブラウザの開発者ツール（F12）のConsoleタブも確認してください</li>
          </ol>
          
          <h4 style={{ marginTop: '1rem' }}>必要な条件:</h4>
          <ul>
            <li>バックエンドサーバーが http://localhost:8000 で動作していること</li>
            <li>フロントエンドサーバーが http://localhost:3000 で動作していること</li>
            <li>環境変数ファイル (.env.local) が正しく設定されていること</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 