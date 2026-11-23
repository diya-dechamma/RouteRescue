import React, { useState } from 'react'
import { incidentAPI } from '../services/api.js'
import { AlertTriangle, Send, MapPin } from 'lucide-react'
import { PageHeader, SeverityBadge } from '../components/ui.jsx'

const initialForm = {
  title: '',
  description: '',
  incident_type: 'accident',
  location: '',
  affected_people: '',
  injuries: '',
  trapped: '',
  lat: 12.2958,
  lng: 76.6394,
  additional_info: '',
}

function InfoRow({ label, value, isNlp }) {
  return (
    <div className="info-row">
      <span className="info-label">
        {isNlp && <span className="nlp-tag">EXTRACTED</span>}
        {label}
      </span>
      <span className="info-value">{value ?? '—'}</span>
    </div>
  )
}

function ReportEmergency() {
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        ...form,
        affected_people: parseInt(form.affected_people) || 0,
        injuries: parseInt(form.injuries) || 0,
        trapped: parseInt(form.trapped) || 0,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
      }
      const res = await incidentAPI.create(payload)
      setResult(res.data)
      setForm(initialForm)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit incident report.')
    } finally {
      setLoading(false)
    }
  }

  const nlp = result?.nlp_extracted
    ? (typeof result.nlp_extracted === 'string' ? JSON.parse(result.nlp_extracted) : result.nlp_extracted)
    : null
  const extracted = nlp?.extracted

  return (
    <div>
      <PageHeader
        compact
        title="Report Emergency"
        description="Capture incident details for rule-based triage and response coordination."
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {result && (
        <div className="card report-result-card">
          <div className="card-header">
            <span className="card-title"><span className="success-mark">✓</span> Incident submitted</span>
            <SeverityBadge severity={result.severity} />
          </div>

          <div className="alert alert-success" style={{ marginBottom: 16 }}>
            Incident <strong>#{result.id}</strong> created. The returned rule-based severity is shown below.
          </div>

          <div className="grid-2">
            <div>
              <div className="detail-panel report-detail-panel">
                <h4>📋 Manually Provided Data</h4>
                <InfoRow label="Title" value={result.title} />
                <InfoRow label="Type" value={result.incident_type} />
                <InfoRow label="Location" value={result.location} />
                <InfoRow label="Affected People" value={result.affected_people} />
                <InfoRow label="Injuries" value={result.injuries} />
                <InfoRow label="Trapped" value={result.trapped} />
                <InfoRow label="Coordinates" value={`${result.lat}, ${result.lng}`} />
                <InfoRow label="Status" value={result.status} />
              </div>
            </div>

            <div>
              {nlp && (
                <div className="detail-panel nlp-panel">
                  <h4>🤖 NLP Extracted Information</h4>
                  {extracted?.location && <InfoRow label="Extracted Location" value={extracted.location} isNlp />}
                  {extracted?.affected_count !== undefined && <InfoRow label="Extracted Affected" value={extracted.affected_count} isNlp />}
                  {extracted?.injured_count !== undefined && <InfoRow label="Extracted Injuries" value={extracted.injured_count} isNlp />}
                  {extracted?.trapped_count !== undefined && <InfoRow label="Extracted Trapped" value={extracted.trapped_count} isNlp />}
                  {extracted?.incident_type && <InfoRow label="Detected Type" value={extracted.incident_type.replace('_', ' ')} isNlp />}
                  {extracted?.emergency_keywords?.length > 0 && (
                    <InfoRow label="Keywords" value={extracted.emergency_keywords.join(', ')} isNlp />
                  )}
                  {extracted?.severity_hints?.length > 0 && (
                    <InfoRow label="Severity Hints" value={extracted.severity_hints.join(', ')} isNlp />
                  )}
                </div>
              )}

              <div className="detail-panel severity-panel">
                <h4>⚡ Severity Classification</h4>
                <SeverityBadge severity={result.severity} />
                <p className="muted-copy">Deterministic academic-demo assessment; not an operational medical or dispatch decision.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Emergency Incident Details</span>
        </div>
        <form className="command-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Incident Title *</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Brief description of the emergency"
                required
              />
            </div>
            <div className="form-group">
              <label>Incident Type *</label>
              <select name="incident_type" value={form.incident_type} onChange={handleChange} required>
                <option value="accident">Accident</option>
                <option value="flood">Flood</option>
                <option value="fire">Fire</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
              placeholder="Detailed description of the emergency situation..."
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label><MapPin size={14} style={{ display: 'inline', marginRight: 4 }} />Location *</label>
              <input
                type="text"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Area, street, or landmark"
                required
              />
            </div>
            <div className="form-group">
              <label>Affected People</label>
              <input
                type="number"
                name="affected_people"
                value={form.affected_people}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Injuries</label>
              <input
                type="number"
                name="injuries"
                value={form.injuries}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label>People Trapped</label>
              <input
                type="number"
                name="trapped"
                value={form.trapped}
                onChange={handleChange}
                min="0"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Latitude</label>
              <input
                type="number"
                name="lat"
                value={form.lat}
                onChange={handleChange}
                step="0.0001"
                placeholder="12.2958"
              />
            </div>
            <div className="form-group">
              <label>Longitude</label>
              <input
                type="number"
                name="lng"
                value={form.lng}
                onChange={handleChange}
                step="0.0001"
                placeholder="76.6394"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Additional Information</label>
            <textarea
              name="additional_info"
              rows={3}
              value={form.additional_info}
              onChange={handleChange}
              placeholder="Any additional context, witness info, hazards present..."
            />
          </div>

          <button type="submit" className="btn btn-danger" disabled={loading}>
            <Send size={16} />
            {loading ? 'Submitting...' : 'Submit Emergency Report'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default ReportEmergency
