'use client'

export default function SimpleTestPage() {
  return (
    <div>
      <h1>Simple Test Page</h1>
      <p>This page should work without any syntax errors.</p>
      <button 
        onClick={() => {
          console.log('Button clicked!')
          alert('Button works!')
        }}
      >
        Test Button
      </button>
    </div>
  )
} 