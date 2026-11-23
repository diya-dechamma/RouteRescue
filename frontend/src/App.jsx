import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
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

const pageMeta = {
  '/': { section: 'Overview', title: 'Command Center' },
  '/report': { section: 'Incident Operations', title: 'Report Emergency' },
  '/incidents': { section: 'Incident Operations', title: 'Incident Management' },
  '/roads': { section: 'Network Operations', title: 'Road Accessibility' },
  '/teams': { section: 'Response Management', title: 'Emergency Teams' },
  '/assignments': { section: 'Response Management', title: 'Team Assignment' },
  '/routes': { section: 'Network Operations', title: 'Route Optimization' },
  '/resources': { section: 'Response Management', title: 'Resource Allocation' },
  '/dynamic-routes': { section: 'Network Operations', title: 'Dynamic Route Updates' },
}

function ApplicationLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const currentPage = pageMeta[location.pathname] || pageMeta['/']

  return (
    <div className={`app-shell${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-nav-open' : ''}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed(value => !value)}
        onClose={() => setMobileOpen(false)}
      />
      {mobileOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-heading">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <PanelLeftOpen size={19} />
            </button>
            <div className="breadcrumb">
              <span>RouteRescue</span><span className="breadcrumb-separator">/</span><span>{currentPage.section}</span>
            </div>
            <h1>{currentPage.title}</h1>
          </div>
          <div className="topbar-actions">
            <span className="topbar-tagline">AI-Powered Emergency Response Coordination</span>
            <button
              className="icon-button collapse-button"
              onClick={() => setCollapsed(value => !value)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </header>
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
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ApplicationLayout />
    </BrowserRouter>
  )
}

export default App
