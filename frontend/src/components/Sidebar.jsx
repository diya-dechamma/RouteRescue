import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  AlertTriangle,
  FileText,
  MapPinned,
  Users,
  UserCheck,
  Navigation2,
  Package,
  RefreshCw,
  Shield,
  PanelLeftClose,
  X,
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
      { to: '/roads', icon: MapPinned, label: 'Road Accessibility' },
    ]
  },
  {
    section: 'Management',
    items: [
      { to: '/teams', icon: Users, label: 'Emergency Teams' },
      { to: '/assignments', icon: UserCheck, label: 'Team Assignment' },
      { to: '/routes', icon: Navigation2, label: 'Route Optimization' },
      { to: '/resources', icon: Package, label: 'Resource Allocation' },
      { to: '/dynamic-routes', icon: RefreshCw, label: 'Dynamic Routes' },
    ]
  }
]

function Sidebar({ collapsed, mobileOpen, onToggle, onClose }) {
  return (
    <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-lockup">
          <span className="brand-mark"><Shield size={21} strokeWidth={2.2} /></span>
          <span className="sidebar-brand">
            <span className="sidebar-logo">Route<span>Rescue</span></span>
            <span className="sidebar-subtitle">Emergency coordination</span>
          </span>
        </div>
        <button className="icon-button sidebar-mobile-close" onClick={onClose} aria-label="Close navigation">
          <X size={18} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div className="nav-section" key={section.section}>
            <div className="nav-section-title">{section.section}</div>
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                title={collapsed ? item.label : undefined}
                onClick={onClose}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-status"><span className="status-pulse" />Demo operations</div>
        <button className="sidebar-collapse-toggle" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <PanelLeftClose size={17} />
          <span>{collapsed ? 'Expand menu' : 'Collapse menu'}</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
