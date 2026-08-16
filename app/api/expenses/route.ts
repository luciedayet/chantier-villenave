import { NextResponse } from 'next/server'
import { notion } from '@/lib/notion'
import type { PageObjectResponse, DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const EXPENSES_DB_ID = process.env.NOTION_EXPENSES_DATABASE_ID!

function extractPropValue(prop: any): any {
  if (!prop) return null
  switch (prop.type) {
    case 'title': return prop.title.map((t: any) => t.plain_text).join('')
    case 'rich_text': return prop.rich_text.map((t: any) => t.plain_text).join('')
    case 'number': return prop.number
    case 'select': return prop.select?.name ?? null
    case 'multi_select': return prop.multi_select.map((o: any) => o.name)
    case 'date': return prop.date?.start ?? null
    case 'checkbox': return prop.checkbox
    case 'url': return prop.url
    case 'email': return prop.email
    case 'phone_number': return prop.phone_number
    case 'formula': {
      const f = prop.formula
      if (f.type === 'number') return f.number
      if (f.type === 'string') return f.string
      if (f.type === 'boolean') return f.boolean
      return null
    }
    case 'rollup': {
      const r = prop.rollup
      if (r.type === 'number') return r.number
      if (r.type === 'array') return r.array.map((item: any) => extractPropValue(item))
      return null
    }
    case 'relation': return prop.relation.map((r: any) => r.id)
    case 'people': return prop.people.map((p: any) => p.name ?? p.id)
    case 'files': return prop.files.map((f: any) => f.name)
    case 'status': return prop.status?.name ?? null
    default: return null
  }
}

export async function GET() {
  if (!EXPENSES_DB_ID) {
    return NextResponse.json({ error: 'NOTION_EXPENSES_DATABASE_ID not configured' }, { status: 500 })
  }
  try {
    const [db, pages] = await Promise.all([
      notion.databases.retrieve({ database_id: EXPENSES_DB_ID }) as Promise<DatabaseObjectResponse>,
      (async () => {
        const all: PageObjectResponse[] = []
        let cursor: string | undefined
        do {
          const res = await notion.databases.query({
            database_id: EXPENSES_DB_ID,
            start_cursor: cursor,
            page_size: 100,
          })
          all.push(...(res.results as PageObjectResponse[]))
          cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
        } while (cursor)
        return all
      })(),
    ])

    const schema: Record<string, string> = {}
    for (const [key, prop] of Object.entries(db.properties)) {
      schema[key] = prop.type
    }

    const entries = pages.map(page => {
      const props: Record<string, any> = {}
      for (const [key, prop] of Object.entries(page.properties)) {
        props[key] = extractPropValue(prop)
      }
      return { id: page.id, props }
    })

    return NextResponse.json({ data: entries, schema })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
