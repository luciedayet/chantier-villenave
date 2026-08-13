import { NextRequest, NextResponse } from 'next/server'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { notion, pageToTask, taskToProperties } from '@/lib/notion'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const page = await notion.pages.update({
      page_id: id,
      properties: taskToProperties(body),
    })
    return NextResponse.json({ data: pageToTask(page as PageObjectResponse) })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    await notion.pages.update({ page_id: id, archived: true })
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
