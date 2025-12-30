'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase, type Project, type Task } from '@/lib/supabase'
import { ProjectCard } from '@/components/ProjectCard'
import { type LocalProject } from '@/lib/registry'

export default function Palace() {
  const [view, setView] = useState<'entry' | 'local' | string>('entry')
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [localProjects, setLocalProjects] = useState<LocalProject[]>([])
  const [time, setTime] = useState('')
  const [selectedTask, setSelectedTask] = useState('')
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    loadData()
    loadLocalProjects()
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  function updateTime() {
    const now = new Date()
    setTime(now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }))
  }

  async function loadData() {
    const [projectsResult, tasksResult] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'active').order('priority_score', { ascending: false }),
      supabase.from('tasks').select('*').eq('completed', false).limit(10)
    ])
    
    if (projectsResult.data) setProjects(projectsResult.data)
    if (tasksResult.data) setTasks(tasksResult.data)
  }

  async function loadLocalProjects() {
    try {
      const res = await fetch('/api/local/projects')
      const data = await res.json()
      if (data.projects) setLocalProjects(data.projects)
    } catch (err) {
      console.error('Failed to load local projects:', err)
    }
  }

  function spinWheel() {
    if (tasks.length === 0) return
    setSpinning(true)
    setSelectedTask('Spinning...')
    setTimeout(() => {
      const task = tasks[Math.floor(Math.random() * tasks.length)]
      setSelectedTask(`${task.description} (${task.estimated_minutes} min)`)
      setSpinning(false)
    }, 1000)
  }

  const rooms = [
    { id: 'art', name: 'Art Gallery', icon: '🎨' },
    { id: 'minerva', name: 'Minerva Office', icon: '🎓' },
    { id: 'startup', name: 'Startup Lab', icon: '🚀' },
    { id: 'jobhunt', name: 'Job Hunt', icon: '💼' },
    { id: 'vault', name: 'The Vault', icon: '💰' }
  ]

  if (view === 'local') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-8">
        <button onClick={() => setView('entry')} className="text-white mb-8 hover:text-[#d4af37] transition">← Back to Palace</button>
        <h1 className="text-5xl font-bold text-white mb-2">Local Ecosystem</h1>
        <p className="text-white/50 mb-8">Virtual Linkage to ~/Desktop projects</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {localProjects.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    )
  }

  if (view !== 'entry') {
    const roomProjects = projects.filter(p => p.room === view)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-8">
        <button onClick={() => setView('entry')} className="text-white mb-8 hover:text-[#d4af37] transition">← Back</button>
        <h1 className="text-5xl font-bold text-white mb-8">{rooms.find(r => r.id === view)?.name}</h1>
        <div className="space-y-4">
          {roomProjects.map(p => (
            <div key={p.id} className="bg-white/5 p-6 rounded-2xl text-white" style={{ opacity: 1 - (p.mist_opacity * 0.5) }}>
              <h3 className="text-2xl font-semibold text-[#d4af37]">{p.name}</h3>
              <p className="text-white/70 mt-2">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] p-8">
      <header className="text-center py-12 border-b border-white/10 mb-12">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-[#e8eef3] to-[#d4af37] bg-clip-text text-transparent">THE PALACE</h1>
        <p className="text-[#e8eef3]/70 uppercase tracking-wider text-sm mt-2">Your Living Command Center</p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8">
          <div className="text-5xl text-white text-center mb-8">{time}</div>
          
          <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 border-l-4 border-[#d4af37] p-6 rounded-lg mb-8">
            <p className="text-xl italic text-white/90">"The secret of getting ahead is getting started."</p>
            <p className="text-right text-[#d4af37] font-semibold mt-2">— Mark Twain</p>
          </div>

          <div className="text-center mb-8">
            <button onClick={spinWheel} disabled={spinning} className="w-44 h-44 rounded-full bg-gradient-to-br from-[#d4af37] to-yellow-600 flex items-center justify-center text-black font-bold text-sm uppercase mx-auto mb-4">
              SPIN<br/>THE<br/>WHEEL
            </button>
            {selectedTask && <div className="text-[#d4af37] text-lg bg-[#d4af37]/10 rounded-lg p-4">{selectedTask}</div>}
          </div>

          <h2 className="text-2xl font-semibold text-white mb-4">Today's Focus</h2>
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => (
              <div key={task.id} className="bg-white/5 p-4 rounded-xl border-l-4 border-[#d4af37] text-white">
                {task.description}
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white mb-6">Enter a Room</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rooms.map(room => (
            <button key={room.id} onClick={() => setView(room.id)} className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 text-left hover:border-[#d4af37]/30 transition">
              <div className="text-4xl mb-3">{room.icon}</div>
              <h3 className="text-xl font-semibold text-white">{room.name}</h3>
            </button>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <h2 className="text-2xl font-semibold text-white mb-6">Local Ecosystem</h2>
          <button 
            onClick={() => setView('local')} 
            className="w-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-6 text-left hover:border-emerald-400/40 transition group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl mb-3">🖥️</div>
                <h3 className="text-xl font-semibold text-white">Desktop Projects</h3>
                <p className="text-white/50 text-sm mt-1">{localProjects.length} projects indexed via Virtual Linkage</p>
              </div>
              <div className="text-emerald-400 group-hover:translate-x-1 transition-transform">→</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
