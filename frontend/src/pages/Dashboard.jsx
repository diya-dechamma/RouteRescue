import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPinned,
  RefreshCw,
  ShieldAlert,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { assignmentAPI, incidentAPI, resourceAPI, roadAPI, teamAPI } from '../services/api.js'
import RouteMap from '../components/RouteMap.jsx'
import { EmptyState, ErrorState, LoadingState, MapLegend, PageHeader, SectionHeader, SeverityBadge, StatusBadge, StatCard } from '../components/ui.jsx'

const severityOrder = ['critical', 'high', 'medium', 'low']
const severityColors = {
  critical: '#ef5c6b',
  high: '#f0a451',
  medium: '#e9c66e',
  low: '#45c995',
}
const roadStatuses = [
  { key: 'accessible', label: 'Accessible', color: '#45c995' },
  { key: 'partial', label: 'Partial', color: '#f0b858' },
  { key: 'high_risk', label: 'High risk', color: '#ef8b67' },
  { key: 'blocked', label: 'Blocked', color: '#ef5c6b' },
]
const teamStatuses = ['available', 'busy', 'offline']

function formatIncidentDate(value) {
  if (!value) return 'Time unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString()
}

function Dashboard() {
  const [data, setData] = useState({
    incidents: [],
    teams: [],
    roads: [],
    network: null,
    assignments: [],
    resourceSummary: null,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState(null)

  const fetchData = useCallback(async (background = false) => {
    if (background) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [incidents, teams, roads, network, assignments, resourceSummary] = await Promise.all([
        incidentAPI.getAll(),
        teamAPI.getAll(),
        roadAPI.getAll(),
        roadAPI.getNetwork(),
        assignmentAPI.getAll(),
        resourceAPI.getSummary(),
      ])
      setData({
        incidents: incidents.data,
        teams: teams.data,
        roads: roads.data,
        network: network.data,
        assignments: assignments.data,
        resourceSummary: resourceSummary.data,
      })
      setLastRefresh(new Date())
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Dashboard data could not be loaded. Check the backend connection and retry.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const counts = useMemo(() => ({
    critical: data.incidents.filter(item => item.severity === 'critical').length,
    activeTeams: data.teams.filter(item => item.availability === 'available').length,
    accessibleRoads: data.roads.filter(item => item.accessibility === 'accessible').length,
    activeIncidents: data.incidents.filter(item => item.status === 'active').length,
  }), [data])

  const severityData = useMemo(() => severityOrder.map(severity => ({
    name: severity,
    value: data.incidents.filter(item => item.severity === severity).length,
  })).filter(item => item.value > 0), [data.incidents])

  const activityData = useMemo(() => {
    const grouped = new Map()
    data.incidents.forEach(incident => {
      if (!incident.created_at) return
      const date = new Date(incident.created_at)
      if (Number.isNaN(date.getTime())) return
      const key = date.toLocaleDateString()
      grouped.set(key, (grouped.get(key) || 0) + 1)
    })
    return [...grouped.entries()]
      .map(([date, reports]) => ({ date, reports }))
      .slice(-7)
  }, [data.incidents])

  const roadCounts = useMemo(() => roadStatuses.map(status => ({
    ...status,
    value: data.roads.filter(road => road.accessibility === status.key).length,
  })), [data.roads])

  const teamCounts = useMemo(() => teamStatuses.map(status => ({
    status,
    value: data.teams.filter(team => team.availability === status).length,
  })), [data.teams])

  const recentIncidents = useMemo(() => [...data.incidents]
    .sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
    .slice(0, 5), [data.incidents])

  const savedRoutes = useMemo(() => data.assignments
    .filter(assignment => assignment.status === 'active' && assignment.route_data)
    .map(assignment => ({
      id: assignment.id,
      route: assignment.route_data,
      label: `Assignment #${assignment.id} · Team #${assignment.team_id}`,
    })), [data.assignments])

  if (loading) return <LoadingState label="Loading command center data…" />

  return (
    <div className="dashboard-page">
      <PageHeader
        compact
        title="Command Center"
        description="Live operational overview powered by current incident, team, road, assignment, and allocation records."
        actions={
          <button className="btn btn-secondary" onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        }
      />
      {error && <ErrorState message={error} onRetry={() => fetchData()} />}

      <div className="dashboard-stamp">
        <span><span className="status-pulse" /> Data connected</span>
        <span>{lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Waiting for first refresh'}</span>
      </div>

      <section className="stats-grid" aria-label="Operational metrics">
        <StatCard label="Total incidents" value={data.incidents.length} note={`${counts.activeIncidents} active`} icon={AlertTriangle} tone="blue" />
        <StatCard label="Critical incidents" value={counts.critical} note="Requires priority response" icon={ShieldAlert} tone="red" />
        <StatCard label="Available teams" value={counts.activeTeams} note={`${data.teams.length} teams registered`} icon={Users} tone="green" />
        <StatCard label="Accessible roads" value={counts.accessibleRoads} note={`${data.roads.length} roads monitored`} icon={MapPinned} tone="cyan" />
        <StatCard label="Saved allocations" value={data.resourceSummary?.total_allocations ?? 0} note="Allocation records" icon={CheckCircle2} tone="amber" />
      </section>

      <div className="dashboard-grid">
        <section className="card dashboard-map-card">
          <SectionHeader
            title="Response map"
            description="Persisted incidents, teams, road status, and active assignment routes."
            icon={MapPinned}
          />
          {data.network ? (
            <>
              <RouteMap
                network={data.network}
                roads={data.roads}
                incidents={data.incidents}
                teams={data.teams}
                routes={savedRoutes}
              />
              <MapLegend items={[
                { label: 'Active route', color: '#38bdf8', kind: 'line' },
                { label: 'Blocked road', color: '#ef5c6b', kind: 'dashed' },
                { label: 'Available team', color: '#45c995', kind: 'dot' },
                { label: 'Critical incident', color: '#ef5c6b', kind: 'dot' },
              ]} />
              <p className="map-disclaimer">Simulated Mysuru network and stored demonstration conditions; not live dispatch guidance.</p>
            </>
          ) : <EmptyState title="Map network unavailable" description="The road network endpoint returned no map data." />}
        </section>

        <section className="card">
          <SectionHeader title="Incident severity" description="Distribution across current incident records." icon={ShieldAlert} />
          {severityData.length ? (
            <>
              <div className="severity-chart-wrap">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={severityData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {severityData.map(entry => <Cell key={entry.name} fill={severityColors[entry.name]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#102137', border: '1px solid #2a405a', borderRadius: 8, color: '#e7eef8' }}
                      formatter={(value, name) => [value, `${name} incidents`]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="severity-chart-center">
                  <strong>{data.incidents.length}</strong><span>incidents</span>
                </div>
              </div>
              <div className="chart-legend">
                {severityData.map(item => (
                  <span className="chart-legend-item" key={item.name}>
                    <i className="chart-legend-dot" style={{ background: severityColors[item.name] }} />
                    <span>{item.name}</span><strong>{item.value}</strong>
                  </span>
                ))}
              </div>
            </>
          ) : <EmptyState title="No incidents to chart" description="Severity distribution will appear when incident records are available." />}
        </section>

        <section className="card">
          <SectionHeader title="Recent incidents" description={`${counts.activeIncidents} active response records`} icon={Clock3} />
          {recentIncidents.length ? (
            <div className="recent-incident-list">
              {recentIncidents.map(incident => (
                <article className="recent-incident" key={incident.id}>
                  <div className="recent-incident-main">
                    <div className="recent-incident-title" title={incident.title}>{incident.title}</div>
                    <div className="recent-incident-meta">
                      {incident.location || 'Location unavailable'} · {formatIncidentDate(incident.created_at)}
                    </div>
                  </div>
                  <div className="recent-incident-badges">
                    <SeverityBadge severity={incident.severity} />
                    <StatusBadge status={incident.status} />
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState title="No incident reports yet" description="Submitted reports will appear here." />}
        </section>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="card">
          <SectionHeader title="Road accessibility" description="Current persisted status for the simulated network." icon={MapPinned} />
          {data.roads.length ? (
            <div className="dashboard-road-list">
              {roadCounts.map(item => (
                <div className="road-status-row" key={item.key}>
                  <span className="road-status-name">{item.label}</span>
                  <div className="team-status-track">
                    <div
                      className="team-status-fill"
                      style={{
                        width: `${data.roads.length ? (item.value / data.roads.length) * 100 : 0}%`,
                        background: item.color,
                      }}
                    />
                  </div>
                  <strong className="road-status-count">{item.value}</strong>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No road records" description="Road data is not available from the backend." />}
        </section>

        <section className="card">
          <SectionHeader title="Team readiness" description="Availability from the emergency team roster." icon={Users} />
          {data.teams.length ? (
            <div className="team-status-list">
              {teamCounts.map(item => (
                <div className="team-status-line" key={item.status}>
                  <span>{item.status.replaceAll('_', ' ')}</span>
                  <div className="team-status-track">
                    <div
                      className={`team-status-fill ${item.status}`}
                      style={{ width: `${(item.value / data.teams.length) * 100}%` }}
                    />
                  </div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : <EmptyState title="No teams registered" description="Team status will appear after teams are added." />}
          <div className="mini-metric"><Activity size={15} /><span>Assignments saved</span><strong>{data.assignments.length}</strong></div>
        </section>
      </div>

      <section className="card activity-card">
        <SectionHeader title="Incident activity" description="Reports grouped by their recorded creation date." icon={Activity} />
        {activityData.length ? (
          <div className="activity-chart">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={activityData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
                <XAxis dataKey="date" tick={{ fill: '#8295ac', fontSize: 10 }} axisLine={{ stroke: '#33465e' }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#8295ac', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#102137', border: '1px solid #2a405a', borderRadius: 8, color: '#e7eef8' }}
                  cursor={{ fill: 'rgba(83, 162, 255, 0.08)' }}
                />
                <Bar dataKey="reports" name="Reports" fill="#53a2ff" radius={[5, 5, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <EmptyState title="No dated activity available" description="The chart uses timestamps returned with incident records." />}
      </section>
    </div>
  )
}

export default Dashboard
