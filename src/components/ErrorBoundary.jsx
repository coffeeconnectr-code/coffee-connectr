import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info)
  }

  render() {
    const { error } = this.state

    if (error) {
      return (
        <section className="card">
          <h2>Something went wrong</h2>
          <p className="status-message profile-error">
            This page ran into an unexpected error. Try refreshing, or head back to a safe page.
          </p>
          <div className="discover-header-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
            >
              Refresh page
            </button>
            <Link to="/discover/map" className="primary-button profile-action-link">
              Back to map
            </Link>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
