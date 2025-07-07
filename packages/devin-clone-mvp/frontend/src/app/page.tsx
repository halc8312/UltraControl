'use client'

export default function HomePage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Devin Clone</h1>
      <p>AIソフトウェアエンジニアアシスタント</p>
      <div style={{ marginTop: '2rem' }}>
        <a 
          href="/auth/signin" 
          style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem'
          }}
        >
          ログイン
        </a>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <a 
          href="/simple-test" 
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#28a745',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '0.5rem'
          }}
        >
          テストページ
        </a>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <a 
          href="/test.html" 
          style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            backgroundColor: '#ffc107',
            color: 'black',
            textDecoration: 'none',
            borderRadius: '0.5rem'
          }}
        >
          基本HTMLテスト
        </a>
      </div>
    </div>
  )
}