'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type LocalProject, getMistOpacity } from '@/lib/registry'
import { useCockpit } from '@/hooks/useCockpit'

type ProjectCardProps = {
  project: LocalProject
  analysis?: {
    executiveSummary: string
    primaryTechStack: string
  }
  onClick?: () => void
}

export function ProjectCard({ project, analysis, onClick }: ProjectCardProps) {
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

  const handleOpenBrowser = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setActionStatus('Opening browser...')
    try {
      const res = await sendCommand('DETECT_PORT', project.absolutePath)
      const data = res.data as { port?: number } | undefined
      const port = Number(data?.port || 3001)
      window.open(`http://localhost:${port}`, '_blank', 'noopener,noreferrer')
      setActionStatus(`Opened :${port}`)
    } catch {
      window.open('http://localhost:3001', '_blank', 'noopener,noreferrer')
      setActionStatus('Opened :3001')
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
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-white truncate">
              {project.projectName}
            </h3>
            {analysis?.primaryTechStack && (
              <span className="shrink-0 text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/[0.04] text-white/70">
                {analysis.primaryTechStack}
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 truncate mt-1 font-mono">
            {project.absolutePath}
          </p>
          {analysis?.executiveSummary && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-wider text-white/30">Vision Summary</div>
              <p className="text-xs text-white/60 mt-1 line-clamp-3">
                {analysis.executiveSummary}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
        <ActionButton onClick={handleLaunch} icon="🚀" label="Launch" color="emerald" />
        <ActionButton onClick={handlePulse} icon="💓" label="Pulse" color="cyan" />
        <ActionButton onClick={handleTerminal} icon="🐚" label="Terminal" color="purple" />
        <ActionButton onClick={handleOpenBrowser} icon="🌐" label="Open Browser" color="gold" />
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
    gold: 'hover:bg-[#d4af37]/15 hover:border-[#d4af37]/40 hover:text-[#d4af37]',
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
