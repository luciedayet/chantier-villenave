import { NextRequest, NextResponse } from 'next/server'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { notion, DATABASE_ID, queryAllTasks, pageToTask, taskToProperties, seedDatabase } from '@/lib/notion'

export async function GET() {
  try {
    const tasks = await queryAllTasks()
    const data = tasks.length === 0 ? await seedDatabase() : tasks
    return NextResponse.json({ data })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const page = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: taskToProperties(body),
    })
    return NextResponse.json({ data: pageToTask(page as PageObjectResponse) })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
