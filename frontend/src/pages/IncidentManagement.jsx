import React, { useState, useEffect, useCallback } from 'react'
import { incidentAPI } from '../services/api.js'
import { RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react'

function IncidentManagement() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ incident_type: '', severity: '', status: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [analyzing, setAnalyzing] = useState({})
  const [updating, setUpdating] = useState({})

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (filters.incident_type) params.incident_type = filters.incident_type
      if (filters.severity) params.severity = filters.severity
      if (filters.status) params.status = filters.status
      const res = await incidentAPI.getAll(params)
      setIncidents(res.data)
    } catch {
      setError('Failed to load incidents.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleAnalyze = async (id) => {
    setAnalyzing(prev => ({ ...prev, [id]: true }))
    try {
      const res = await incidentAPI.analyze(id)
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, ...res.data } : i))
    } catch {
      alert('Analysis failed.')
    } finally {
      setAnalyzing(prev => ({ ...prev, [id]: false }))
    }
  }

  const handleStatusUpdate = async (id, status) => {
    setUpdating(prev => ({ ...prev, [id]: true }))
    try {
      await incidentAPI.updateStatus(id, status)
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    } catch {
      alert('Status update failed.')
    } finally {
      setUpdating(prev => ({ ...prev, [id]: false }))
    }
  }

  const toggleExpand = (id) => setExpandedId(prev => prev === id ? null : id)

  const parseNlp = (nlp_extracted) => {
    if (!nlp_extracted) return null
    try {
      return typeof nlp_extracted === 'string' ? JSON.parse(nlp_extracted) : nlp_extracted
    } catch { return null }
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Incident Management</h1>
            <p>View, filter, and manage all emergency incidents</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchIncidents}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="filter-bar">
          <div className="form-group">
            <label>Type</label>
            <select name="incident_type" value={filters.incident_type} onChange={handleFilterChange}>
              <option value="">All Types</option>
              <option value="accident">Accident</option>
              <option value="flood">Flood</option>
              <option value="fire">Fire</option>
              <option value="medical_emergency">Medical Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select name="severity" value={filters.severity} onChange={handleFilterChange}>
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading incidents...</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Location</th>
                  <th>Affected</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {incidents.length === 0 ? (
                  <tr><td colSpan={8} className="empty-state">No incidents found</td></tr>
                ) : incidents.map(inc => {
                  const nlp = parseNlp(inc.nlp_extracted)
                  const isExpanded = expandedId === inc.id
                  return (
                    <React.Fragment key={inc.id}>
                      <tr>
                        <td style={{ color: '#888', fontSize: '0.8rem' }}>#{inc.id}</td>
                        <td style={{ fontWeight: 500, maxWidth: 200 }}>{inc.title}</td>
                        <td><span className={`badge badge-${inc.incident_type}`}>{inc.incident_type?.replace('_', ' ')}</span></td>
                        <td><span className={`badge badge-${inc.severity}`}>{inc.severity}</span></td>
                        <td>{inc.location}</td>
                        <td>{inc.affected_people}</td>
                        <td><span className={`badge badge-${inc.status}`}>{inc.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => toggleExpand(inc.id)}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAnalyze(inc.id)}
                              disabled={analyzing[inc.id]}
                            >
                              {analyzing[inc.id] ? '...' : 'Re-analyze'}
                            </button>
                            {inc.status !== 'resolved' && (
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleStatusUpdate(inc.id, 'resolved')}
                                disabled={updating[inc.id]}
                              >
                                Resolve
                              </button>
                            )}
                            {inc.status === 'active' && (
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleStatusUpdate(inc.id, 'pending')}
                                disabled={updating[inc.id]}
                              >
                                Pending
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className="detail-panel" style={{ margin: '0 16px 12px', borderRadius: 8 }}>
                              <div className="grid-2">
                                <div>
                                  <h4>📋 Incident Details</h4>
                                  <div className="info-row"><span className="info-label">Description</span></div>
                                  <p style={{ fontSize: '0.875rem', color: '#444', marginBottom: 10 }}>{inc.description}</p>
                                  <div className="info-row">
                                    <span className="info-label">Injuries</span>
                                    <span className="info-value">{inc.injuries}</span>
                                  </div>
                                  <div className="info-row">
                                    <span className="info-label">Trapped</span>
                                    <span className="info-value">{inc.trapped}</span>
                                  </div>
                                  <div className="info-row">
                                    <span className="info-label">Coordinates</span>
                                    <span className="info-value">{inc.lat}, {inc.lng}</span>
                                  </div>
                                  <div className="info-row">
                                    <span className="info-label">Assigned Team</span>
                                    <span className="info-value">{inc.assigned_team_id ?? 'Unassigned'}</span>
                                  </div>
                                </div>
                                <div>
                                  {nlp ? (
                                    <div>
                                      <h4 style={{ color: '#1a5276' }}>🤖 NLP Extraction</h4>
                                      {nlp.extracted?.location && (
                                        <div className="info-row">
                                          <span className="info-label">Extracted Location</span>
                                          <span className="info-value" style={{ color: '#3a7bd5' }}>{nlp.extracted.location}</span>
                                        </div>
                                      )}
                                      {nlp.extracted?.incident_type && (
                                        <div className="info-row">
                                          <span className="info-label">Detected Type</span>
                                          <span className="info-value">{nlp.extracted.incident_type.replace('_', ' ')}</span>
                                        </div>
                                      )}
                                      {nlp.extracted?.emergency_keywords?.length > 0 && (
                                        <div className="info-row">
                                          <span className="info-label">Keywords</span>
                                          <span className="info-value">{nlp.extracted.emergency_keywords.join(', ')}</span>
                                        </div>
                                      )}
                                      {nlp.extracted?.severity_hints?.length > 0 && (
                                        <div className="info-row">
                                          <span className="info-label">Severity Hints</span>
                                          <span className="info-value" style={{ color: '#c0392b' }}>{nlp.extracted.severity_hints.join(', ')}</span>
                                        </div>
                                      )}
                                      <div className="info-row"><span className="info-label">Injured / Trapped / Affected</span><span className="info-value">{nlp.extracted?.injured_count ?? 0} / {nlp.extracted?.trapped_count ?? 0} / {nlp.extracted?.affected_count ?? 0}</span></div>
                                      <h4 style={{ marginTop: 12 }}>⚡ Severity: <span className={`badge badge-${inc.severity}`}>{inc.severity}</span></h4>
                                    </div>
                                  ) : (
                                    <div className="empty-state" style={{ padding: '20px' }}>No NLP data. Click Re-analyze.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default IncidentManagement
