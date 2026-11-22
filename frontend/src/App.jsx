import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import ReportEmergency from './pages/ReportEmergency.jsx'
import IncidentManagement from './pages/IncidentManagement.jsx'
import RoadAccessibility from './pages/RoadAccessibility.jsx'
import EmergencyTeams from './pages/EmergencyTeams.jsx'
import TeamAssignment from './pages/TeamAssignment.jsx'
import RouteOptimization from './pages/RouteOptimization.jsx'
import ResourceAllocation from './pages/ResourceAllocation.jsx'
import DynamicRouteUpdates from './pages/DynamicRouteUpdates.jsx'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/report" element={<ReportEmergency />} />
            <Route path="/incidents" element={<IncidentManagement />} />
            <Route path="/roads" element={<RoadAccessibility />} />
            <Route path="/teams" element={<EmergencyTeams />} />
            <Route path="/assignments" element={<TeamAssignment />} />
            <Route path="/routes" element={<RouteOptimization />} />
            <Route path="/resources" element={<ResourceAllocation />} />
            <Route path="/dynamic-routes" element={<DynamicRouteUpdates />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
