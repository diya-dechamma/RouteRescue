import React, { useEffect, useState } from 'react'
import { AlertTriangle, Navigation2, Route as RouteIcon } from 'lucide-react'
import { incidentAPI, roadAPI, routeAPI, teamAPI } from '../services/api.js'
import RouteMap from '../components/RouteMap.jsx'
import { EmptyState, MapLegend, PageHeader, SectionHeader, StatusBadge } from '../components/ui.jsx'

function RouteOptimization() {
  const [incidents, setIncidents] = useState([])
  const [teams, setTeams] = useState([])
  const [roads, setRoads] = useState([])
  const [network, setNetwork] = useState(null)
  const [teamId, setTeamId] = useState('')
  const [incidentId, setIncidentId] = useState('')
  const [route, setRoute] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([incidentAPI.getAll(), teamAPI.getAll(), roadAPI.getAll(), roadAPI.getNetwork()])
      .then(([incidentResponse, teamResponse, roadResponse, networkResponse]) => {
        setIncidents(incidentResponse.data)
        setTeams(teamResponse.data)
        setRoads(roadResponse.data)
        setNetwork(networkResponse.data)
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

  const selectedTeam = teams.find(team => String(team.id) === teamId)
  const selectedIncident = incidents.find(incident => String(incident.id) === incidentId)
  const routeLayers = route ? [{
    id: 'optimized-route',
    route,
    label: 'Recommended response route',
    color: '#42d392',
    weight: 6,
  }] : []

  return (
    <div>
      <PageHeader compact title="Route Optimization" description="Calculate a lower-risk response route over the existing simulated road graph." />
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <SectionHeader title="Route request" description="Choose a response team and an incident destination." icon={Navigation2} />
        <form onSubmit={optimize}>
          <div className="form-row">
            <div className="form-group"><label htmlFor="route-team">Emergency team</label><select id="route-team" required value={teamId} onChange={e => { setTeamId(e.target.value); setRoute(null) }}>
              {teams.map(team => <option key={team.id} value={team.id}>{team.name} ({team.availability})</option>)}
            </select></div>
            <div className="form-group"><label htmlFor="route-incident">Incident destination</label><select id="route-incident" required value={incidentId} onChange={e => { setIncidentId(e.target.value); setRoute(null) }}>
              {incidents.map(incident => <option key={incident.id} value={incident.id}>#{incident.id} · {incident.title}</option>)}
            </select></div>
          </div>
          <button className="btn btn-primary" disabled={loading || !teamId || !incidentId}><RouteIcon size={15} />{loading ? 'Calculating…' : 'Calculate safest route'}</button>
        </form>
      </section>
      {route && (
        <section className="card">
          <SectionHeader title="Recommended route" description={`${selectedTeam?.name || `Team #${teamId}`} → ${selectedIncident?.title || `Incident #${incidentId}`}`} icon={RouteIcon} />
          <div className="route-summary-grid">
            <div className="route-summary-cell"><div className="route-summary-label">Distance</div><div className="route-summary-value">{route.total_distance_km} km</div></div>
            <div className="route-summary-cell"><div className="route-summary-label">Estimated duration</div><div className="route-summary-value">{route.estimated_time_min} min</div></div>
            <div className="route-summary-cell"><div className="route-summary-label">Weighted cost</div><div className="route-summary-value">{route.weighted_cost}</div></div>
          </div>
          <div className="route-path" aria-label="Route nodes">{route.path.map((node, index) => <React.Fragment key={`${node}-${index}`}>
            {index > 0 && <span className="route-arrow" aria-hidden="true">→</span>}<span className="route-node">{node.replaceAll('_', ' ')}</span>
          </React.Fragment>)}</div>
          <div className="route-risk-heading"><AlertTriangle size={15} />Route risk notices</div>
          {route.risks?.length ? <ul className="reason-list">{route.risks.map((risk, index) => <li key={`${risk.road_id}-${index}`}>Road #{risk.road_id}: <StatusBadge status={risk.accessibility} /></li>)}</ul> : <p className="muted-copy">No partial or high-risk roads reported on this route.</p>}
        </section>
      )}
      <section className="card route-map-card">
        <SectionHeader
          title={route ? 'Recommended route map' : 'Road network map'}
          description="Map geometry is drawn from the existing backend road-network coordinates."
          icon={Navigation2}
        />
        {network ? (
          <>
            <RouteMap
              network={network}
              roads={roads}
              incidents={incidents}
              teams={teams}
              routes={routeLayers}
              className="route-optimization-map"
            />
            <MapLegend items={[
              ...(route ? [{ label: 'Recommended route', color: '#42d392', kind: 'line' }] : []),
              { label: 'Blocked road', color: '#ef5c6b', kind: 'dashed' },
              { label: 'Incident', color: '#f0a451', kind: 'dot' },
              { label: 'Available team', color: '#45c995', kind: 'dot' },
            ]} />
          </>
        ) : <EmptyState title="Map data unavailable" description="The road network endpoint did not return coordinates." />}
      </section>
      <p className="muted-copy">The road graph and travel-time estimates are simulated academic-demo data, not validated real-world forecasts or dispatch guidance.</p>
    </div>
  )
}

export default RouteOptimization
