import React, { useState, useEffect, useCallback } from 'react'
import { incidentAPI, teamAPI, roadAPI } from '../services/api.js'
import { RefreshCw, AlertTriangle, Users, Map, Activity } from 'lucide-react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet'

function NetworkMap({ network, incidents, teams, roads }) {
  const nodes = Object.fromEntries((network?.nodes || []).map(node => [node.id, node]))
  const roadById = Object.fromEntries(roads.map(road => [road.id, road]))

  return (
    <MapContainer center={[12.2958, 76.6394]} zoom={12} scrollWheelZoom className="map-container">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {(network?.edges || []).map(edge => {
        const start = nodes[edge.source]
        const end = nodes[edge.target]
        if (!start || !end) return null
        const blocked = roadById[edge.id]?.accessibility === 'blocked'
        return (
          <Polyline
            key={edge.id}
            positions={[[start.lat, start.lng], [end.lat, end.lng]]}
            pathOptions={{ color: blocked ? '#c0392b' : '#2878b5', weight: blocked ? 5 : 3, dashArray: blocked ? '6 6' : undefined }}
          >
            <Popup>{roadById[edge.id]?.name || `${edge.source} - ${edge.target}`} · {blocked ? 'Blocked' : roadById[edge.id]?.accessibility || 'Simulated network'}</Popup>
          </Polyline>
        )
      })}
      {incidents.filter(item => item.lat != null && item.lng != null).map(incident => (
        <CircleMarker key={`incident-${incident.id}`} center={[incident.lat, incident.lng]} radius={8} pathOptions={{ color: '#c0392b' }}>
          <Popup>Emergency: {incident.title} · {incident.severity}</Popup>
        </CircleMarker>
      ))}
      {teams.filter(team => team.lat != null && team.lng != null).map(team => (
        <CircleMarker key={`team-${team.id}`} center={[team.lat, team.lng]} radius={6} pathOptions={{ color: team.availability === 'available' ? '#23845b' : '#777' }}>
          <Popup>{team.name} · {team.availability}</Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

function SeverityBadge({ severity }) {
  return <span className={`badge badge-${severity}`}>{severity}</span>
}

function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{status}</span>
}

function Dashboard() {
  const [incidents, setIncidents] = useState([])
  const [teams, setTeams] = useState([])
  const [roads, setRoads] = useState([])
  const [network, setNetwork] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [incRes, teamRes, roadRes, networkRes] = await Promise.all([
        incidentAPI.getAll(),
        teamAPI.getAll(),
        roadAPI.getAll(),
        roadAPI.getNetwork(),
      ])
      setIncidents(incRes.data)
      setTeams(teamRes.data)
      setRoads(roadRes.data)
      setNetwork(networkRes.data)
      setLastRefresh(new Date())
    } catch (err) {
      setError('Failed to load dashboard data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalIncidents = incidents.length
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length
  const activeTeams = teams.filter(t => t.availability === 'available').length
  const blockedRoads = roads.filter(r => r.accessibility === 'blocked').length

  const recentIncidents = [...incidents]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  if (loading) return <div className="loading">Loading dashboard...</div>

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Dashboard</h1>
            <p>AI-powered emergency response overview</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
        {lastRefresh && (
          <p style={{ fontSize: '0.78rem', color: '#999', marginTop: 4 }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-value">{totalIncidents}</div>
          <div className="stat-label">Total Incidents</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">{criticalIncidents}</div>
          <div className="stat-label">Critical Incidents</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{activeTeams}</div>
          <div className="stat-label">Available Teams</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-value">{blockedRoads}</div>
          <div className="stat-label">Blocked Roads</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <AlertTriangle size={16} style={{ display: 'inline', marginRight: 6 }} />
              Recent Incidents
            </span>
            <span style={{ fontSize: '0.8rem', color: '#999' }}>{incidents.length} total</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Location</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No incidents found</td></tr>
                ) : recentIncidents.map(inc => (
                  <tr key={inc.id}>
                    <td style={{ fontWeight: 500 }}>{inc.title}</td>
                    <td><span className={`badge badge-${inc.incident_type}`}>{inc.incident_type?.replace('_', ' ')}</span></td>
                    <td><SeverityBadge severity={inc.severity} /></td>
                    <td>{inc.location}</td>
                    <td><StatusBadge status={inc.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">GIS Response Map</span>
            <span style={{ fontSize: '0.8rem', color: '#777' }}>Simulated Mysuru road network · OpenStreetMap base layer</span>
          </div>
          <NetworkMap network={network} incidents={incidents} teams={teams} roads={roads} />
          <p style={{ fontSize: '0.78rem', color: '#777', marginTop: 8 }}>
            Route and road-condition overlays use the project’s simulated demonstration data; they are not validated live forecasts.
          </p>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Users size={16} style={{ display: 'inline', marginRight: 6 }} />
              Teams Status
            </span>
            <span style={{ fontSize: '0.8rem', color: '#999' }}>{teams.length} total</span>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Team Name</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {teams.length === 0 ? (
                  <tr><td colSpan={5} className="empty-state">No teams found</td></tr>
                ) : teams.slice(0, 8).map(team => (
                  <tr key={team.id}>
                    <td style={{ fontWeight: 500 }}>{team.name}</td>
                    <td><span className={`badge badge-${team.team_type}`}>{team.team_type?.replace('_', ' ')}</span></td>
                    <td>{team.location}</td>
                    <td><span className={`badge badge-${team.availability}`}>{team.availability}</span></td>
                    <td>{team.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Map size={16} style={{ display: 'inline', marginRight: 6 }} />
            Road Network Status
          </span>
          <span style={{ fontSize: '0.8rem', color: '#999' }}>{roads.length} roads</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Road Name</th>
                <th>From</th>
                <th>To</th>
                <th>Accessibility</th>
                <th>Risk Score</th>
                <th>Weather</th>
                <th>Traffic</th>
              </tr>
            </thead>
            <tbody>
              {roads.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">No roads found</td></tr>
              ) : roads.slice(0, 6).map(road => (
                <tr key={road.id}>
                  <td style={{ fontWeight: 500 }}>{road.name}</td>
                  <td>{road.start_node}</td>
                  <td>{road.end_node}</td>
                  <td><span className={`badge badge-${road.accessibility}`}>{road.accessibility}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600 }}>{(road.risk_score || 0).toFixed(2)}</span>
                      <div className="progress-bar" style={{ width: 60 }}>
                        <div
                          className={`progress-fill ${road.risk_score > 0.6 ? 'red' : road.risk_score > 0.3 ? 'orange' : 'green'}`}
                          style={{ width: `${Math.min(100, (road.risk_score || 0) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>{road.weather_condition}</td>
                  <td>{road.traffic_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stats-grid" style={{ marginTop: 0 }}>
        <div className="stat-card">
          <div className="stat-value">{incidents.filter(i => i.status === 'active').length}</div>
          <div className="stat-label">Active Incidents</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{incidents.filter(i => i.status === 'resolved').length}</div>
          <div className="stat-label">Resolved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{teams.filter(t => t.availability === 'busy').length}</div>
          <div className="stat-label">Busy Teams</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{roads.filter(r => r.accessibility === 'accessible').length}</div>
          <div className="stat-label">Accessible Roads</div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
