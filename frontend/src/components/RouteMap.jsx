import React, { useEffect, useMemo } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'

const severityColors = {
  critical: '#f04452',
  high: '#ff9f43',
  medium: '#f3c969',
  low: '#47c99a',
}

function parseRoute(value) {
  if (!value) return null
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function routePositions(route, nodes) {
  const parsed = parseRoute(route)
  if (!parsed?.path) return []
  return parsed.path
    .map(nodeId => {
      const coordinate = parsed.nodes_coords?.[nodeId]
      if (coordinate) return [coordinate[0], coordinate[1]]
      const networkNode = nodes[nodeId]
      return networkNode ? [networkNode.lat, networkNode.lng] : null
    })
    .filter(Boolean)
}

function FitMapToContent({ positions }) {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [28, 28], maxZoom: 13 })
    }
  }, [map, positions])

  return null
}

export default function RouteMap({
  network,
  roads = [],
  incidents = [],
  teams = [],
  routes = [],
  className = '',
}) {
  const nodes = useMemo(
    () => Object.fromEntries((network?.nodes || []).map(node => [node.id, node])),
    [network],
  )
  const roadsById = useMemo(
    () => Object.fromEntries(roads.map(road => [road.id, road])),
    [roads],
  )

  const routeLayers = useMemo(
    () => routes.map((item, index) => ({
      ...item,
      parsed: parseRoute(item.route),
      positions: routePositions(item.route, nodes),
      color: item.color || ['#38bdf8', '#42d392', '#a78bfa'][index % 3],
    })),
    [routes, nodes],
  )

  const mapPositions = useMemo(() => {
    const activeRoutes = routeLayers.flatMap(item => item.positions)
    if (activeRoutes.length) return activeRoutes
    return [
      ...(network?.nodes || []).map(node => [node.lat, node.lng]),
      ...incidents.filter(item => item.lat != null && item.lng != null).map(item => [item.lat, item.lng]),
      ...teams.filter(item => item.lat != null && item.lng != null).map(item => [item.lat, item.lng]),
    ]
  }, [routeLayers, network, incidents, teams])

  return (
    <div className={`route-map ${className}`}>
      <MapContainer center={[12.2958, 76.6394]} zoom={12} scrollWheelZoom className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="command-dark-tiles"
        />
        <FitMapToContent positions={mapPositions} />
        {(network?.edges || []).map(edge => {
          const start = nodes[edge.source]
          const end = nodes[edge.target]
          if (!start || !end) return null
          const road = roadsById[edge.id]
          const blocked = road?.accessibility === 'blocked'
          return (
            <Polyline
              key={`network-${edge.id}`}
              positions={[[start.lat, start.lng], [end.lat, end.lng]]}
              pathOptions={{
                color: blocked ? '#f04452' : '#52637a',
                weight: blocked ? 4 : 2,
                opacity: blocked ? 0.9 : 0.55,
                dashArray: blocked ? '7 7' : undefined,
              }}
            >
              <Popup>
                <strong>{road?.name || `${edge.source} – ${edge.target}`}</strong>
                <br />
                {blocked ? 'Blocked' : road?.accessibility || 'Simulated network'}
              </Popup>
            </Polyline>
          )
        })}
        {routeLayers.map(item => item.positions.length > 1 && (
          <Polyline
            key={`route-${item.id || item.label}`}
            positions={item.positions}
            pathOptions={{
              color: item.color,
              weight: item.weight || 5,
              opacity: item.opacity || 0.95,
              dashArray: item.dashArray,
            }}
          >
            <Popup>
              <strong>{item.label || 'Response route'}</strong>
              {item.parsed?.total_distance_km != null && (
                <><br />{item.parsed.total_distance_km} km · {item.parsed.estimated_time_min} min</>
              )}
            </Popup>
          </Polyline>
        ))}
        {incidents.filter(item => item.lat != null && item.lng != null).map(incident => (
          <CircleMarker
            key={`incident-${incident.id}`}
            center={[incident.lat, incident.lng]}
            radius={incident.severity === 'critical' ? 9 : 7}
            pathOptions={{
              color: severityColors[incident.severity] || '#cbd5e1',
              fillColor: severityColors[incident.severity] || '#cbd5e1',
              fillOpacity: 0.9,
              weight: 2,
            }}
          >
            <Popup>
              <strong>{incident.title}</strong>
              <br />{incident.location || 'Location unavailable'}
              <br />Severity: {incident.severity || 'unknown'} · {incident.status || 'unknown'}
            </Popup>
          </CircleMarker>
        ))}
        {teams.filter(team => team.lat != null && team.lng != null).map(team => (
          <CircleMarker
            key={`team-${team.id}`}
            center={[team.lat, team.lng]}
            radius={6}
            pathOptions={{
              color: team.availability === 'available' ? '#42d392' : '#93a4ba',
              fillColor: team.availability === 'available' ? '#42d392' : '#69798f',
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Popup><strong>{team.name}</strong><br />{team.team_type?.replaceAll('_', ' ')} · {team.availability}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  )
}
