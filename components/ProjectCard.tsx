'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type LocalProject, getMistOpacity } from '@/lib/registry'
import { useBridge, type PulseData } from '@/lib/bridge'

type ProjectCardProps = {
  project: LocalProject
  onClick?: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const mistOpacity = getMistOpacity(project.lastModified)
  const isActive = mistOpacity < 0.3
  const { isConnected, launch, pulse, terminal } = useBridge()
  
  const [pulseData, setPulseData] = useState<PulseData | null>(null)
  const [isPulsing, setIsPulsing] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  const typeIcons: Record<string, string> = {
    node: '📦',
    python: '🐍',
    'git-only': '📁',
    unknown: '❓',
  }

  const timeSince = () => {
    const now = Date.now() / 1000
    const diff = now - project.lastModified
    const days = Math.floor(diff / (24 * 60 * 60))
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return `${Math.floor(days / 30)} months ago`
  }

  const handleLaunch = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setActionStatus('Opening...')
    try {
      await launch(project.absolutePath)
      setActionStatus('Opened!')
      setTimeout(() => setActionStatus(null), 2000)
    } catch {
      setActionStatus('Failed')
      setTimeout(() => setActionStatus(null), 2000)
    }
  }

  const handlePulse = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPulsing(true)
    setShowPulse(true)
    try {
      const res = await pulse(project.absolutePath)
      if (res.success && res.data) {
        setPulseData(res.data as PulseData)
      } else {
        setPulseData({ hasGit: false, message: res.error || 'No data' })
      }
    } catch {
      setPulseData({ hasGit: false, message: 'Bridge offline' })
    }
    setIsPulsing(false)
  }

  const handleTerminal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setActionStatus('Opening Terminal...')
    try {
      await terminal(project.absolutePath)
      setActionStatus('Opened!')
      setTimeout(() => setActionStatus(null), 2000)
    } catch {
      setActionStatus('Failed')
      setTimeout(() => setActionStatus(null), 2000)
    }
  }

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1 - mistOpacity * 0.5, y: 0 }}
      whileHover={{ scale: 1.01, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        relative overflow-hidden rounded-2xl p-5
        bg-white/[0.03] border border-white/10
        hover:border-[#d4af37]/40 transition-all
        ${isActive ? 'ring-1 ring-[#d4af37]/20' : ''}
      `}
    >
      {/* Connection indicator */}
      <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-orange-400'} ${isActive ? 'animate-pulse' : ''}`} 
           title={isConnected ? 'Bridge connected' : 'Bridge offline (deep links only)'} />

      <div className="flex items-start gap-4">
        <div className="text-3xl">{typeIcons[project.projectType]}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {project.projectName}
          </h3>
          <p className="text-xs text-white/40 truncate mt-1 font-mono">
            {project.absolutePath}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-white/40">{timeSince()}</span>
            {project.hasGit && (
              <span className="text-xs text-[#d4af37]/60 flex items-center gap-1">
                <GitIcon /> Git
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <ActionButton 
          onClick={handleLaunch}
          icon={<LaunchIcon />}
          label="Launch"
          color="emerald"
        />
        <ActionButton 
          onClick={handlePulse}
          icon={<PulseIcon spinning={isPulsing} />}
          label="Pulse"
          color="cyan"
        />
        <ActionButton 
          onClick={handleTerminal}
          icon={<TerminalIcon />}
          label="Terminal"
          color="purple"
        />
      </div>

      {/* Status toast */}
      <AnimatePresence>
        {actionStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-full"
          >
            {actionStatus}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse Results Panel */}
      <AnimatePresence>
        {showPulse && pulseData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-white/70">Git Status</span>
              <button onClick={(e) => { e.stopPropagation(); setShowPulse(false) }} className="text-white/40 hover:text-white text-xs">✕</button>
            </div>
            {pulseData.hasGit === false ? (
              <p className="text-xs text-white/50">{pulseData.message || 'Not a git repository'}</p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-white/50">Branch:</span>
                  <span className="text-cyan-400 font-mono">{pulseData.branch}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/50">Last commit:</span>
                  <span className="text-white/70 font-mono truncate">{pulseData.lastCommit}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={pulseData.hasChanges ? 'text-orange-400' : 'text-emerald-400'}>
                    {pulseData.hasChanges ? `⚠ ${pulseData.changeCount} uncommitted changes` : '✓ Clean working tree'}
                  </span>
                </div>
                {pulseData.changes && pulseData.changes.length > 0 && (
                  <div className="mt-2 bg-black/30 rounded p-2 font-mono text-[10px] max-h-24 overflow-auto">
                    {pulseData.changes.map((c, i) => (
                      <div key={i} className="text-white/60">{c}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent"
        style={{ opacity: mistOpacity * 0.5 }}
      />
    </motion.div>
  )
}

function ActionButton({ onClick, icon, label, color }: { onClick: (e: React.MouseEvent) => void; icon: React.ReactNode; label: string; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400',
    cyan: 'hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:text-cyan-400',
    purple: 'hover:bg-purple-500/20 hover:border-purple-500/40 hover:text-purple-400',
  }
  
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg
        bg-white/[0.02] border border-white/10 text-white/60 text-xs font-medium
        transition-all ${colorClasses[color]}`}
    >
      {icon}
      {label}
    </button>
  )
}

function GitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function LaunchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6M14 10l6.1-6.1M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    </svg>
  )
}

function PulseIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg 
      width="14" 
      height="14" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={spinning ? 'animate-spin' : ''}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}
