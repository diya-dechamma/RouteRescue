import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Route as RouteIcon } from 'lucide-react'
import { assignmentAPI, incidentAPI, roadAPI, routeAPI, teamAPI } from '../services/api.js'
import RouteMap from '../components/RouteMap.jsx'
import { EmptyState, MapLegend, PageHeader, SectionHeader } from '../components/ui.jsx'

function parseRoute(value) {
  if (!value) return null
  try { return typeof value === 'string' ? JSON.parse(value) : value } catch { return null }
}

function DynamicRouteUpdates() {
  const [assignments, setAssignments] = useState([])
  const [roads, setRoads] = useState([])
  const [network, setNetwork] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [teams, setTeams] = useState([])
  const [assignmentId, setAssignmentId] = useState('')
  const [roadId, setRoadId] = useState('')
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    try {
      const [assignmentResponse, roadResponse, networkResponse, incidentResponse, teamResponse] = await Promise.all([
        assignmentAPI.getAll(),
        roadAPI.getAll(),
        roadAPI.getNetwork(),
        incidentAPI.getAll(),
        teamAPI.getAll(),
      ])
      setAssignments(assignmentResponse.data)
      setRoads(roadResponse.data)
      setNetwork(networkResponse.data)
      setIncidents(incidentResponse.data)
      setTeams(teamResponse.data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load routes and roads.')
    }
  }, [])

  useEffect(() => { load() }, [load])
  const selected = assignments.find(item => String(item.id) === assignmentId)
  const originalRoute = useMemo(() => parseRoute(selected?.route_data), [selected])
  const roadsOnRoute = useMemo(() => {
    const path = originalRoute?.path || []
    const pathLinks = new Set(path.slice(1).map((node, index) => [path[index], node].sort().join('|')))
    return roads.filter(road => pathLinks.has([road.start_node, road.end_node].sort().join('|')))
  }, [originalRoute, roads])
  const selectableRoads = roadsOnRoute.length ? roadsOnRoute : roads

  useEffect(() => {
    setBefore(originalRoute)
    setAfter(null)
  }, [assignmentId, originalRoute])

  useEffect(() => {
    if (!selectableRoads.some(road => String(road.id) === roadId)) {
      setRoadId(String(selectableRoads[0]?.id || ''))
    }
  }, [selectableRoads, roadId])

  const blockAndRecalculate = async (event) => {
    event.preventDefault()
    if (!assignmentId || !roadId) return
    setUpdating(true)
    setError('')
    setAfter(null)
    try {
      await roadAPI.updateCondition(Number(roadId), { accessibility: 'blocked' })
      const response = await routeAPI.recalculate({
        assignment_id: Number(assignmentId),
        reason: `Road #${roadId} reported blocked; route recalculated`,
      })
      setBefore(originalRoute)
      setAfter(response.data.new_route)
      const roadsResponse = await roadAPI.getAll()
      setRoads(roadsResponse.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Road update or route recalculation failed.')
      await load()
    } finally {
      setUpdating(false)
    }
  }

  const displayPath = (route) => route?.path?.map(node => node.replaceAll('_', ' ')).join(' → ') || 'No route data available'

  const routeLayers = [
    ...(before ? [{ id: 'previous-route', route: before, label: 'Previous route', color: '#53a2ff', dashArray: '8 8', opacity: 0.8 }] : []),
    ...(after ? [{ id: 'recalculated-route', route: after, label: 'Recalculated route', color: '#42d392', weight: 6 }] : []),
  ]

  return (
    <div>
      <PageHeader compact title="Dynamic Route Updates" description="Compare an assignment’s saved route with a route recalculated around a reported closure." />
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <SectionHeader title="Closure and recalculation" description="Choose an active assignment and a segment from its saved route." icon={RefreshCw} />
        <form onSubmit={blockAndRecalculate}>
          <div className="form-row">
            <div className="form-group"><label>Active assignment</label><select required value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>
              <option value="">Select an assignment</option>{assignments.filter(item => item.status === 'active').map(item => <option key={item.id} value={item.id}>Assignment #{item.id} · incident #{item.incident_id} / team #{item.team_id}</option>)}
            </select></div>
            <div className="form-group"><label>Road to block</label><select required value={roadId} onChange={e => setRoadId(e.target.value)} disabled={!selectableRoads.length}>
              {selectableRoads.map(road => <option key={road.id} value={road.id}>Road #{road.id} · {road.name} ({road.accessibility})</option>)}
            </select></div>
          </div>
          <button className="btn btn-warning" disabled={updating || !assignmentId || !roadId}><AlertTriangle size={15} />{updating ? 'Updating and recalculating…' : 'Mark road blocked and recalculate'}</button>
        </form>
        <p className="muted-copy persistent-road-note">Road condition changes are saved in the database and remain in effect after this page is closed.</p>
      </section>
      <div className="comparison-grid">
        <section className="comparison-panel">
          <h4>Previous route</h4>
          <p>{displayPath(before)}</p>
          {before && <p>{before.total_distance_km} km · {before.estimated_time_min} min</p>}
        </section>
        <section className="comparison-panel new-route">
          <h4>Alternative route</h4>
          <p>{displayPath(after)}</p>
          {after && <p>{after.total_distance_km} km · {after.estimated_time_min} min</p>}
        </section>
      </div>
      {after && <div className="alert alert-success" role="status">Road #{roadId} is marked blocked. The saved assignment route has been recalculated; the displayed alternative excludes blocked links.</div>}
      <section className="card">
        <SectionHeader title="GIS route comparison" description="The previous and recalculated paths use coordinates from the API road network." icon={RouteIcon} />
        {network ? (
          <>
            <RouteMap network={network} roads={roads} incidents={incidents} teams={teams} routes={routeLayers} />
            <MapLegend items={[
              { label: 'Previous route', color: '#53a2ff', kind: 'dashed' },
              { label: 'Recalculated route', color: '#42d392', kind: 'line' },
              { label: 'Blocked road', color: '#ef5c6b', kind: 'dashed' },
            ]} />
          </>
        ) : <EmptyState title="Route map unavailable" description="The backend did not return road network coordinates." />}
      </section>
      <p className="muted-copy">Road conditions and travel-time estimates are simulated demonstration data, not operational dispatch guidance.</p>
    </div>
  )
}

export default DynamicRouteUpdates
