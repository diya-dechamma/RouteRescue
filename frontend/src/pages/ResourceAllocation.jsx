import React, { useCallback, useEffect, useState } from 'react'
import { resourceAPI } from '../services/api.js'

function ResourceAllocation() {
  const [allocations, setAllocations] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try {
      const [allocationResponse, summaryResponse] = await Promise.all([resourceAPI.getAllocations(), resourceAPI.getSummary()])
      setAllocations(allocationResponse.data)
      setSummary(summaryResponse.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load resource allocation data.')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const allocate = async () => {
    setRunning(true)
    setError('')
    try {
      await resourceAPI.allocate()
      await load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Resource allocation failed.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Resource Allocation</h1><p>Prioritize active emergencies and allocate suitable available teams and response kits across incidents.</p></div>
      {error && <div className="alert alert-danger">{error}</div>}
      {summary && <div className="stats-grid">
        <div className="stat-card blue"><div className="stat-value">{summary.active_incidents}</div><div className="stat-label">Active emergencies</div></div>
        <div className="stat-card green"><div className="stat-value">{summary.available_teams}</div><div className="stat-label">Available teams</div></div>
        <div className="stat-card orange"><div className="stat-value">{summary.total_allocations}</div><div className="stat-label">Saved allocations</div></div>
      </div>}
      <section className="card">
        <div className="card-header"><span className="card-title">Multi-incident allocation</span>
          <button className="btn btn-primary" onClick={allocate} disabled={running}>{running ? 'Allocating…' : 'Allocate available resources'}</button>
        </div>
        <p>Simulated inventory templates are assigned in severity order; each available team is used once per allocation run.</p>
      </section>
      <section className="card">
        <div className="card-header"><span className="card-title">Allocation history</span><span>{allocations.length} records</span></div>
        <div className="table-container"><table>
          <thead><tr><th>Incident</th><th>Team</th><th>Priority</th><th>Allocated resources</th><th>Reason</th></tr></thead>
          <tbody>{allocations.map(item => {
            let resources = item.resources_allocated
            try { if (typeof resources === 'string') resources = JSON.parse(resources) } catch { resources = {} }
            return <tr key={item.id}><td>#{item.incident_id}</td><td>#{item.team_id}</td><td>{item.priority}</td><td>{Object.entries(resources || {}).map(([name, count]) => `${name.replaceAll('_', ' ')}: ${count}`).join(', ') || '—'}</td><td>{item.reason || '—'}</td></tr>
          })}{allocations.length === 0 && <tr><td colSpan={5} className="empty-state">No allocations have been recorded.</td></tr>}</tbody>
        </table></div>
      </section>
    </div>
  )
}

export default ResourceAllocation
