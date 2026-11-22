import React, { useCallback, useEffect, useState } from 'react'
import { assignmentAPI } from '../services/api.js'

function TeamAssignment() {
  const [assignments, setAssignments] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await assignmentAPI.getAll()
      setAssignments(response.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load assignments.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const autoAssign = async () => {
    setRunning(true)
    setError('')
    setMessage('')
    try {
      const response = await assignmentAPI.autoAssign()
      setMessage(response.data.message)
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Automatic assignment failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Emergency Team Assignment</h1>
        <p>Match active incidents to available responders using incident type, proximity, and capacity.</p>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <section className="card">
        <div className="card-header"><span className="card-title">Assignment Operations</span>
          <button className="btn btn-primary" onClick={autoAssign} disabled={running}>{running ? 'Assigning…' : 'Auto-assign active incidents'}</button>
        </div>
        <p>Each available team is assigned to at most one incident in a run. Re-run after new emergencies or teams are added.</p>
      </section>
      <section className="card">
        <div className="card-header"><span className="card-title">Current Assignments</span><span>{assignments.length} records</span></div>
        <div className="table-container"><table>
          <thead><tr><th>Assignment</th><th>Incident</th><th>Team</th><th>Status</th><th>Decision notes</th></tr></thead>
          <tbody>{assignments.map(item => (
            <tr key={item.id}><td>#{item.id}</td><td>#{item.incident_id}</td><td>#{item.team_id}</td><td>{item.status}</td><td>{item.reason || '—'}</td></tr>
          ))}{assignments.length === 0 && <tr><td colSpan={5} className="empty-state">No assignments yet.</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  )
}

export default TeamAssignment
