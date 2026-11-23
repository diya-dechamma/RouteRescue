import React from 'react'
import { AlertCircle, LoaderCircle, ShieldAlert } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions, compact = false }) {
  return (
    <header className={`page-header${compact ? ' page-header-compact' : ''}`}>
      <div className="page-heading">
        {!compact && eyebrow && <div className="eyebrow">{eyebrow}</div>}
        {!compact && <h1>{title}</h1>}
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function SectionHeader({ title, description, action, icon: Icon }) {
  return (
    <div className="section-header">
      <div className="section-heading">
        {Icon && <span className="section-icon"><Icon size={17} aria-hidden="true" /></span>}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, note, icon: Icon, tone = 'blue' }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && <span className="stat-icon"><Icon size={18} aria-hidden="true" /></span>}
      </div>
      <div className="stat-value">{value ?? '—'}</div>
      {note && <div className="stat-note">{note}</div>}
    </article>
  )
}

const severityLabels = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export function SeverityBadge({ severity }) {
  const value = String(severity || 'unknown').toLowerCase()
  return <span className={`badge severity-${value}`}><span className="badge-dot" />{severityLabels[value] || value.replaceAll('_', ' ')}</span>
}

export function StatusBadge({ status }) {
  const value = String(status || 'unknown').toLowerCase()
  return <span className={`badge status-${value}`}><span className="badge-dot" />{value.replaceAll('_', ' ')}</span>
}

export function EmptyState({ title = 'Nothing here yet', description, icon: Icon = ShieldAlert }) {
  return (
    <div className="empty-state" role="status">
      <span className="empty-icon"><Icon size={20} aria-hidden="true" /></span>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
    </div>
  )
}

export function LoadingState({ label = 'Loading data' }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <LoaderCircle size={20} className="spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ title = 'Unable to load data', message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={19} aria-hidden="true" />
      <div><strong>{title}</strong>{message && <p>{message}</p>}</div>
      {onRetry && <button className="btn btn-ghost btn-sm" onClick={onRetry}>Retry</button>}
    </div>
  )
}

export function MapLegend({ items }) {
  return (
    <div className="map-legend" aria-label="Map legend">
      {items.map(item => (
        <span className="legend-item" key={item.label}>
          <i className={`legend-swatch ${item.kind || 'line'}`} style={{ '--legend-color': item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  )
}
