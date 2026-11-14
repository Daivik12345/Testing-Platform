import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './aurora.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return <div className="startup"><div className="surface"><h1>Something interrupted your session.</h1><p>Your saved draft remains on this device. Reload to reconnect.</p><button onClick={() => location.reload()}>Reload workspace</button></div></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
)
