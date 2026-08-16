export type Purchase = { name: string; price: number | null; url?: string | null }

export type Task = {
  id: string
  app: string
  room: string
  cat: string
  label: string
  blocked_by_ids: string[]
  assignees: string[]
  purchases: Purchase[]
  done: boolean
}
