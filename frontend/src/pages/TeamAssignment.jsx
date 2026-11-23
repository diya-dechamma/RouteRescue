import React, { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, UserCheck, Users } from 'lucide-react'
import { assignmentAPI, incidentAPI, teamAPI } from '../services/api.js'
import { EmptyState, PageHeader, SectionHeader, SeverityBadge, StatusBadge } from '../components/ui.jsx'

function TeamAssignment() {
  const [assignments, setAssignments] = useState([])
  const [incidents, setIncidents] = useState([])
  const [teams, setTeams] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try {
      const [assignmentResponse, incidentResponse, teamResponse] = await Promise.all([
        assignmentAPI.getAll(),
        incidentAPI.getAll(),
        teamAPI.getAll(),
      ])
      setAssignments(assignmentResponse.data)
      setIncidents(incidentResponse.data)
      setTeams(teamResponse.data)
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

  const incidentById = Object.fromEntries(incidents.map(item => [item.id, item]))
  const teamById = Object.fromEntries(teams.map(item => [item.id, item]))

  return (
    <div>
      <PageHeader
        compact
        title="Emergency Team Assignment"
        description="Review saved responder assignments and run the existing automatic matching workflow."
        actions={<button className="btn btn-primary" onClick={autoAssign} disabled={running}><RefreshCw size={15} className={running ? 'spin' : ''} />{running ? 'Assigning…' : 'Auto-assign active incidents'}</button>}
      />
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <section className="card">
        <SectionHeader title="Current response assignments" description={`${assignments.length} assignment records returned by the backend.`} icon={UserCheck} />
        <div className="assignment-list">
          {assignments.map(item => {
            const incident = incidentById[item.incident_id]
            const team = teamById[item.team_id]
            return (
              <article className="assignment-card" key={item.id}>
                <div className="assignment-card-head">
                  <div className="assignment-number">#{item.id}</div>
                  <StatusBadge status={item.status} />
                  <span className="assignment-time">{item.assigned_at ? new Date(item.assigned_at).toLocaleString() : 'Time unavailable'}</span>
                </div>
                <div className="assignment-pair">
                  <div className="assignment-entity">
                    <span className="assignment-entity-label"><AlertTriangle size={14} /> Incident</span>
                    <strong>{incident?.title || `Incident #${item.incident_id}`}</strong>
                    <div className="assignment-entity-meta">
                      <span>{incident?.location || 'Location unavailable'}</span>
                      {incident?.severity && <SeverityBadge severity={incident.severity} />}
                    </div>
                  </div>
                  <div className="assignment-connector" aria-hidden="true">→</div>
                  <div className="assignment-entity">
                    <span className="assignment-entity-label"><Users size={14} /> Assigned response team</span>
                    <strong>{team?.name || `Team #${item.team_id}`}</strong>
                    <div className="assignment-entity-meta">
                      <span>{team?.team_type?.replaceAll('_', ' ') || 'Team type unavailable'}</span>
                      {team && <StatusBadge status={team.availability} />}
                    </div>
                  </div>
                </div>
                {item.reason && <div className="assignment-reason"><span>Assignment rationale</span><p>{item.reason}</p></div>}
              </article>
            )
          })}
        </div>
        {!assignments.length && <EmptyState title="No assignments yet" description="Automatic assignments will appear here after the backend creates them." />}
      </section>
      <p className="muted-copy">Automatic assignment uses the existing backend matching rules. Each available team is assigned at most once per run.</p>
    </div>
  )
}

export default TeamAssignment
