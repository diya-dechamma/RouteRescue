import React, { useEffect, useState } from 'react'
import { incidentAPI, routeAPI, teamAPI } from '../services/api.js'

function RouteOptimization() {
  const [incidents, setIncidents] = useState([])
  const [teams, setTeams] = useState([])
  const [teamId, setTeamId] = useState('')
  const [incidentId, setIncidentId] = useState('')
  const [route, setRoute] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([incidentAPI.getAll(), teamAPI.getAll()])
      .then(([incidentResponse, teamResponse]) => {
        setIncidents(incidentResponse.data)
        setTeams(teamResponse.data)
        if (teamResponse.data.length) setTeamId(String(teamResponse.data[0].id))
        if (incidentResponse.data.length) setIncidentId(String(incidentResponse.data[0].id))
      })
      .catch(err => setError(err.response?.data?.detail || 'Could not load incidents and teams.'))
  }, [])

  const optimize = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setRoute(null)
    try {
      const response = await routeAPI.optimize({ team_id: Number(teamId), incident_id: Number(incidentId) })
      setRoute(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'No safe route could be calculated.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Risk-aware Route Optimization</h1><p>Dijkstra routing over the simulated road graph, penalizing high-risk roads and excluding blocked links.</p></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <form onSubmit={optimize}>
          <div className="form-row">
            <div className="form-group"><label>Emergency team</label><select required value={teamId} onChange={e => setTeamId(e.target.value)}>
              {teams.map(team => <option key={team.id} value={team.id}>{team.name} ({team.availability})</option>)}
            </select></div>
            <div className="form-group"><label>Incident</label><select required value={incidentId} onChange={e => setIncidentId(e.target.value)}>
              {incidents.map(incident => <option key={incident.id} value={incident.id}>#{incident.id} · {incident.title}</option>)}
            </select></div>
          </div>
          <button className="btn btn-primary" disabled={loading || !teamId || !incidentId}>{loading ? 'Calculating…' : 'Calculate safest route'}</button>
        </form>
      </section>
      {route && <section className="card">
        <div className="card-header"><span className="card-title">Recommended Route</span><span>Weighted cost: {route.weighted_cost}</span></div>
        <p><strong>Simulated estimate:</strong> {route.total_distance_km} km · {route.estimated_time_min} min</p>
        <div className="route-path">{route.path.map((node, index) => <React.Fragment key={node}>
          {index > 0 && <span className="route-arrow">→</span>}<span className="route-node">{node.replaceAll('_', ' ')}</span>
        </React.Fragment>)}</div>
        <h3 style={{ marginTop: 16 }}>Risk notices</h3>
        {route.risks?.length ? <ul className="reason-list">{route.risks.map((risk, index) => <li key={`${risk.road_id}-${index}`}>Road #{risk.road_id}: {risk.accessibility}</li>)}</ul> : <p>No partial or high-risk roads on this route.</p>}
        <p style={{ fontSize: '0.8rem', color: '#777', marginTop: 12 }}>Road network and travel-time estimates are simulated academic-demo data, not validated real-world forecasts.</p>
      </section>}
    </div>
  )
}

export default RouteOptimization
