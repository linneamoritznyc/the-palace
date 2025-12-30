import { NextResponse } from 'next/server'
import { localProjects, getActiveProjects, getMistOpacity } from '@/lib/registry'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const activeOnly = searchParams.get('active') === 'true'
  const thresholdDays = parseInt(searchParams.get('threshold') || '7', 10)

  const projects = activeOnly 
    ? getActiveProjects(thresholdDays)
    : localProjects

  const enrichedProjects = projects.map(project => ({
    ...project,
    mistOpacity: getMistOpacity(project.lastModified),
    isActive: getMistOpacity(project.lastModified) < 0.3,
  }))

  return NextResponse.json({
    success: true,
    count: enrichedProjects.length,
    projects: enrichedProjects,
    meta: {
      scanPath: '~/Desktop',
      lastScanned: new Date().toISOString(),
    },
  })
}
