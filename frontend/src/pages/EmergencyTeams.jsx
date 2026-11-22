import React, { useCallback, useEffect, useState } from 'react'
import { teamAPI } from '../services/api.js'

const emptyTeam = {
  name: '',
  team_type: 'ambulance',
  location: '',
  lat: '',
  lng: '',
  capacity: 5,
}

function EmergencyTeams() {
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState(emptyTeam)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const loadTeams = useCallback(async () => {
    try {
      const response = await teamAPI.getAll()
      setTeams(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load emergency teams.')
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
      <div className="page-header">
        <h1>Emergency Teams</h1>
        <p>Manage responder units, their locations, capacity, and operational status.</p>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="grid-2">
        <section className="card">
          <div className="card-header"><span className="card-title">Register a Team</span></div>
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
        </section>
        <section className="card">
          <div className="card-header"><span className="card-title">Responder Roster</span><span>{teams.length} units</span></div>
          <div className="table-container">
            <table><thead><tr><th>Team</th><th>Type</th><th>Base</th><th>Capacity</th><th>Status</th></tr></thead>
              <tbody>{teams.map(team => (
                <tr key={team.id}>
                  <td>{team.name}</td><td>{team.team_type?.replace('_', ' ')}</td><td>{team.location || '—'}</td><td>{team.capacity}</td>
                  <td><select aria-label={`${team.name} availability`} value={team.availability} onChange={e => setAvailability(team, e.target.value)}>
                    <option value="available">Available</option><option value="busy">Busy</option><option value="offline">Offline</option>
                  </select></td>
                </tr>
              ))}{teams.length === 0 && <tr><td colSpan={5} className="empty-state">No teams registered.</td></tr>}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

export default EmergencyTeams
