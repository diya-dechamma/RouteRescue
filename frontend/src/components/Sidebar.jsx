import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  Map,
  Users,
  UserCheck,
  Navigation,
  Package,
  RefreshCw
} from 'lucide-react'

const navItems = [
  {
    section: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    section: 'Operations',
    items: [
      { to: '/report', icon: AlertTriangle, label: 'Report Emergency' },
      { to: '/incidents', icon: FileText, label: 'Incident Management' },
      { to: '/roads', icon: Map, label: 'Road Accessibility' },
    ]
  },
  {
    section: 'Management',
    items: [
      { to: '/teams', icon: Users, label: 'Emergency Teams' },
      { to: '/assignments', icon: UserCheck, label: 'Team Assignment' },
      { to: '/routes', icon: Navigation, label: 'Route Optimization' },
      { to: '/resources', icon: Package, label: 'Resource Allocation' },
      { to: '/dynamic-routes', icon: RefreshCw, label: 'Dynamic Routes' },
    ]
  }
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          Route<span>Rescue</span>
        </div>
        <div className="sidebar-subtitle">AI Emergency Response</div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
