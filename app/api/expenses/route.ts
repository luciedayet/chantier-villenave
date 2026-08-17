import { NextResponse } from 'next/server'
import { notion } from '@/lib/notion'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const EXPENSES_DB_ID = process.env.NOTION_EXPENSES_DATABASE_ID!

export type Expense = {
  id: string
  nom: string
  prixUnitaire: number | null
  quantite: number | null
  total: number
  poste: string[]
  piece: string | null
  magasin: string | null
  payeur: string | null
  rembourse: boolean
  rendu: number | null
  date: string | null
}

function str(page: PageObjectResponse, key: string): string {
  const p = page.properties[key]
  if (!p) return ''
  if (p.type === 'title') return p.title.map(t => t.plain_text).join('')
  if (p.type === 'rich_text') return p.rich_text.map(t => t.plain_text).join('')
  return ''
}
function num(page: PageObjectResponse, key: string): number | null {
  const p = page.properties[key]
  if (p?.type === 'number') return p.number
  return null
}
function sel(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  if (p?.type === 'select') return p.select?.name ?? null
  if (p?.type === 'status') return p.status?.name ?? null
  return null
}
function multiSel(page: PageObjectResponse, key: string): string[] {
  const p = page.properties[key]
  if (p?.type === 'multi_select') return p.multi_select.map(o => o.name)
  return []
}
function check(page: PageObjectResponse, key: string): boolean {
  const p = page.properties[key]
  return p?.type === 'checkbox' ? p.checkbox : false
}
function date(page: PageObjectResponse, key: string): string | null {
  const p = page.properties[key]
  return p?.type === 'date' ? (p.date?.start ?? null) : null
}
function formula(page: PageObjectResponse, key: string): number | null {
  const p = page.properties[key]
  if (p?.type === 'formula' && p.formula.type === 'number') return p.formula.number
  return null
}

function pageToExpense(page: PageObjectResponse): Expense {
  const prixUnitaire = num(page, 'Prix unitaire')
  const quantite = num(page, 'Quantité')
  const formulaTotal = formula(page, 'Total')
  const total = formulaTotal ?? ((prixUnitaire ?? 0) * (quantite ?? 1))
  return {
    id: page.id,
    nom: str(page, 'Nom'),
    prixUnitaire,
    quantite,
    total,
    poste: multiSel(page, 'Poste'),
    piece: sel(page, 'Pièce'),
    magasin: sel(page, 'Magasin'),
    payeur: sel(page, 'Payeur'),
    rembourse: check(page, 'Remboursé'),
    rendu: num(page, 'Rendu'),
    date: date(page, 'Achat'),
  }
}

export async function GET() {
  if (!EXPENSES_DB_ID) {
    return NextResponse.json({ error: 'NOTION_EXPENSES_DATABASE_ID not configured' }, { status: 500 })
  }
  try {
    const pages: PageObjectResponse[] = []
    let cursor: string | undefined
    do {
      const res = await notion.databases.query({
        database_id: EXPENSES_DB_ID,
        start_cursor: cursor,
        page_size: 100,
      })
      pages.push(...(res.results as PageObjectResponse[]))
      cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
    } while (cursor)
    return NextResponse.json({ data: pages.map(pageToExpense) })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
