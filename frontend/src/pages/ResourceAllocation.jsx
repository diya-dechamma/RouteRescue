import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Package, RefreshCw, ShieldCheck } from 'lucide-react'
import { resourceAPI, teamAPI } from '../services/api.js'
import { EmptyState, PageHeader, SectionHeader, SeverityBadge, StatusBadge, StatCard } from '../components/ui.jsx'

function ResourceAllocation() {
  const [allocations, setAllocations] = useState([])
  const [teams, setTeams] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try {
      const [allocationResponse, summaryResponse, teamResponse] = await Promise.all([
        resourceAPI.getAllocations(),
        resourceAPI.getSummary(),
        teamAPI.getAll(),
      ])
      setAllocations(allocationResponse.data)
      setSummary(summaryResponse.data)
      setTeams(teamResponse.data)
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

  const teamById = Object.fromEntries(teams.map(team => [team.id, team]))
  const inventory = value => {
    if (!value) return {}
    if (typeof value !== 'string') return value
    try { return JSON.parse(value) } catch { return {} }
  }
  const allocationIssues = allocations.map(item => {
    const assigned = inventory(item.resources_allocated)
    const stock = inventory(teamById[item.team_id]?.resources)
    const missing = Object.entries(assigned)
      .filter(([name, quantity]) => stock[name] == null || quantity > stock[name])
      .map(([name]) => name.replaceAll('_', ' '))
    return { id: item.id, missing }
  }).filter(item => item.missing.length)

  return (
    <div>
      <PageHeader
        compact
        title="Resource Allocation"
        description="Review recorded inventory and allocation history from the backend."
        actions={<button className="btn btn-secondary" onClick={load}><RefreshCw size={15} />Refresh</button>}
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {summary && <div className="stats-grid resource-stats">
        <StatCard label="Active emergencies" value={summary.active_incidents} icon={AlertTriangle} tone="red" />
        <StatCard label="Available teams" value={summary.available_teams} icon={ShieldCheck} tone="green" />
        <StatCard label="Saved allocations" value={summary.total_allocations} icon={Package} tone="blue" />
      </div>}
      {allocationIssues.length > 0 && (
        <div className="alert alert-warning allocation-warning" role="status">
          <AlertTriangle size={17} />
          <div>
            <strong>{allocationIssues.length} allocation record(s) need inventory review.</strong>
            <p>These items are absent from, or exceed, the team’s currently listed inventory. Inventory may have changed since allocation; verify the records before operational use.</p>
          </div>
        </div>
      )}
      <section className="card">
        <SectionHeader
          title="Team inventory"
          description="Current inventory values returned by the emergency team endpoint."
          icon={Package}
          action={<button className="btn btn-primary" onClick={allocate} disabled={running}><RefreshCw size={15} className={running ? 'spin' : ''} />{running ? 'Allocating…' : 'Allocate resources'}</button>}
        />
        <div className="inventory-grid">
          {teams.map(team => {
            const resources = inventory(team.resources)
            return (
              <article className="inventory-card" key={team.id}>
                <div className="inventory-card-head">
                  <div><strong>{team.name}</strong><span>{team.team_type?.replaceAll('_', ' ')}</span></div>
                  <StatusBadge status={team.availability} />
                </div>
                <div className="inventory-card-items">
                  {Object.entries(resources).length ? Object.entries(resources).map(([name, quantity]) => (
                    <span className="inventory-chip" key={name}>{name.replaceAll('_', ' ')} <strong>{quantity}</strong></span>
                  )) : <span className="muted-copy">No inventory recorded</span>}
                </div>
              </article>
            )
          })}
        </div>
        <p className="muted-copy">The allocator uses the existing severity/type rules and available inventory. Each available team is used once per allocation run.</p>
      </section>
      <section className="card">
        <SectionHeader title="Allocation history" description={`${allocations.length} saved records.`} icon={ShieldCheck} />
        {allocations.length ? (
          <div className="allocation-list">
            {allocations.map(item => {
              const resources = inventory(item.resources_allocated)
              const issue = allocationIssues.find(entry => entry.id === item.id)
              const team = teamById[item.team_id]
              return (
                <article className={`allocation-card${issue ? ' has-allocation-warning' : ''}`} key={item.id}>
                  <div className="allocation-card-head">
                    <div><strong>Allocation #{item.id}</strong><span>Incident #{item.incident_id} · {team?.name || `Team #${item.team_id}`}</span></div>
                    <span className="priority-pill">Priority {item.priority}</span>
                  </div>
                  <div className="allocation-card-resources">
                    {Object.entries(resources).map(([name, quantity]) => (
                      <span className={`allocation-resource${issue?.missing.includes(name.replaceAll('_', ' ')) ? ' is-warning' : ''}`} key={name}>
                        {name.replaceAll('_', ' ')} <strong>{quantity}</strong>
                      </span>
                    ))}
                  </div>
                  {issue && <div className="allocation-issue"><AlertTriangle size={14} />Review: {issue.missing.join(', ')}</div>}
                  {item.reason && <details className="allocation-reason"><summary>Allocation rationale</summary><p>{item.reason}</p></details>}
                </article>
              )
            })}
          </div>
        ) : <EmptyState title="No allocations recorded" description="Allocation history will appear after the backend creates records." />}
      </section>
    </div>
  )
}

export default ResourceAllocation
