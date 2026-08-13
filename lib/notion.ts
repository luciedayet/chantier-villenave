import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import type { Purchase, Task } from './types'

export const notion = new Client({ auth: process.env.NOTION_API_KEY })
export const DATABASE_ID = process.env.NOTION_DATABASE_ID!

export type { Purchase, Task } from './types'

function richText(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (p?.type !== 'rich_text') return ''
  return p.rich_text.map(t => t.plain_text).join('')
}

function title(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop]
  if (p?.type !== 'title') return ''
  return p.title.map(t => t.plain_text).join('')
}

export function pageToTask(page: PageObjectResponse): Task {
  const purchasesRaw = richText(page, 'Purchases JSON')
  let purchases: Purchase[] = []
  try { purchases = purchasesRaw ? JSON.parse(purchasesRaw) : [] } catch { purchases = [] }

  const assigneesProp = page.properties['Assignees']
  const assignees = assigneesProp?.type === 'multi_select'
    ? assigneesProp.multi_select.map(o => o.name)
    : []

  const doneProp = page.properties['Done']
  const done = doneProp?.type === 'checkbox' ? doneProp.checkbox : false

  const blockedProp = page.properties['Blocked by']
  const blocked_by_ids = blockedProp?.type === 'relation'
    ? blockedProp.relation.map(r => r.id)
    : []

  return {
    id: page.id,
    app: richText(page, 'App'),
    room: richText(page, 'Room'),
    cat: richText(page, 'Category'),
    label: title(page, 'Name'),
    blocked_by_ids,
    assignees,
    purchases,
    done,
  }
}

export function taskToProperties(task: Partial<Omit<Task, 'id'>>): Record<string, any> {
  const props: Record<string, any> = {}
  if (task.label !== undefined) props['Name'] = { title: [{ text: { content: task.label } }] }
  if (task.app !== undefined) props['App'] = { rich_text: [{ text: { content: task.app } }] }
  if (task.room !== undefined) props['Room'] = { rich_text: [{ text: { content: task.room } }] }
  if (task.cat !== undefined) props['Category'] = { rich_text: [{ text: { content: task.cat } }] }
  if (task.done !== undefined) props['Done'] = { checkbox: task.done }
  if (task.assignees !== undefined) props['Assignees'] = { multi_select: task.assignees.map(name => ({ name })) }
  if (task.purchases !== undefined) props['Purchases JSON'] = { rich_text: [{ text: { content: JSON.stringify(task.purchases) } }] }
  if (task.blocked_by_ids !== undefined) props['Blocked by'] = { relation: task.blocked_by_ids.map(id => ({ id })) }
  return props
}

export async function seedDatabase(): Promise<Task[]> {
  const { SEED_TASKS } = await import('./seedTasks')
  const ids: string[] = []

  for (const st of SEED_TASKS) {
    const page = await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties: taskToProperties({
        app: st.app, room: st.room, cat: st.cat, label: st.label,
        assignees: st.assignees, purchases: st.purchases, done: false,
      }),
    })
    ids.push(page.id)
  }

  for (let i = 0; i < SEED_TASKS.length; i++) {
    const st = SEED_TASKS[i]
    if (!st.blockedByLabels.length) continue
    const blocked_by_ids = st.blockedByLabels
      .map(label => {
        const idx = SEED_TASKS.findIndex(other => other.label === label && other.app === st.app)
        return idx >= 0 ? ids[idx] : null
      })
      .filter((x): x is string => Boolean(x))
    if (!blocked_by_ids.length) continue
    await notion.pages.update({
      page_id: ids[i],
      properties: taskToProperties({ blocked_by_ids }),
    })
  }

  return queryAllTasks()
}

export async function queryAllTasks(): Promise<Task[]> {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined
  do {
    const res = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: 100,
    })
    pages.push(...(res.results as PageObjectResponse[]))
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return pages.map(pageToTask)
}
