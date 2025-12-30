'use client'

import { motion } from 'framer-motion'
import { type LocalProject, getMistOpacity } from '@/lib/registry'

type ProjectCardProps = {
  project: LocalProject
  onClick?: () => void
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const mistOpacity = getMistOpacity(project.lastModified)
  const isActive = mistOpacity < 0.3

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

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1 - mistOpacity, y: 0 }}
      whileHover={{ scale: 1.02, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={`
        relative overflow-hidden rounded-2xl p-6 cursor-pointer
        bg-white/[0.03] border border-white/10
        hover:border-[#d4af37]/40 transition-colors
        ${isActive ? 'ring-1 ring-[#d4af37]/20' : ''}
      `}
      style={{
        filter: `blur(${mistOpacity * 2}px)`,
      }}
    >
      {isActive && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      )}

      <div className="flex items-start gap-4">
        <div className="text-3xl">{typeIcons[project.projectType]}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white truncate">
            {project.projectName}
          </h3>
          <p className="text-sm text-white/50 truncate mt-1">
            {project.absolutePath}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-white/40">{timeSince()}</span>
            {project.hasGit && (
              <span className="text-xs text-[#d4af37]/60 flex items-center gap-1">
                <GitIcon /> Git
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 to-transparent"
        style={{ opacity: mistOpacity }}
      />
    </motion.div>
  )
}

function GitIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
