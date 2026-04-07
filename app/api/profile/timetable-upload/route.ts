import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { getCurrentUser } from '@/lib/auth'

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

function sanitizeFileName(input: string): string {
  return input
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase()
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PDF, PNG, JPG, and WEBP are allowed' }, { status: 400 })
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json({ error: 'File is too large. Max size is 10MB.' }, { status: 400 })
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'timetables')
    await mkdir(uploadsDir, { recursive: true })

    const safeOriginalName = sanitizeFileName(file.name || 'timetable')
    const uniqueName = `${user.id}-${Date.now()}-${safeOriginalName}`
    const filePath = path.join(uploadsDir, uniqueName)

    const arrayBuffer = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(arrayBuffer))

    return NextResponse.json({ url: `/uploads/timetables/${uniqueName}` })
  } catch (error) {
    console.error('Timetable upload error:', error)
    return NextResponse.json({ error: 'Failed to upload timetable' }, { status: 500 })
  }
}
