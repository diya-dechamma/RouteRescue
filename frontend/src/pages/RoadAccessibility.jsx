import React, { useState, useEffect, useCallback } from 'react'
import { incidentAPI, roadAPI } from '../services/api.js'
import { AlertTriangle, CloudRain, Gauge, MapPinned, RefreshCw, TrafficCone } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import RouteMap from '../components/RouteMap.jsx'
import { EmptyState, MapLegend, PageHeader, SectionHeader, StatCard, StatusBadge } from '../components/ui.jsx'

const initialPredict = {
  weather: 'clear',
  traffic: 'low',
  flood_risk: 0,
  historical_risk: 0,
  road_closure: false,
}

const initialCondition = {
  road_id: '',
  weather_condition: 'clear',
  traffic_level: 'low',
  flood_risk: 0,
  historical_risk: 0,
}

function RoadAccessibility() {
  const [roads, setRoads] = useState([])
  const [network, setNetwork] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [predictForm, setPredictForm] = useState(initialPredict)
  const [predictResult, setPredictResult] = useState(null)
  const [predictError, setPredictError] = useState('')
  const [predicting, setPredicting] = useState(false)
  const [condForm, setCondForm] = useState(initialCondition)
  const [condResult, setCondResult] = useState(null)
  const [updateError, setUpdateError] = useState('')
  const [updating, setUpdating] = useState(false)

  const fetchRoads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [roadResponse, networkResponse, incidentResponse] = await Promise.all([
        roadAPI.getAll(),
        roadAPI.getNetwork(),
        incidentAPI.getAll(),
      ])
      setRoads(roadResponse.data)
      setNetwork(networkResponse.data)
      setIncidents(incidentResponse.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load road data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRoads() }, [fetchRoads])

  const handlePredictChange = (e) => {
    const { name, value, type, checked } = e.target
    setPredictForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'flood_risk' || name === 'historical_risk' ? parseFloat(value) : value)
    }))
  }

  const handlePredict = async (e) => {
    e.preventDefault()
    setPredicting(true)
    setPredictError('')
    setPredictResult(null)
    try {
      const res = await roadAPI.predictAccessibility(predictForm)
      setPredictResult(res.data)
    } catch (err) {
      setPredictError(err.response?.data?.detail || err.message || 'Prediction failed.')
    } finally {
      setPredicting(false)
    }
  }

  const handleCondChange = (e) => {
    const { name, value } = e.target
    setCondForm(prev => ({
      ...prev,
      [name]: (name === 'flood_risk' || name === 'historical_risk') ? parseFloat(value) : value
    }))
  }

  const handleCondUpdate = async (e) => {
    e.preventDefault()
    if (!condForm.road_id) { setUpdateError('Select a road before updating its condition.'); return }
    setUpdating(true)
    setUpdateError('')
    setCondResult(null)
    try {
      const { road_id, ...data } = condForm
      const res = await roadAPI.updateCondition(road_id, data)
      setCondResult(res.data)
      await fetchRoads()
    } catch (err) {
      setUpdateError(err.response?.data?.detail || err.message || 'Road condition update failed.')
    } finally {
      setUpdating(false)
    }
  }

  const factorData = predictResult?.factors
    ? Object.entries(predictResult.factors).map(([key, value]) => ({
        factor: key.replace('_', ' '),
        value: Number(value.contribution || 0)
      }))
    : []

  const riskColor = (score) => {
    if (score > 0.6) return '#e63946'
    if (score > 0.3) return '#f4a261'
    return '#2d9d6e'
  }
  const roadCounts = {
    accessible: roads.filter(road => road.accessibility === 'accessible').length,
    partial: roads.filter(road => road.accessibility === 'partial').length,
    highRisk: roads.filter(road => road.accessibility === 'high_risk').length,
    blocked: roads.filter(road => road.accessibility === 'blocked').length,
  }

  return (
    <div>
      <PageHeader
        compact
        title="Road Accessibility"
        description="Monitor road status and compare deterministic accessibility estimates."
        actions={<button className="btn btn-secondary" onClick={fetchRoads} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />Refresh</button>}
      />
      <div className="alert alert-info">
        Road conditions and prediction inputs are simulated academic-demo data. The deterministic estimates are not validated real-world forecasts.
      </div>
      {error && <div className="alert alert-danger">{error}</div>}

      <section className="stats-grid road-stats" aria-label="Road status totals">
        <StatCard label="Accessible" value={roadCounts.accessible} icon={MapPinned} tone="green" />
        <StatCard label="Partial" value={roadCounts.partial} icon={TrafficCone} tone="amber" />
        <StatCard label="High risk" value={roadCounts.highRisk} icon={AlertTriangle} tone="red" />
        <StatCard label="Blocked" value={roadCounts.blocked} icon={Gauge} tone="blue" />
      </section>

      <section className="card">
        <SectionHeader title="Road network map" description={`${roads.length} monitored road segments and reported incident markers.`} icon={MapPinned} />
        {network ? (
          <>
            <RouteMap network={network} roads={roads} incidents={incidents} />
            <MapLegend items={[
              { label: 'Open road segment', color: '#52637a', kind: 'line' },
              { label: 'Blocked road', color: '#ef5c6b', kind: 'dashed' },
              { label: 'Incident', color: '#f0a451', kind: 'dot' },
            ]} />
          </>
        ) : <EmptyState title="Road network map unavailable" description="The backend did not return network coordinates." />}
      </section>

      <section className="card">
        <SectionHeader title="Road network status" description="Condition, risk inputs, and simulated segment distance." icon={TrafficCone} />
        {loading ? <div className="loading">Loading roads…</div> : roads.length ? (
          <div className="table-container"><table>
            <thead><tr><th>ID</th><th>Road</th><th>From → To</th><th>Accessibility</th><th>Risk score</th><th>Weather</th><th>Traffic</th><th>Flood</th><th>Historical</th><th>Distance</th></tr></thead>
            <tbody>{roads.map(road => (
              <tr key={road.id}>
                <td>#{road.id}</td><td>{road.name}</td><td>{road.start_node} → {road.end_node}</td>
                <td><StatusBadge status={road.accessibility} /></td>
                <td><span style={{ fontWeight: 650, color: riskColor(road.risk_score) }}>{(road.risk_score || 0).toFixed(3)}</span></td>
                <td>{road.weather_condition}</td><td>{road.traffic_level}</td><td>{road.flood_risk}</td><td>{road.historical_risk}</td><td>{road.distance_km} km</td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <EmptyState title="No roads found" description="The road endpoint returned no records." />}
      </section>

      <div className="grid-2">
        <div className="card">
          <SectionHeader title="Accessibility predictor" description="Adjust the inputs and request a deterministic demo estimate." icon={CloudRain} />
          {predictError && <div className="alert alert-danger">{predictError}</div>}
          <form onSubmit={handlePredict}>
            <div className="form-group">
              <label>Weather Condition</label>
              <select name="weather" value={predictForm.weather} onChange={handlePredictChange}>
                <option value="clear">Clear</option>
                <option value="rainy">Rain</option>
                <option value="stormy">Stormy</option>
                <option value="foggy">Fog</option>
              </select>
            </div>
            <div className="form-group">
              <label>Traffic Level</label>
              <select name="traffic" value={predictForm.traffic} onChange={handlePredictChange}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
                <option value="gridlock">Gridlock</option>
              </select>
            </div>
            <div className="form-group">
              <label>Flood Risk (0–10): <strong>{predictForm.flood_risk}</strong></label>
              <input type="range" name="flood_risk" min="0" max="10" step="0.5"
                value={predictForm.flood_risk} onChange={handlePredictChange} />
            </div>
            <div className="form-group">
              <label>Historical Risk (0–10): <strong>{predictForm.historical_risk}</strong></label>
              <input type="range" name="historical_risk" min="0" max="10" step="0.5"
                value={predictForm.historical_risk} onChange={handlePredictChange} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" name="road_closure" id="road_closure"
                checked={predictForm.road_closure} onChange={handlePredictChange}
                style={{ width: 'auto' }} />
              <label htmlFor="road_closure" style={{ marginBottom: 0 }}>Road Closure Reported</label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={predicting}>
              {predicting ? 'Predicting…' : 'Predict accessibility'}
            </button>
          </form>

          {predictResult && (
            <div className="predict-result-panel">
              <div className="predict-result-heading">
                <span>Prediction result</span>
                <StatusBadge status={predictResult.accessibility} />
              </div>
              <div className="predict-risk-score">Risk score <strong>{(predictResult.risk_score || 0).toFixed(3)}</strong></div>
              {factorData.length > 0 && (
                <div className="predict-chart">
                  <div className="predict-chart-title">Risk factor contributions</div>
                  <ResponsiveContainer width="100%" height={190}>
                    <BarChart data={factorData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                      <XAxis dataKey="factor" tick={{ fill: '#8295ac', fontSize: 10 }} angle={-30} textAnchor="end" axisLine={{ stroke: '#33465e' }} tickLine={false} />
                      <YAxis tick={{ fill: '#8295ac', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#102137', border: '1px solid #2a405a', borderRadius: 8, color: '#e7eef8' }} formatter={value => [`${value} risk points`, 'Contribution']} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {factorData.map((entry, i) => (
                          <Cell key={i} fill={entry.value > 6 ? '#e63946' : entry.value > 2 ? '#f4a261' : '#2d9d6e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <SectionHeader title="Update road condition" description="Persist new weather, traffic, and risk inputs for a selected segment." icon={RefreshCw} />
          {updateError && <div className="alert alert-danger">{updateError}</div>}
          <form onSubmit={handleCondUpdate}>
            <div className="form-group">
              <label>Select Road</label>
              <select name="road_id" value={condForm.road_id} onChange={handleCondChange} required>
                <option value="">— Select a road —</option>
                {roads.map(r => (
                  <option key={r.id} value={r.id}>#{r.id} – {r.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Weather Condition</label>
              <select name="weather_condition" value={condForm.weather_condition} onChange={handleCondChange}>
                <option value="clear">Clear</option>
                <option value="rainy">Rain</option>
                <option value="stormy">Stormy</option>
                <option value="foggy">Fog</option>
              </select>
            </div>
            <div className="form-group">
              <label>Traffic Level</label>
              <select name="traffic_level" value={condForm.traffic_level} onChange={handleCondChange}>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="heavy">Heavy</option>
                <option value="gridlock">Gridlock</option>
              </select>
            </div>
            <div className="form-group">
              <label>Flood Risk (0–10): <strong>{condForm.flood_risk}</strong></label>
              <input type="range" name="flood_risk" min="0" max="10" step="0.5"
                value={condForm.flood_risk} onChange={handleCondChange} />
            </div>
            <div className="form-group">
              <label>Historical Risk (0–10): <strong>{condForm.historical_risk}</strong></label>
              <input type="range" name="historical_risk" min="0" max="10" step="0.5"
                value={condForm.historical_risk} onChange={handleCondChange} />
            </div>
            <button type="submit" className="btn btn-warning" disabled={updating}>
              <AlertTriangle size={16} />
              {updating ? 'Updating…' : 'Update road condition'}
            </button>
          </form>

          {condResult && (
            <div className="alert alert-success road-update-result" role="status">
              <strong>Road condition saved.</strong>
              <span>Accessibility: <StatusBadge status={condResult.accessibility} /></span>
              <span>Risk score: <strong>{(condResult.risk_score || 0).toFixed(3)}</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoadAccessibility
