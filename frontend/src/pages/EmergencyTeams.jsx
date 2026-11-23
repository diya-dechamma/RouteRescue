import React, { useCallback, useEffect, useState } from 'react'
import { teamAPI } from '../services/api.js'
import { MapPin, Package, Users } from 'lucide-react'
import { EmptyState, PageHeader, SectionHeader, StatusBadge } from '../components/ui.jsx'

const emptyTeam = {
  name: '',
  team_type: 'ambulance',
  location: '',
  lat: '',
  lng: '',
  capacity: 5,
}

function parseResources(value) {
  if (!value) return {}
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return {} }
}

function EmergencyTeams() {
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState(emptyTeam)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadTeams = useCallback(async () => {
    try {
      const response = await teamAPI.getAll()
      setTeams(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load emergency teams.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTeams() }, [loadTeams])

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await teamAPI.create({
        ...form,
        lat: form.lat === '' ? null : Number(form.lat),
        lng: form.lng === '' ? null : Number(form.lng),
        capacity: Number(form.capacity),
      })
      setForm(emptyTeam)
      await loadTeams()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not create emergency team.')
    } finally {
      setSaving(false)
    }
  }

  const setAvailability = async (team, availability) => {
    setError('')
    try {
      await teamAPI.updateAvailability(team.id, availability)
      await loadTeams()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update team availability.')
    }
  }

  return (
    <div>
      <PageHeader compact title="Emergency Teams" description="Manage response units, review their listed inventory, and update availability." />
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="grid-2">
        <section className="card">
          <SectionHeader title="Register a team" description="Add a unit to the live responder roster." icon={Users} />
          <form onSubmit={submit}>
            <div className="form-group"><label>Team name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group">
              <label>Team type</label>
              <select value={form.team_type} onChange={e => setForm({ ...form, team_type: e.target.value })}>
                <option value="ambulance">Ambulance</option><option value="fire_rescue">Fire &amp; rescue</option>
                <option value="police">Police</option><option value="disaster_response">Disaster response</option>
              </select>
            </div>
            <div className="form-group"><label>Base / location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></div>
            <div className="form-row">
              <div className="form-group"><label>Latitude</label><input type="number" step="any" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} /></div>
              <div className="form-group"><label>Longitude</label><input type="number" step="any" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Capacity</label><input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} /></div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Team'}</button>
          </form>
          <p className="muted-copy">Inventory entry is not available in this form; newly registered teams may have no resource stock recorded.</p>
        </section>
      </div>
      <section className="card">
        <SectionHeader title="Responder roster" description={`${teams.length} units currently returned by the backend.`} icon={Users} />
        {loading ? <div className="loading">Loading teams…</div> : teams.length ? (
          <div className="team-card-grid">
            {teams.map(team => {
              const resources = parseResources(team.resources)
              const entries = Object.entries(resources)
              return (
                <article className="team-card" key={team.id}>
                  <div className="team-card-heading">
                    <span className="team-avatar"><Users size={18} /></span>
                    <div className="team-card-title">
                      <strong>{team.name}</strong>
                      <span>{team.team_type?.replaceAll('_', ' ') || 'Response team'}</span>
                    </div>
                    <StatusBadge status={team.availability} />
                  </div>
                  <div className="team-card-meta">
                    <span><MapPin size={14} />{team.location || 'Base location not set'}</span>
                    <span><Users size={14} />Capacity {team.capacity ?? '—'}</span>
                  </div>
                  <div className="team-card-resource-heading"><Package size={14} /> Listed inventory</div>
                  {entries.length ? (
                    <div className="inventory-chip-list">
                      {entries.map(([name, quantity]) => (
                        <span className="inventory-chip" key={name}>
                          {name.replaceAll('_', ' ')} <strong>{quantity}</strong>
                        </span>
                      ))}
                    </div>
                  ) : <p className="muted-copy">No inventory is recorded for this team.</p>}
                  <div className="team-card-footer">
                    <label htmlFor={`availability-${team.id}`}>Availability</label>
                    <select id={`availability-${team.id}`} aria-label={`${team.name} availability`} value={team.availability} onChange={e => setAvailability(team, e.target.value)}>
                      <option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option>
                    </select>
                  </div>
                </article>
              )
            })}
          </div>
        ) : <EmptyState title="No teams registered" description="Create a team to populate the responder roster." />}
      </section>
    </div>
  )
}

export default EmergencyTeams
