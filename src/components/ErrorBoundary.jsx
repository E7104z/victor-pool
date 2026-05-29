import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          maxWidth: '480px',
          margin: '60px auto',
          padding: '32px',
          textAlign: 'center',
          background: '#2a2a2a',
          border: '1px solid #444',
          borderRadius: '8px'
        }}>
          <p style={{ fontSize: '2.5rem', marginBottom: '12px' }}>⚠️</p>
          <h2 style={{ fontFamily: 'Bebas Neue', color: '#e55', fontSize: '1.5rem', marginBottom: '12px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.875rem', marginBottom: '8px', fontFamily: 'monospace' }}>
            {this.state.error.message}
          </p>
          <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '20px' }}>
            Check the browser console for details.
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{
              background: 'var(--gold)',
              color: 'var(--slate)',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 24px',
              fontWeight: '700',
              cursor: 'pointer'
            }}>
            Reload App
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
