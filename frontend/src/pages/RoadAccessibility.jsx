import React, { useState, useEffect, useCallback } from 'react'
import { roadAPI } from '../services/api.js'
import { RefreshCw, AlertTriangle } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [predictForm, setPredictForm] = useState(initialPredict)
  const [predictResult, setPredictResult] = useState(null)
  const [predicting, setPredicting] = useState(false)
  const [condForm, setCondForm] = useState(initialCondition)
  const [condResult, setCondResult] = useState(null)
  const [updating, setUpdating] = useState(false)

  const fetchRoads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await roadAPI.getAll()
      setRoads(res.data)
    } catch {
      setError('Failed to load road data.')
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
    setPredictResult(null)
    try {
      const res = await roadAPI.predictAccessibility(predictForm)
      setPredictResult(res.data)
    } catch (err) {
      alert('Prediction failed: ' + (err.response?.data?.detail || err.message))
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
    if (!condForm.road_id) { alert('Select a road first.'); return }
    setUpdating(true)
    setCondResult(null)
    try {
      const { road_id, ...data } = condForm
      const res = await roadAPI.updateCondition(road_id, data)
      setCondResult(res.data)
      fetchRoads()
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.detail || err.message))
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

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1>Road Accessibility</h1>
            <p>Monitor road conditions and predict accessibility using AI</p>
          </div>
          <button className="btn btn-secondary" onClick={fetchRoads}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        Accessibility scores are deterministic academic-demo estimates from the entered weather, traffic, flood, and historical-risk values. They are not validated real-world forecasts.
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-header">
          <span className="card-title">Road Network Status</span>
          <span style={{ fontSize: '0.8rem', color: '#999' }}>{roads.length} roads</span>
        </div>
        {loading ? <div className="loading">Loading roads...</div> : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Road Name</th>
                  <th>From → To</th>
                  <th>Accessibility</th>
                  <th>Risk Score</th>
                  <th>Weather</th>
                  <th>Traffic</th>
                  <th>Flood Risk</th>
                  <th>Historical Risk</th>
                  <th>Dist (km)</th>
                </tr>
              </thead>
              <tbody>
                {roads.length === 0 ? (
                  <tr><td colSpan={10} className="empty-state">No roads found</td></tr>
                ) : roads.map(road => (
                  <tr key={road.id}>
                    <td style={{ color: '#888', fontSize: '0.8rem' }}>{road.id}</td>
                    <td style={{ fontWeight: 500 }}>{road.name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{road.start_node} → {road.end_node}</td>
                    <td><span className={`badge badge-${road.accessibility}`}>{road.accessibility}</span></td>
                    <td>
                      <span style={{ fontWeight: 600, color: riskColor(road.risk_score) }}>
                        {(road.risk_score || 0).toFixed(3)}
                      </span>
                    </td>
                    <td>{road.weather_condition}</td>
                    <td>{road.traffic_level}</td>
                    <td>{road.flood_risk}</td>
                    <td>{road.historical_risk}</td>
                    <td>{road.distance_km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">🔮 Accessibility Predictor</span>
          </div>
          <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
            Prediction responds to input changes in real-time — adjust sliders and re-submit to compare.
          </div>
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
              {predicting ? 'Predicting...' : 'Predict Accessibility'}
            </button>
          </form>

          {predictResult && (
            <div style={{ marginTop: 16 }}>
              <div className={`alert alert-${predictResult.accessibility === 'accessible' ? 'success' : predictResult.accessibility === 'blocked' ? 'danger' : 'warning'}`}>
                <strong>Result: {predictResult.accessibility?.toUpperCase()}</strong>
                <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                  Risk Score: <strong>{(predictResult.risk_score || 0).toFixed(3)}</strong>
                </div>
              </div>
              {factorData.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>Risk Factor Breakdown</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={factorData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                      <XAxis dataKey="factor" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip formatter={(v) => `${v} risk points`} />
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
          <div className="card-header">
            <span className="card-title">🔧 Update Road Condition</span>
          </div>
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
              {updating ? 'Updating...' : 'Update Road Condition'}
            </button>
          </form>

          {condResult && (
            <div className="alert alert-success" style={{ marginTop: 16 }}>
              <strong>Road Updated!</strong>
              <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                New accessibility: <strong>{condResult.accessibility}</strong> | Risk: <strong>{(condResult.risk_score || 0).toFixed(3)}</strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoadAccessibility
