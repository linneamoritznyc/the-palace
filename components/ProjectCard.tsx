'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type LocalProject, getMistOpacity } from '@/lib/registry'
import { useCockpit } from '@/hooks/useCockpit'

type ProjectCardProps = {
  project: LocalProject
  onClick?: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const mistOpacity = getMistOpacity(project.lastModified)
  const isActive = mistOpacity < 0.3

  const { isLocalConnected, sendCommand } = useCockpit()

  const [pulseResult, setPulseResult] = useState<{ hasChanges: boolean; changeCount: number } | null>(null)
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
    setActionStatus('Launching...')
    try {
      await sendCommand('LAUNCH', project.absolutePath)
      setActionStatus('Launched')
    } catch {
      setActionStatus('Launch failed')
    }
    setTimeout(() => setActionStatus(null), 2000)
  }

  const handlePulse = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setActionStatus('Pulsing...')
    try {
      const res = await sendCommand('PULSE', project.absolutePath)
      const data = res.data as { hasChanges?: boolean; changeCount?: number } | undefined
      setPulseResult({
        hasChanges: Boolean(data?.hasChanges),
        changeCount: Number(data?.changeCount || 0),
      })
      setActionStatus('Pulse complete')
    } catch {
      setPulseResult(null)
      setActionStatus('Pulse failed')
    }
    setTimeout(() => setActionStatus(null), 2000)
  }

  const handleTerminal = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setActionStatus('Opening Terminal...')
    try {
      await sendCommand('TERMINAL', project.absolutePath)
      setActionStatus('Terminal opened')
    } catch {
      setActionStatus('Terminal failed')
    }
    setTimeout(() => setActionStatus(null), 2000)
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
      <div
        className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isLocalConnected ? 'bg-emerald-400' : 'bg-red-400'} ${isActive ? 'animate-pulse' : ''}`}
        title={isLocalConnected ? 'System Link: connected' : 'System Link: offline'}
      />

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

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <ActionButton onClick={handleLaunch} icon="🚀" label="Launch" color="emerald" />
        <ActionButton onClick={handlePulse} icon="💓" label="Pulse" color="cyan" />
        <ActionButton onClick={handleTerminal} icon="🐚" label="Terminal" color="purple" />
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

      <AnimatePresence>
        {pulseResult && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-white/10"
          >
            <div className="text-xs">
              <span className={pulseResult.hasChanges ? 'text-orange-400' : 'text-emerald-400'}>
                {pulseResult.hasChanges ? `⚠ ${pulseResult.changeCount} uncommitted changes` : '✓ Clean working tree'}
              </span>
            </div>
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

function ActionButton({ onClick, icon, label, color }: { onClick: (e: React.MouseEvent) => void; icon: string; label: string; color: string }) {
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
      <span className="text-sm">{icon}</span>
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
