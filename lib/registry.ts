export type LocalProject = {
  id: string
  projectName: string
  absolutePath: string
  lastModified: number
  lastModifiedISO: string
  projectType: 'node' | 'python' | 'git-only' | 'unknown'
  hasGit: boolean
}

export const localProjects: LocalProject[] = [
  {
    id: 'the-palace',
    projectName: 'The Palace',
    absolutePath: '/Users/bashar/Desktop/the-palace',
    lastModified: 1767042356,
    lastModifiedISO: '2024-12-29T05:25:56.000Z',
    projectType: 'node',
    hasGit: true,
  },
  {
    id: 'curatorialframework',
    projectName: 'Curatorial Framework',
    absolutePath: '/Users/bashar/Desktop/curatorialframework',
    lastModified: 1767055326,
    lastModifiedISO: '2024-12-29T09:02:06.000Z',
    projectType: 'python',
    hasGit: true,
  },
  {
    id: 'google-maps-downloader',
    projectName: 'Google Maps Downloader',
    absolutePath: '/Users/bashar/Desktop/google-maps-downloader-main',
    lastModified: 1766353393,
    lastModifiedISO: '2024-12-21T10:03:13.000Z',
    projectType: 'node',
    hasGit: false,
  },
  {
    id: 'anti-apathy-portal',
    projectName: 'Anti-Apathy Portal',
    absolutePath: '/Users/bashar/Desktop/anti-apathy-portal-final',
    lastModified: 1767055300,
    lastModifiedISO: '2024-12-29T09:01:40.000Z',
    projectType: 'git-only',
    hasGit: true,
  },
  {
    id: 'crust-never-sleeps',
    projectName: 'Crust Never Sleeps',
    absolutePath: '/Users/bashar/Desktop/crust-never-sleeps-main',
    lastModified: 1766355125,
    lastModifiedISO: '2024-12-21T10:32:05.000Z',
    projectType: 'node',
    hasGit: false,
  },
  {
    id: 'palace-v1',
    projectName: 'Palace V1',
    absolutePath: '/Users/bashar/Desktop/palace-v1',
    lastModified: 1767052506,
    lastModifiedISO: '2024-12-29T08:15:06.000Z',
    projectType: 'node',
    hasGit: true,
  },
  {
    id: 'nordiqflow',
    projectName: 'NordiqFlow',
    absolutePath: '/Users/bashar/Desktop/nordiqflow',
    lastModified: 1766539386,
    lastModifiedISO: '2024-12-23T13:43:06.000Z',
    projectType: 'python',
    hasGit: true,
  },
  {
    id: 'konditori-cecil',
    projectName: 'Konditori Cecil Vetlanda Website',
    absolutePath: '/Users/bashar/Desktop/Konditori-Cecil-Vetlanda-Website',
    lastModified: 1766355579,
    lastModifiedISO: '2024-12-21T10:39:39.000Z',
    projectType: 'node',
    hasGit: false,
  },
]

export function getProjectById(id: string): LocalProject | undefined {
  return localProjects.find(p => p.id === id)
}

export function getActiveProjects(thresholdDays: number = 7): LocalProject[] {
  const now = Date.now() / 1000
  const threshold = now - (thresholdDays * 24 * 60 * 60)
  return localProjects.filter(p => p.lastModified > threshold)
}

export function getMistOpacity(lastModified: number): number {
  const now = Date.now() / 1000
  const daysSinceActivity = (now - lastModified) / (24 * 60 * 60)
  return Math.min(daysSinceActivity / 14, 0.8)
}
