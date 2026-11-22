import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet'
import { assignmentAPI, roadAPI, routeAPI } from '../services/api.js'

function parseRoute(value) {
  if (!value) return null
  try { return typeof value === 'string' ? JSON.parse(value) : value } catch { return null }
}

function DynamicRouteUpdates() {
  const [assignments, setAssignments] = useState([])
  const [roads, setRoads] = useState([])
  const [network, setNetwork] = useState(null)
  const [assignmentId, setAssignmentId] = useState('')
  const [roadId, setRoadId] = useState('')
  const [before, setBefore] = useState(null)
  const [after, setAfter] = useState(null)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    try {
      const [assignmentResponse, roadResponse, networkResponse] = await Promise.all([
        assignmentAPI.getAll(),
        roadAPI.getAll(),
        roadAPI.getNetwork(),
      ])
      setAssignments(assignmentResponse.data)
      setRoads(roadResponse.data)
      setNetwork(networkResponse.data)
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

  const routePositions = (route) => {
    if (!route?.path) return []
    const networkNodes = Object.fromEntries((network?.nodes || []).map(node => [node.id, node]))
    return route.path.map(nodeId => {
      const coordinate = route.nodes_coords?.[nodeId]
      if (coordinate) return [coordinate[0], coordinate[1]]
      const networkNode = networkNodes[nodeId]
      return networkNode ? [networkNode.lat, networkNode.lng] : null
    }).filter(Boolean)
  }

  const beforePositions = routePositions(before)
  const afterPositions = routePositions(after)

  return (
    <div>
      <div className="page-header"><h1>Dynamic Route Recalculation</h1><p>Simulate a road closure and recalculate an active assignment around blocked links.</p></div>
      {error && <div className="alert alert-danger">{error}</div>}
      <section className="card">
        <form onSubmit={blockAndRecalculate}>
          <div className="form-row">
            <div className="form-group"><label>Active assignment</label><select required value={assignmentId} onChange={e => setAssignmentId(e.target.value)}>
              <option value="">Select an assignment</option>{assignments.filter(item => item.status === 'active').map(item => <option key={item.id} value={item.id}>Assignment #{item.id} · incident #{item.incident_id} / team #{item.team_id}</option>)}
            </select></div>
            <div className="form-group"><label>Road to block</label><select required value={roadId} onChange={e => setRoadId(e.target.value)} disabled={!selectableRoads.length}>
              {selectableRoads.map(road => <option key={road.id} value={road.id}>Road #{road.id} · {road.name} ({road.accessibility})</option>)}
            </select></div>
          </div>
          <button className="btn btn-warning" disabled={updating || !assignmentId || !roadId}>{updating ? 'Updating and recalculating…' : 'Mark road blocked and recalculate'}</button>
        </form>
      </section>
      <div className="comparison-grid">
        <section className="comparison-panel"><h4>Previous route</h4><p>{displayPath(before)}</p>{before && <p>{before.total_distance_km} km · {before.estimated_time_min} min</p>}</section>
        <section className="comparison-panel new-route"><h4>Alternative route</h4><p>{displayPath(after)}</p>{after && <p>{after.total_distance_km} km · {after.estimated_time_min} min</p>}</section>
      </div>
      {after && <div className="alert alert-success">Road #{roadId} is marked blocked. The displayed route excludes blocked links.</div>}
      <section className="card">
        <div className="card-header"><span className="card-title">GIS Route Comparison</span>
          <span style={{ fontSize: '0.78rem', color: '#777' }}>Blue dashed: previous · Green: recalculated · Red dashed: blocked roads</span>
        </div>
        <MapContainer center={[12.2958, 76.6394]} zoom={12} scrollWheelZoom className="map-container">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {(network?.edges || []).map(edge => {
            const networkNodes = Object.fromEntries((network?.nodes || []).map(node => [node.id, node]))
            const start = networkNodes[edge.source]
            const end = networkNodes[edge.target]
            if (!start || !end) return null
            const road = roads.find(item => item.id === edge.id)
            const blocked = road?.accessibility === 'blocked'
            if (!blocked) return null
            return (
              <Polyline
                key={`blocked-${edge.id}`}
                positions={[[start.lat, start.lng], [end.lat, end.lng]]}
                pathOptions={{ color: '#c0392b', weight: 5, dashArray: '6 8' }}
              >
                <Popup>{road.name} · Blocked</Popup>
              </Polyline>
            )
          })}
          {beforePositions.length > 1 && (
            <Polyline positions={beforePositions} pathOptions={{ color: '#2878b5', weight: 4, dashArray: '8 8', opacity: 0.8 }}>
              <Popup>Previous route · {before?.total_distance_km} km</Popup>
            </Polyline>
          )}
          {afterPositions.length > 1 && (
            <Polyline positions={afterPositions} pathOptions={{ color: '#23845b', weight: 6, opacity: 0.95 }}>
              <Popup>Recalculated route · {after?.total_distance_km} km</Popup>
            </Polyline>
          )}
          {afterPositions.length > 0 && (
            <>
              <CircleMarker center={afterPositions[0]} radius={7} pathOptions={{ color: '#2878b5', fillColor: '#2878b5', fillOpacity: 1 }}>
                <Popup>Route start</Popup>
              </CircleMarker>
              <CircleMarker center={afterPositions[afterPositions.length - 1]} radius={7} pathOptions={{ color: '#23845b', fillColor: '#23845b', fillOpacity: 1 }}>
                <Popup>Incident destination</Popup>
              </CircleMarker>
            </>
          )}
        </MapContainer>
      </section>
      <p style={{ fontSize: '0.8rem', color: '#777' }}>Road statuses and travel times are simulated demonstration data and are not operational dispatch guidance.</p>
    </div>
  )
}

export default DynamicRouteUpdates
