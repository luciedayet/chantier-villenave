'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task } from '@/lib/types'

// ── Constants ──────────────────────────────────────────────────────────────────
const TEAM = ['Pierre', 'Anaïs', 'Lucie', 'Thibault', 'Armelle']
const CAT_ICONS: Record<string, string> = {
  'Fenêtre': '🪟', 'Électricité': '⚡', 'Peinture': '🎨', 'Finitions': '✨',
  'Placage': '🧱', 'Enduit': '🪣', 'Sol': '🔲', 'Entrée': '🚪',
  'Eau': '💧', 'Meubles': '🛋', 'Douche': '🚿', 'default': '📋',
}
function getCatIcon(cat: string) {
  for (const [k, v] of Object.entries(CAT_ICONS))
    if (cat.toLowerCase().includes(k.toLowerCase())) return v
  return CAT_ICONS.default
}
function escHtml(s: string) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Types ──────────────────────────────────────────────────────────────────────
type Purchase = { name: string; price: number | null; url?: string | null }
function normalizeUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}
type AppTask = Omit<Task, 'blocked_by_ids'> & { blockedByIds: string[] }

async function api<T>(url: string, init?: RequestInit): Promise<{ data?: T; error?: string }> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    return { error: body.error || res.statusText }
  }
  return res.json()
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ChantierApp() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [apps, setApps] = useState<string[]>(['App 1', 'App 2', 'App 3', 'Extérieur'])
  const [currentApp, setCurrentApp] = useState('App 1')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [taskSort, setTaskSort] = useState<'default' | 'assignee'>('default')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; id: number } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modal state
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  // Add form
  const [addApp, setAddApp] = useState('App 1')
  const [addRoom, setAddRoom] = useState('')
  const [addCat, setAddCat] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addBlockedIds, setAddBlockedIds] = useState<string[]>([])
  const [addAssignees, setAddAssignees] = useState<string[]>([])
  const [addPurchases, setAddPurchases] = useState<Purchase[]>([])

  // Edit form
  const [editLabel, setEditLabel] = useState('')
  const [editBlockedIds, setEditBlockedIds] = useState<string[]>([])
  const [editAssignees, setEditAssignees] = useState<string[]>([])
  const [editPurchases, setEditPurchases] = useState<Purchase[]>([])

  // Picker dropdowns open state
  const [openPicker, setOpenPicker] = useState<string | null>(null)

  // Vue Achats
  const [view, setView] = useState<'tasks' | 'purchases' | 'expenses'>('tasks')
  const [purchFilterApp, setPurchFilterApp] = useState('Tous')
  const [purchFilterRoom, setPurchFilterRoom] = useState('Toutes')
  const [purchFilterCat, setPurchFilterCat] = useState('Toutes')
  const [purchSort, setPurchSort] = useState<'room' | 'cat' | 'app' | 'name' | 'price-asc' | 'price-desc'>('room')

  // Vue Dépenses
  type ExpenseEntry = { id: string; props: Record<string, any> }
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([])
  const [expSchema, setExpSchema] = useState<Record<string, string>>({})
  const [expLoading, setExpLoading] = useState(false)
  const [expLoaded, setExpLoaded] = useState(false)
  const [expFilterPoste, setExpFilterPoste] = useState('Tous')
  const [expFilterApp, setExpFilterApp] = useState('Tous')
  const [expSort, setExpSort] = useState<'poste' | 'app' | 'name' | 'amount-asc' | 'amount-desc'>('amount-desc')

  // Sélection multiple (appui long) + blocage groupé
  const [selectMode, setSelectMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bulkBlockModal, setBulkBlockModal] = useState(false)
  const [bulkBlockIds, setBulkBlockIds] = useState<string[]>([])
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  // Ferme le picker au clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!(e.target as Element).closest('.picker-wrap')) {
        setOpenPicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Load / Seed ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    if (view === 'expenses') loadExpenses()
  }, [view])

  async function loadTasks() {
    setLoading(true)
    const { data, error } = await api<Task[]>('/api/tasks')
    if (error || !data) { console.error(error); setLoading(false); return }
    setTasks(data)
    const uniqueApps = [...new Set([...['App 1', 'App 2', 'App 3', 'Extérieur'], ...data.map(t => t.app)])]
    setApps(uniqueApps)
    setLoading(false)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function isBlocked(task: Task) {
    if (!task.blocked_by_ids?.length) return false
    return task.blocked_by_ids.some(depId => {
      const dep = tasks.find(t => t.id === depId)
      return dep && !dep.done
    })
  }

  function getBlockingLabels(task: Task) {
    return (task.blocked_by_ids || []).map(depId => {
      const dep = tasks.find(t => t.id === depId)
      return dep ? { label: dep.label, done: dep.done } : null
    }).filter(Boolean) as { label: string; done: boolean }[]
  }

  function getAppTasks(app: string) { return tasks.filter(t => t.app === app) }
  function getRooms(app: string) {
    const seen = new Set<string>()
    return tasks.filter(t => t.app === app && !seen.has(t.room) && seen.add(t.room)).map(t => t.room)
  }
  function getCats(app: string, room: string) {
    const seen = new Set<string>()
    return tasks.filter(t => t.app === app && t.room === room && !seen.has(t.cat) && seen.add(t.cat)).map(t => t.cat)
  }
  function matchesFilter(f: string, task: Task) {
    if (f === 'done') return task.done
    if (f === 'blocked') return isBlocked(task) && !task.done
    if (f === 'todo') return !task.done && !isBlocked(task)
    return true
  }
  function filterTask(task: Task) {
    if (activeFilters.length === 0) return true
    return activeFilters.some(f => matchesFilter(f, task))
  }
  function toggleFilter(f: string) {
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function toggleTask(id: string) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (isBlocked(task) && !task.done) {
      showToast("⛔ Tâche bloquée — terminez les dépendances d'abord")
      return
    }
    const newDone = !task.done
    const { error } = await api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ done: newDone }) })
    if (error) { console.error(error); return }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: newDone } : t))
    showToast(newDone ? '✓ Tâche terminée !' : 'Tâche rouverte')
  }

  async function addTask() {
    if (!addLabel.trim()) return
    const newTask = {
      app: addApp,
      room: addRoom || getRooms(addApp)[0] || 'Chambre',
      cat: addCat || 'Autre',
      label: addLabel.trim(),
      blocked_by_ids: addBlockedIds,
      assignees: addAssignees,
      purchases: addPurchases,
      done: false,
    }
    const { data, error } = await api<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(newTask) })
    if (error || !data) { console.error(error); return }
    setTasks(prev => [...prev, data])
    setAddModal(false)
    setCurrentApp(addApp)
    showToast('✓ Tâche ajoutée')
  }

  async function saveEdit() {
    if (!editTask || !editLabel.trim()) return
    const updates = {
      label: editLabel.trim(),
      blocked_by_ids: editBlockedIds,
      assignees: editAssignees,
      purchases: editPurchases,
    }
    const { error } = await api(`/api/tasks/${editTask.id}`, { method: 'PATCH', body: JSON.stringify(updates) })
    if (error) { console.error(error); return }
    setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...updates } : t))
    setEditModal(false)
    showToast('✓ Tâche modifiée')
  }

  async function deleteTask(id: string) {
    if (!confirm('Supprimer cette tâche ?')) return
    const { error } = await api(`/api/tasks/${id}`, { method: 'DELETE' })
    if (error) { console.error(error); return }
    // Remove from blockedByIds of other tasks
    const affected = tasks.filter(t => t.blocked_by_ids?.includes(id))
    for (const t of affected) {
      const newIds = t.blocked_by_ids.filter(bid => bid !== id)
      await api(`/api/tasks/${t.id}`, { method: 'PATCH', body: JSON.stringify({ blocked_by_ids: newIds }) })
    }
    setTasks(prev => prev
      .filter(t => t.id !== id)
      .map(t => ({ ...t, blocked_by_ids: (t.blocked_by_ids || []).filter(bid => bid !== id) }))
    )
    setEditModal(false)
    showToast('Tâche supprimée')
  }

  // ── Open modals ──────────────────────────────────────────────────────────────
  function openAdd(room?: string, cat?: string) {
    const targetRoom = room || getRooms(currentApp)[0] || 'Chambre'
    setAddApp(currentApp)
    setAddRoom(targetRoom)
    setAddCat(cat || getCats(currentApp, targetRoom)[0] || 'Autre')
    setAddLabel('')
    setAddBlockedIds([])
    setAddAssignees([])
    setAddPurchases([])
    setAddModal(true)
  }

  function openEdit(task: Task) {
    setEditTask(task)
    setEditLabel(task.label)
    setEditBlockedIds(task.blocked_by_ids || [])
    setEditAssignees(task.assignees || [])
    setEditPurchases(task.purchases || [])
    setEditModal(true)
  }

  // ── Sélection multiple (appui long) ─────────────────────────────────────────
  function startLongPress(id: string) {
    longPressTriggered.current = false
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      setSelectMode(true)
      setSelectedTaskIds(prev => prev.includes(id) ? prev : [...prev, id])
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(15)
    }, 500)
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }
  function toggleTaskSelection(id: string) {
    setSelectedTaskIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      if (next.length === 0) setSelectMode(false)
      return next
    })
  }
  function handleTaskClick(task: Task) {
    if (longPressTriggered.current) { longPressTriggered.current = false; return }
    if (selectMode) { toggleTaskSelection(task.id); return }
    openEdit(task)
  }
  function exitSelectMode() {
    setSelectMode(false)
    setSelectedTaskIds([])
  }

  function toggleView() {
    exitSelectMode()
    setOpenPicker(null)
    setView(v => {
      if (v === 'tasks') return 'purchases'
      if (v === 'purchases') return 'expenses'
      return 'tasks'
    })
  }

  async function loadExpenses() {
    if (expLoaded) return
    setExpLoading(true)
    try {
      const res = await fetch('/api/expenses')
      const json = await res.json()
      if (json.data) {
        setExpenses(json.data)
        setExpSchema(json.schema || {})
        setExpLoaded(true)
      }
    } catch (e) { console.error(e) }
    setExpLoading(false)
  }

  function openBulkBlock() {
    setBulkBlockIds([])
    setBulkBlockModal(true)
  }

  async function applyBulkBlock() {
    const targets = tasks.filter(t => selectedTaskIds.includes(t.id))
    const updates = targets.map(t => ({
      id: t.id,
      blocked_by_ids: [...new Set([...(t.blocked_by_ids || []), ...bulkBlockIds])].filter(id => id !== t.id),
    }))
    for (const u of updates) {
      await api(`/api/tasks/${u.id}`, { method: 'PATCH', body: JSON.stringify({ blocked_by_ids: u.blocked_by_ids }) })
    }
    setTasks(prev => prev.map(t => {
      const u = updates.find(x => x.id === t.id)
      return u ? { ...t, blocked_by_ids: u.blocked_by_ids } : t
    }))
    setBulkBlockModal(false)
    exitSelectMode()
    showToast(`✓ Dépendance ajoutée à ${updates.length} tâche${updates.length > 1 ? 's' : ''}`)
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const statDone = tasks.filter(t => t.done).length
  const statTotal = tasks.length
  const statBlocked = tasks.filter(t => isBlocked(t) && !t.done).length

  // ── Picker helpers ───────────────────────────────────────────────────────────
  function toggleBlockedId(id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleAssignee(name: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
  }

  function renderTaskRow(task: Task, key: string) {
    const blocked = isBlocked(task)
    const blockingLabels = getBlockingLabels(task)
    const blockedPending = blockingLabels.filter(b => !b.done)
    const blockedOk = blockingLabels.filter(b => b.done)
    const isSelected = selectedTaskIds.includes(task.id)
    return (
      <div
        key={key}
        className={`task${task.done ? ' done' : blocked ? ' blocked' : ''}${isSelected ? ' selected' : ''}`}
        onClick={() => handleTaskClick(task)}
        onMouseDown={() => startLongPress(task.id)}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={() => startLongPress(task.id)}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
      >
        <button className="task-check" onClick={e => { e.stopPropagation(); selectMode ? toggleTaskSelection(task.id) : toggleTask(task.id) }}>
          <span className="checkmark">✓</span>
        </button>
        <div className="task-body">
          <div className="task-label">{task.label}</div>
          <div className="task-meta">
            {blockedPending.length > 0 && <span className="badge badge-blocked">🔒 {blockedPending.map(b => b.label).join(', ')}</span>}
            {blockedOk.length > 0 && blockedPending.length === 0 && blockingLabels.length > 0 && <span className="badge badge-ok">✓ Dépendances OK</span>}
            {(task.assignees || []).map(a => <span key={a} className="badge badge-person">👷 {a}</span>)}
            {(task.purchases || []).length > 0 && (() => {
              const total = (task.purchases || []).reduce((s, p) => s + (p.price || 0), 0)
              return <span className="badge badge-shop">🛒 {task.purchases.length} achat{task.purchases.length > 1 ? 's' : ''}{total > 0 ? ` · ${total.toFixed(0)} €` : ''}</span>
            })()}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F4F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A6275', fontFamily: 'system-ui' }}>
      Chargement…
    </div>
  )

  const rooms = getRooms(currentApp)
  const allRoomOptions = [...new Set([...rooms, 'Chambre', 'Salon', 'Cuisine', 'Salle de bain', 'Entrée', 'Couloir'])]
  const allCatOptions = [...new Set([...getCats(addApp, addRoom), 'Électricité', 'Peinture', 'Enduit', 'Sol', 'Eau', 'Meubles', 'Finitions', 'Douche', 'Autre'])]
  const addTaskOptions = tasks.filter(t => t.app === addApp && t.room === addRoom)
  const editTaskOptions = editTask ? tasks.filter(t => t.app === editTask.app && t.room === editTask.room && t.id !== editTask.id) : []
  const selectedTasksList = tasks.filter(t => selectedTaskIds.includes(t.id))
  const bulkCommonRoom = selectedTasksList.length > 0 && selectedTasksList.every(t => t.room === selectedTasksList[0].room) ? selectedTasksList[0].room : null
  const bulkBlockOptions = tasks.filter(t => t.app === currentApp && (bulkCommonRoom ? t.room === bulkCommonRoom : true) && !selectedTaskIds.includes(t.id))

  // ── Tri par assignation ──────────────────────────────────────────────────────
  const currentAppTasks = tasks.filter(t => t.app === currentApp).filter(filterTask)
  const assigneeGroups: Record<string, Task[]> = {}
  for (const t of currentAppTasks) {
    const people = (t.assignees && t.assignees.length) ? t.assignees : ['Non assigné']
    for (const person of people) {
      (assigneeGroups[person] ||= []).push(t)
    }
  }
  const assigneeNames = Object.keys(assigneeGroups).sort((a, b) => {
    if (a === 'Non assigné') return 1
    if (b === 'Non assigné') return -1
    return a.localeCompare(b)
  })

  // ── Vue Achats : lignes à plat + filtres/tri ────────────────────────────────
  const allPurchaseRows = tasks.flatMap(t => (t.purchases || []).map((p, i) => ({
    key: `${t.id}-${i}`, task: t, app: t.app, room: t.room, cat: t.cat, name: p.name, price: p.price, url: p.url,
  })))
  const purchApps = [...new Set(allPurchaseRows.map(r => r.app))]
  const purchRoomsForApp = [...new Set(allPurchaseRows.filter(r => purchFilterApp === 'Tous' || r.app === purchFilterApp).map(r => r.room))]
  const purchCatsForRoom = [...new Set(allPurchaseRows.filter(r =>
    (purchFilterApp === 'Tous' || r.app === purchFilterApp) && (purchFilterRoom === 'Toutes' || r.room === purchFilterRoom)
  ).map(r => r.cat))]
  const filteredPurchases = allPurchaseRows.filter(r =>
    (purchFilterApp === 'Tous' || r.app === purchFilterApp) &&
    (purchFilterRoom === 'Toutes' || r.room === purchFilterRoom) &&
    (purchFilterCat === 'Toutes' || r.cat === purchFilterCat)
  ).sort((a, b) => {
    if (purchSort === 'app') return a.app.localeCompare(b.app) || a.room.localeCompare(b.room)
    if (purchSort === 'room') return a.room.localeCompare(b.room) || a.cat.localeCompare(b.cat)
    if (purchSort === 'cat') return a.cat.localeCompare(b.cat) || a.room.localeCompare(b.room)
    if (purchSort === 'name') return a.name.localeCompare(b.name)
    if (purchSort === 'price-asc') return (a.price ?? 0) - (b.price ?? 0)
    if (purchSort === 'price-desc') return (b.price ?? 0) - (a.price ?? 0)
    return 0
  })
  const purchasesTotal = filteredPurchases.reduce((s, r) => s + (r.price || 0), 0)

  // ── Vue Dépenses : détection des propriétés ──────────────────────────────────
  function findPropKey(schema: Record<string, string>, type: string, hints: string[]): string | null {
    for (const hint of hints) {
      const key = Object.keys(schema).find(k => k.toLowerCase().includes(hint.toLowerCase()) && schema[k] === type)
      if (key) return key
    }
    return Object.keys(schema).find(k => schema[k] === type) ?? null
  }
  const expTitleKey = findPropKey(expSchema, 'title', ['nom', 'name', 'libellé', 'titre', 'label'])
  const expAmountKey = findPropKey(expSchema, 'number', ['montant', 'amount', 'prix', 'total', 'coût', 'cout', 'price'])
    ?? findPropKey(expSchema, 'formula', ['montant', 'amount', 'total', 'prix'])
    ?? findPropKey(expSchema, 'rollup', ['montant', 'amount', 'total'])
  const expPosteKey = findPropKey(expSchema, 'select', ['poste', 'catégorie', 'categorie', 'type', 'lot', 'budget'])
    ?? findPropKey(expSchema, 'multi_select', ['poste', 'catégorie', 'categorie', 'type', 'lot'])
    ?? findPropKey(expSchema, 'status', ['poste', 'statut', 'status', 'état', 'etat'])
  const expAppKey = findPropKey(expSchema, 'select', ['appartement', 'app', 'logement', 'bien', 'studio'])
    ?? findPropKey(expSchema, 'rich_text', ['appartement', 'app', 'logement'])

  function expGetTitle(e: { id: string; props: Record<string, any> }) {
    if (expTitleKey) return String(e.props[expTitleKey] ?? '')
    const titleProp = Object.keys(expSchema).find(k => expSchema[k] === 'title')
    return titleProp ? String(e.props[titleProp] ?? '') : e.id
  }
  function expGetAmount(e: { id: string; props: Record<string, any> }): number {
    if (!expAmountKey) return 0
    const v = e.props[expAmountKey]
    return typeof v === 'number' ? v : 0
  }
  function expGetPoste(e: { id: string; props: Record<string, any> }): string {
    if (!expPosteKey) return '—'
    const v = e.props[expPosteKey]
    if (Array.isArray(v)) return v.join(', ') || '—'
    return v ? String(v) : '—'
  }
  function expGetApp(e: { id: string; props: Record<string, any> }): string {
    if (!expAppKey) return '—'
    const v = e.props[expAppKey]
    if (Array.isArray(v)) return v.join(', ') || '—'
    return v ? String(v) : '—'
  }

  const allPostes = [...new Set(expenses.map(expGetPoste))].filter(p => p !== '—').sort()
  const allExpApps = [...new Set(expenses.map(expGetApp))].filter(a => a !== '—').sort()

  const filteredExpenses = expenses.filter(e =>
    (expFilterPoste === 'Tous' || expGetPoste(e) === expFilterPoste) &&
    (expFilterApp === 'Tous' || expGetApp(e) === expFilterApp)
  ).sort((a, b) => {
    if (expSort === 'poste') return expGetPoste(a).localeCompare(expGetPoste(b))
    if (expSort === 'app') return expGetApp(a).localeCompare(expGetApp(b))
    if (expSort === 'name') return expGetTitle(a).localeCompare(expGetTitle(b))
    if (expSort === 'amount-asc') return expGetAmount(a) - expGetAmount(b)
    if (expSort === 'amount-desc') return expGetAmount(b) - expGetAmount(a)
    return 0
  })
  const expTotal = filteredExpenses.reduce((s, e) => s + expGetAmount(e), 0)

  // KPIs groupés
  const kpiByPoste: Record<string, number> = {}
  const kpiByApp: Record<string, number> = {}
  for (const e of filteredExpenses) {
    const poste = expGetPoste(e)
    const app = expGetApp(e)
    const amount = expGetAmount(e)
    kpiByPoste[poste] = (kpiByPoste[poste] || 0) + amount
    kpiByApp[app] = (kpiByApp[app] || 0) + amount
  }
  const kpiPosteEntries = Object.entries(kpiByPoste).sort((a, b) => b[1] - a[1])
  const kpiAppEntries = Object.entries(kpiByApp).sort((a, b) => b[1] - a[1])

  return (
    <>
      <style>{CSS}</style>

      {/* Header */}
      <header>
        <div className="logo">
          <div className="logo-icon">🏗</div>
          Chantier
        </div>
        <div className="header-stats">
          <div className="header-stat"><span>{statDone}</span> / <span>{statTotal}</span> tâches</div>
          <div className="header-stat"><span>{statBlocked}</span> bloquées</div>
        </div>
        <div className="nav-toggle-group">
          <button className={`nav-tab-btn${view === 'tasks' ? ' active' : ''}`} onClick={() => { exitSelectMode(); setOpenPicker(null); setView('tasks') }}>📋 Tâches</button>
          <button className={`nav-tab-btn${view === 'purchases' ? ' active' : ''}`} onClick={() => { exitSelectMode(); setOpenPicker(null); setView('purchases') }}>🛒 Achats</button>
          <button className={`nav-tab-btn${view === 'expenses' ? ' active' : ''}`} onClick={() => { exitSelectMode(); setOpenPicker(null); setView('expenses') }}>💶 Dépenses</button>
        </div>
      </header>

      {view === 'tasks' && (
        <div className="tabs-bar">
          {apps.map(app => {
            const appTasks = getAppTasks(app)
            const done = appTasks.filter(t => t.done).length
            return (
              <button key={app} className={`tab${app === currentApp ? ' active' : ''}`} onClick={() => setCurrentApp(app)}>
                {app} <span className="tab-badge">{done}/{appTasks.length}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Vue Achats */}
      {view === 'purchases' && (
        <main>
          <div className="purchases-toolbar">
            <div className="purchases-filter">
              <label>Appartement</label>
              <select value={purchFilterApp} onChange={e => { setPurchFilterApp(e.target.value); setPurchFilterRoom('Toutes'); setPurchFilterCat('Toutes') }}>
                <option>Tous</option>
                {purchApps.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="purchases-filter">
              <label>Pièce</label>
              <select value={purchFilterRoom} onChange={e => { setPurchFilterRoom(e.target.value); setPurchFilterCat('Toutes') }}>
                <option>Toutes</option>
                {purchRoomsForApp.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="purchases-filter">
              <label>Catégorie</label>
              <select value={purchFilterCat} onChange={e => setPurchFilterCat(e.target.value)}>
                <option>Toutes</option>
                {purchCatsForRoom.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="purchases-filter">
              <label>Trier par</label>
              <select value={purchSort} onChange={e => setPurchSort(e.target.value as typeof purchSort)}>
                <option value="room">Pièce</option>
                <option value="cat">Catégorie</option>
                <option value="app">Appartement</option>
                <option value="name">Nom (A→Z)</option>
                <option value="price-desc">Prix (plus cher d'abord)</option>
                <option value="price-asc">Prix (moins cher d'abord)</option>
              </select>
            </div>
          </div>

          <div className="purchases-summary">
            <span>{filteredPurchases.length} achat{filteredPurchases.length > 1 ? 's' : ''}</span>
            <span>Total : {purchasesTotal.toFixed(2)} €</span>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="empty">Aucun achat pour ces filtres.</div>
          ) : (
            <div className="purchase-list">
              {filteredPurchases.map(r => (
                <div key={r.key} className={`purchase-item${r.task.done ? ' done' : ''}`} onClick={() => openEdit(r.task)}>
                  <div className="purchase-item-main">
                    <span className="purchase-item-name">{r.name || '(sans nom)'}</span>
                    <span className="purchase-item-price">{r.price != null ? `${r.price.toFixed(2)} €` : '—'}</span>
                  </div>
                  <div className="purchase-item-meta">
                    <span className="badge badge-tag">{r.app}</span>
                    <span className="badge badge-tag">{r.room}</span>
                    <span className="badge badge-tag">{getCatIcon(r.cat)} {r.cat}</span>
                    {r.url && (
                      <a
                        className="badge badge-link"
                        href={normalizeUrl(r.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                      >
                        🔗 Voir le produit
                      </a>
                    )}
                    <span className="purchase-item-task">— {r.task.label}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* Vue Dépenses */}
      {view === 'expenses' && (
        <main>
          {expLoading ? (
            <div className="empty">Chargement des dépenses…</div>
          ) : !expLoaded ? (
            <div className="empty">Erreur de chargement.</div>
          ) : (
            <>
              {/* Filtres */}
              <div className="purchases-toolbar">
                {allPostes.length > 0 && (
                  <div className="purchases-filter">
                    <label>Poste</label>
                    <select value={expFilterPoste} onChange={e => setExpFilterPoste(e.target.value)}>
                      <option>Tous</option>
                      {allPostes.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                )}
                {allExpApps.length > 0 && (
                  <div className="purchases-filter">
                    <label>Appartement</label>
                    <select value={expFilterApp} onChange={e => setExpFilterApp(e.target.value)}>
                      <option>Tous</option>
                      {allExpApps.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                )}
                <div className="purchases-filter">
                  <label>Trier par</label>
                  <select value={expSort} onChange={e => setExpSort(e.target.value as typeof expSort)}>
                    <option value="amount-desc">Montant (décroissant)</option>
                    <option value="amount-asc">Montant (croissant)</option>
                    {allPostes.length > 0 && <option value="poste">Poste</option>}
                    {allExpApps.length > 0 && <option value="app">Appartement</option>}
                    <option value="name">Nom (A→Z)</option>
                  </select>
                </div>
              </div>

              {/* KPIs */}
              <div className="exp-kpi-grid">
                <div className="exp-kpi-card">
                  <div className="exp-kpi-title">Total</div>
                  <div className="exp-kpi-value">{expTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                  <div className="exp-kpi-sub">{filteredExpenses.length} dépense{filteredExpenses.length > 1 ? 's' : ''}</div>
                </div>
                {kpiPosteEntries.length > 1 && kpiPosteEntries.map(([poste, total]) => (
                  <div key={poste} className="exp-kpi-card exp-kpi-card--poste" onClick={() => setExpFilterPoste(expFilterPoste === poste ? 'Tous' : poste)} style={{ cursor: 'pointer' }}>
                    <div className="exp-kpi-title">{poste}</div>
                    <div className="exp-kpi-value">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                    <div className="exp-kpi-bar"><div className="exp-kpi-bar-fill" style={{ width: `${expTotal > 0 ? Math.round(total / expTotal * 100) : 0}%` }} /></div>
                    <div className="exp-kpi-sub">{expTotal > 0 ? Math.round(total / expTotal * 100) : 0}%</div>
                  </div>
                ))}
              </div>

              {kpiAppEntries.length > 1 && (
                <div className="exp-kpi-grid" style={{ marginTop: 12 }}>
                  {kpiAppEntries.map(([app, total]) => (
                    <div key={app} className="exp-kpi-card exp-kpi-card--app" onClick={() => setExpFilterApp(expFilterApp === app ? 'Tous' : app)} style={{ cursor: 'pointer' }}>
                      <div className="exp-kpi-title">{app}</div>
                      <div className="exp-kpi-value">{total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
                      <div className="exp-kpi-bar"><div className="exp-kpi-bar-fill exp-kpi-bar-fill--blue" style={{ width: `${expTotal > 0 ? Math.round(total / expTotal * 100) : 0}%` }} /></div>
                      <div className="exp-kpi-sub">{expTotal > 0 ? Math.round(total / expTotal * 100) : 0}%</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Liste */}
              {filteredExpenses.length === 0 ? (
                <div className="empty">Aucune dépense pour ces filtres.</div>
              ) : (
                <div className="purchase-list" style={{ marginTop: 16 }}>
                  {filteredExpenses.map(e => {
                    const title = expGetTitle(e)
                    const amount = expGetAmount(e)
                    const poste = expGetPoste(e)
                    const app = expGetApp(e)
                    return (
                      <div key={e.id} className="purchase-item">
                        <div className="purchase-item-main">
                          <span className="purchase-item-name">{title || '(sans nom)'}</span>
                          <span className="purchase-item-price">{amount > 0 ? `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : '—'}</span>
                        </div>
                        <div className="purchase-item-meta">
                          {poste !== '—' && <span className="badge badge-tag">📂 {poste}</span>}
                          {app !== '—' && <span className="badge badge-tag">🏠 {app}</span>}
                          {Object.entries(e.props).filter(([k, v]) =>
                            k !== expTitleKey && k !== expAmountKey && k !== expPosteKey && k !== expAppKey &&
                            v !== null && v !== '' && !Array.isArray(v) && typeof v !== 'boolean' &&
                            ['select', 'status', 'rich_text', 'date'].includes(expSchema[k])
                          ).map(([k, v]) => (
                            <span key={k} className="badge badge-tag" title={k}>{String(v)}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </main>
      )}

      {/* Main */}
      {view === 'tasks' && (
      <main style={selectMode ? { paddingBottom: 76 } : undefined}>
        <div className="toolbar">
          <div className="toolbar-filters">
            <button className={`filter-btn${activeFilters.length === 0 ? ' active' : ''}`} onClick={() => setActiveFilters([])}>
              Tout
            </button>
            {(['todo','blocked','done'] as const).map(f => (
              <button key={f} className={`filter-btn${activeFilters.includes(f) ? ' active' : ''}`} onClick={() => toggleFilter(f)}>
                {f === 'todo' ? 'À faire' : f === 'blocked' ? 'Bloquées' : 'Terminées'}
              </button>
            ))}
          </div>
          <select className="sort-select" value={taskSort} onChange={e => setTaskSort(e.target.value as typeof taskSort)}>
            <option value="default">Trier : Pièce / Catégorie</option>
            <option value="assignee">Trier : Assignation</option>
          </select>
          <button className="btn-primary" onClick={() => openAdd()}>＋ Ajouter</button>
        </div>

        {taskSort === 'assignee' ? (
          <div id="assigneesContainer">
            {assigneeNames.length === 0 ? (
              <div className="empty">Aucune tâche pour {currentApp} — cliquez sur "＋ Ajouter".</div>
            ) : assigneeNames.map(person => {
              const personTasks = assigneeGroups[person]
              const personDone = personTasks.filter(t => t.done).length
              const pct = personTasks.length ? Math.round(personDone / personTasks.length * 100) : 0
              return (
                <RoomSection key={person} room={person === 'Non assigné' ? person : `👷 ${person}`} pct={pct}>
                  {personTasks.map(task => renderTaskRow(task, `${person}-${task.id}`))}
                </RoomSection>
              )
            })}
          </div>
        ) : (
        <div id="roomsContainer">
          {rooms.length === 0 ? (
            <div className="empty">Aucune tâche pour {currentApp} — cliquez sur "＋ Ajouter".</div>
          ) : rooms.map(room => {
            const roomTasks = tasks.filter(t => t.app === currentApp && t.room === room)
            const roomDone = roomTasks.filter(t => t.done).length
            const pct = roomTasks.length ? Math.round(roomDone / roomTasks.length * 100) : 0
            const filteredRoom = roomTasks.filter(filterTask)
            if (!filteredRoom.length && activeFilters.length > 0) return null
            const cats = getCats(currentApp, room)

            return (
              <RoomSection key={room} room={room} pct={pct}>
                {cats.map(cat => {
                  const catTasks = tasks.filter(t => t.app === currentApp && t.room === room && t.cat === cat)
                  const filtered = catTasks.filter(filterTask)
                  if (!filtered.length && activeFilters.length > 0) return null
                  return (
                    <div key={cat} className="category">
                      <div className="category-title">
                        <span className="cat-icon">{getCatIcon(cat)}</span>{cat}
                        <button className="cat-add-btn" onClick={e => { e.stopPropagation(); openAdd(room, cat) }} title={`Ajouter une tâche · ${room} / ${cat}`}>＋</button>
                      </div>
                      {filtered.map(task => renderTaskRow(task, task.id))}
                    </div>
                  )
                })}
              </RoomSection>
            )
          })}
        </div>
        )}
      </main>
      )}

      {/* Barre de sélection multiple */}
      {selectMode && (
        <div className="selection-bar">
          <span>{selectedTaskIds.length} tâche{selectedTaskIds.length > 1 ? 's' : ''} sélectionnée{selectedTaskIds.length > 1 ? 's' : ''}</span>
          <div style={{ flex: 1 }} />
          <button className="btn-ghost" onClick={exitSelectMode}>Annuler</button>
          <button className="btn-primary" onClick={openBulkBlock}>🔒 Bloquer par…</button>
        </div>
      )}

      {/* Modal Blocage groupé */}
      {bulkBlockModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setBulkBlockModal(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Bloquer {selectedTaskIds.length} tâche{selectedTaskIds.length > 1 ? 's' : ''} par…</div>
            <div className="modal-section" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
              <MultiPicker
                pickerId="bulk-blocked"
                options={bulkBlockOptions.map(t => ({ id: t.id, label: t.label }))}
                selectedIds={bulkBlockIds}
                onToggle={id => toggleBlockedId(id, setBulkBlockIds)}
                placeholder="Choisir une ou plusieurs tâches bloquantes"
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setBulkBlockModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={applyBulkBlock} disabled={bulkBlockIds.length === 0}>Appliquer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add */}
      {addModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setAddModal(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nouvelle tâche</div>
            <div className="field">
              <label>Appartement</label>
              <select value={addApp} onChange={e => { setAddApp(e.target.value); setAddRoom(getRooms(e.target.value)[0] || 'Chambre'); setAddBlockedIds([]) }}>
                {apps.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pièce</label>
              <select value={addRoom} onChange={e => { setAddRoom(e.target.value); setAddCat(getCats(addApp, e.target.value)[0] || 'Autre'); setAddBlockedIds([]) }}>
                {allRoomOptions.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Catégorie</label>
              <select value={addCat} onChange={e => setAddCat(e.target.value)}>
                {allCatOptions.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Nom de la tâche</label>
              <input type="text" value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Ex : Ponçage couche 2" autoFocus />
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🔒 Bloquée par</div>
              <MultiPicker
                pickerId="add-blocked"
                options={addTaskOptions.map(t => ({ id: t.id, label: t.label }))}
                selectedIds={addBlockedIds}
                onToggle={id => toggleBlockedId(id, setAddBlockedIds)}
                placeholder="Aucune dépendance"
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
            </div>

            <div className="modal-section">
              <div className="modal-section-title">👷 Qui peut le faire</div>
              <AssigneePicker
                pickerId="add-assignees"
                options={TEAM}
                selected={addAssignees}
                onToggle={name => toggleAssignee(name, setAddAssignees)}
                placeholder="Personne assignée"
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🛒 Achats à prévoir</div>
              <PurchasesList purchases={addPurchases} onChange={setAddPurchases} />
            </div>

            <div className="modal-actions">
              <button className="btn-ghost" onClick={() => setAddModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={addTask}>Ajouter la tâche</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {editModal && editTask && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setEditModal(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Modifier la tâche</div>
            <div className="field">
              <label>Nom de la tâche</label>
              <input type="text" value={editLabel} onChange={e => setEditLabel(e.target.value)} autoFocus />
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🔒 Bloquée par</div>
              <MultiPicker
                pickerId="edit-blocked"
                options={editTaskOptions.map(t => ({ id: t.id, label: t.label }))}
                selectedIds={editBlockedIds}
                onToggle={id => toggleBlockedId(id, setEditBlockedIds)}
                placeholder="Aucune dépendance"
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
            </div>

            <div className="modal-section">
              <div className="modal-section-title">👷 Qui peut le faire</div>
              <AssigneePicker
                pickerId="edit-assignees"
                options={TEAM}
                selected={editAssignees}
                onToggle={name => toggleAssignee(name, setEditAssignees)}
                placeholder="Personne assignée"
                openPicker={openPicker}
                setOpenPicker={setOpenPicker}
              />
            </div>

            <div className="modal-section">
              <div className="modal-section-title">🛒 Achats à prévoir</div>
              <PurchasesList purchases={editPurchases} onChange={setEditPurchases} />
            </div>

            <div className="modal-actions">
              <button className="btn-danger" onClick={() => deleteTask(editTask.id)}>🗑 Supprimer</button>
              <div style={{ flex: 1 }} />
              <button className="btn-ghost" onClick={() => setEditModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={saveEdit}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div key={toast.id} className="toast show">{toast.msg}</div>}
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function RoomSection({ room, pct, children }: { room: string; pct: number; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div className={`room${collapsed ? ' collapsed' : ''}`}>
      <div className="room-header" onClick={() => setCollapsed(c => !c)}>
        <div className="room-title">{room}</div>
        <div className="room-progress-wrap">
          <span className="room-pct">{pct}%</span>
          <div className="progress-bar"><div className={`progress-fill${pct === 100 ? ' done' : ''}`} style={{ width: `${pct}%` }} /></div>
        </div>
        <span className="chevron">▾</span>
      </div>
      {!collapsed && <div className="room-body">{children}</div>}
    </div>
  )
}

function MultiPicker({ pickerId, options, selectedIds, onToggle, placeholder, openPicker, setOpenPicker }: {
  pickerId: string
  options: { id: string; label: string }[]
  selectedIds: string[]
  onToggle: (id: string) => void
  placeholder: string
  openPicker: string | null
  setOpenPicker: (id: string | null) => void
}) {
  const isOpen = openPicker === pickerId
  const selected = options.filter(o => selectedIds.includes(o.id))
  const [search, setSearch] = useState('')
  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="picker-wrap">
      <div className={`picker-display${isOpen ? ' open' : ''}`} onClick={() => setOpenPicker(isOpen ? null : pickerId)}>
        {selected.length === 0
          ? <span className="placeholder">{placeholder}</span>
          : selected.map(o => (
            <span key={o.id} className="picker-chip">
              {o.label}
              <span className="remove" onClick={e => { e.stopPropagation(); onToggle(o.id) }}>✕</span>
            </span>
          ))
        }
      </div>
      {isOpen && (
        <div className="picker-dropdown open">
          <input className="picker-search" placeholder="Rechercher une tâche…" value={search} onChange={e => setSearch(e.target.value)} />
          <div className="picker-options">
            {filtered.length === 0
              ? <div style={{ padding: '10px 12px', color: 'var(--text-dim)', fontSize: 12 }}>Aucune option</div>
              : filtered.map(o => (
                <div key={o.id} className={`picker-option${selectedIds.includes(o.id) ? ' selected' : ''}`} onClick={e => { e.stopPropagation(); onToggle(o.id) }}>
                  <span className="opt-check">{selectedIds.includes(o.id) ? '✓' : ''}</span>
                  {o.label}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

function AssigneePicker({ pickerId, options, selected, onToggle, placeholder, openPicker, setOpenPicker }: {
  pickerId: string
  options: string[]
  selected: string[]
  onToggle: (name: string) => void
  placeholder: string
  openPicker: string | null
  setOpenPicker: (id: string | null) => void
}) {
  const isOpen = openPicker === pickerId
  return (
    <div className="picker-wrap">
      <div className={`picker-display${isOpen ? ' open' : ''}`} onClick={() => setOpenPicker(isOpen ? null : pickerId)}>
        {selected.length === 0
          ? <span className="placeholder">{placeholder}</span>
          : selected.map(name => (
            <span key={name} className="picker-chip">
              {name}
              <span className="remove" onClick={e => { e.stopPropagation(); onToggle(name) }}>✕</span>
            </span>
          ))
        }
      </div>
      {isOpen && (
        <div className="picker-dropdown open">
          <div className="picker-options">
            {options.map(name => (
              <div key={name} className={`picker-option${selected.includes(name) ? ' selected' : ''}`} onClick={e => { e.stopPropagation(); onToggle(name) }}>
                <span className="opt-check">{selected.includes(name) ? '✓' : ''}</span>
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PurchasesList({ purchases, onChange }: { purchases: Purchase[]; onChange: (p: Purchase[]) => void }) {
  function update(index: number, field: keyof Purchase, value: string | number | null) {
    const next = purchases.map((p, i) => i === index ? { ...p, [field]: value } : p)
    onChange(next)
  }
  function remove(index: number) { onChange(purchases.filter((_, i) => i !== index)) }
  function add() { onChange([...purchases, { name: '', price: null, url: null }]) }
  const total = purchases.reduce((s, p) => s + (p.price || 0), 0)

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4, padding: '0 2px' }}>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Libellé</div>
        <div style={{ width: 80, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prix</div>
        <div style={{ width: 34 }} />
      </div>
      {purchases.map((p, i) => (
        <div key={i} className="purchase-row-group">
          <div className="purchase-row">
            <input className="purchase-name" type="text" placeholder="Libellé" value={p.name} onChange={e => update(i, 'name', e.target.value)} />
            <div className="purchase-price-wrap">
              <input className="purchase-price" type="number" min="0" step="0.01" placeholder="0" value={p.price ?? ''} onChange={e => update(i, 'price', e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
            <button className="remove-purchase" onClick={() => remove(i)}>✕</button>
          </div>
          <input className="purchase-url" type="url" placeholder="🔗 Lien vers le produit (optionnel)" value={p.url ?? ''} onChange={e => update(i, 'url', e.target.value)} />
        </div>
      ))}
      {purchases.length > 0 && total > 0 && (
        <div className="purchases-total">Total estimé : {total.toFixed(2)} €</div>
      )}
      <button className="add-purchase-btn" onClick={add}>＋ Ajouter un achat</button>
    </>
  )
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #F4F5F7; --surface: #FFFFFF; --surface2: #F0F1F3; --border: #DDE1E9;
    --accent: #E6A800; --accent-dim: rgba(230,168,0,0.12);
    --green: #1A9E5A; --green-dim: rgba(26,158,90,0.12);
    --red: #D63B2C; --red-dim: rgba(214,59,44,0.12);
    --orange: #C97B0A; --orange-dim: rgba(201,123,10,0.12);
    --blue: #2176D9; --blue-dim: rgba(33,118,217,0.12);
    --text: #1A1D23; --text-muted: #5A6275; --text-dim: #9099AE;
    --radius: 8px;
    --stripe: repeating-linear-gradient(-45deg,transparent,transparent 4px,rgba(214,59,44,0.06) 4px,rgba(214,59,44,0.06) 8px);
  }
  body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; font-size: 16px; line-height: 1.5; }
  header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0 20px; position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 16px; height: 56px; }
  .logo { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .logo-icon { width: 28px; height: 28px; background: var(--accent); border-radius: 6px; display: grid; place-items: center; font-size: 14px; color: #fff; }
  .header-stats { margin-left: auto; display: flex; gap: 16px; font-size: 14px; color: var(--text-muted); flex-shrink: 0; }
  .header-stat span { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
  .tabs-bar { background: var(--surface); border-bottom: 1px solid var(--border); display: flex; padding: 0 20px; gap: 4px; overflow-x: auto; scrollbar-width: none; }
  .tabs-bar::-webkit-scrollbar { display: none; }
  .tab { padding: 10px 16px; font-size: 16px; font-weight: 500; color: var(--text-muted); border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.15s, border-color 0.15s; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .tab-badge { display: inline-flex; align-items: center; justify-content: center; background: var(--surface2); color: var(--text-muted); font-size: 10px; font-weight: 700; border-radius: 10px; padding: 1px 6px; margin-left: 6px; }
  .tab.active .tab-badge { background: var(--accent-dim); color: var(--accent); }
  .nav-toggle-btn { margin-left: auto; padding: 7px 14px; background: var(--surface2); border: 1px solid var(--border); color: var(--text); border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s; flex-shrink: 0; }
  .nav-toggle-btn:hover { border-color: var(--accent); color: var(--accent); }
  .nav-toggle-group { margin-left: auto; display: flex; gap: 4px; align-items: center; flex-shrink: 0; }
  .nav-tab-btn { padding: 6px 12px; background: none; border: 1px solid var(--border); color: var(--text-muted); border-radius: 20px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
  .nav-tab-btn:hover { border-color: var(--accent); color: var(--accent); }
  .nav-tab-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  main { padding: 20px; max-width: 960px; margin: 0 auto; }
  .toolbar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
  .toolbar-filters { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
  .filter-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border); background: none; color: var(--text-muted); font-size: 14px; cursor: pointer; transition: all 0.15s; }
  .filter-btn:hover { border-color: var(--text-muted); color: var(--text); }
  .filter-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  .sort-select { padding: 6px 10px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 14px; font-family: inherit; cursor: pointer; outline: none; transition: border-color 0.15s; }
  .sort-select:focus { border-color: var(--accent); }
  .btn-primary { padding: 8px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 16px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; display: flex; align-items: center; gap: 6px; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-primary:hover { opacity: 0.88; }
  .room { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
  .room-header { padding: 14px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
  .room-header:hover { background: var(--surface2); }
  .room-title { font-size: 16px; font-weight: 700; flex: 1; }
  .room-progress-wrap { display: flex; align-items: center; gap: 10px; }
  .room-pct { font-size: 14px; font-weight: 700; color: var(--text-muted); font-variant-numeric: tabular-nums; }
  .progress-bar { width: 80px; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s ease; }
  .progress-fill.done { background: var(--green); }
  .chevron { color: var(--text-dim); font-size: 14px; transition: transform 0.2s; }
  .room.collapsed .chevron { transform: rotate(-90deg); }
  .room-body { padding: 0 16px 12px; }
  .category { margin-top: 12px; }
  .category-title { font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-dim); padding: 6px 0 4px; display: flex; align-items: center; gap: 8px; }
  .cat-icon { font-size: 14px; }
  .cat-add-btn { margin-left: auto; width: 20px; height: 20px; border-radius: 5px; border: 1px solid var(--border); background: none; color: var(--text-dim); font-size: 13px; font-weight: 700; cursor: pointer; display: grid; place-items: center; flex-shrink: 0; transition: all 0.15s; }
  .cat-add-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
  .task { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 6px; margin-top: 2px; transition: background 0.1s; position: relative; cursor: pointer; }
  .task:hover { background: var(--surface2); }
  .task.done { opacity: 0.45; }
  .task.done .task-label { text-decoration: line-through; color: var(--text-muted); }
  .task.blocked { background: var(--stripe); border: 1px solid rgba(231,76,60,0.2); }
  .task.blocked .task-label { color: var(--text-muted); }
  .task.selected { background: var(--accent-dim); outline: 2px solid var(--accent); outline-offset: -1px; user-select: none; }
  .task-check { width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border); background: none; cursor: pointer; flex-shrink: 0; margin-top: 2px; display: grid; place-items: center; transition: all 0.15s; }
  .task-check:hover { border-color: var(--accent); background: var(--accent-dim); }
  .task.done .task-check { background: var(--green); border-color: var(--green); }
  .task.blocked .task-check { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .task.selected .task-check { background: var(--accent); border-color: var(--accent); opacity: 1; pointer-events: auto; cursor: pointer; }
  .checkmark { color: #fff; font-size: 10px; font-weight: 900; display: none; }
  .task.done .checkmark { display: block; }
  .task.selected .checkmark { display: block; }
  .task-body { flex: 1; min-width: 0; }
  .task-label { font-size: 16px; line-height: 1.4; }
  .task-meta { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
  .badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .badge-blocked { background: var(--red-dim); color: var(--red); }
  .badge-ok { background: var(--green-dim); color: var(--green); }
  .badge-person { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(74,158,255,0.2); }
  .badge-shop { background: var(--orange-dim); color: var(--orange); border: 1px solid rgba(243,156,18,0.2); }
  .badge-tag { background: var(--surface2); color: var(--text-muted); border: 1px solid var(--border); }
  .badge-link { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(74,158,255,0.2); text-decoration: none; cursor: pointer; }
  .badge-link:hover { text-decoration: underline; }
  .purchases-toolbar { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
  .purchases-filter { display: flex; flex-direction: column; gap: 5px; min-width: 150px; flex: 1; }
  .purchases-filter label { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .purchases-filter select { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 9px 12px; font-size: 15px; font-family: inherit; outline: none; transition: border-color 0.15s; }
  .purchases-filter select:focus { border-color: var(--accent); }
  .purchases-summary { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; font-size: 15px; font-weight: 600; }
  .purchase-list { display: flex; flex-direction: column; gap: 8px; }
  .purchase-item { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; cursor: pointer; transition: background 0.1s; }
  .purchase-item:hover { background: var(--surface2); }
  .purchase-item.done { opacity: 0.5; }
  .purchase-item-main { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
  .purchase-item-name { font-size: 16px; font-weight: 600; }
  .purchase-item-price { font-size: 16px; font-weight: 700; color: var(--accent); white-space: nowrap; flex-shrink: 0; }
  .purchase-item-meta { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; align-items: center; }
  .purchase-item-task { font-size: 12px; color: var(--text-dim); }
  .picker-wrap { position: relative; }
  .picker-display { min-height: 38px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px 10px; cursor: pointer; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; transition: border-color 0.15s; }
  .picker-display:hover, .picker-display.open { border-color: var(--accent); }
  .picker-display .placeholder { color: var(--text-dim); font-size: 16px; }
  .picker-chip { background: var(--surface2); border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font-size: 14px; color: var(--text); display: flex; align-items: center; gap: 4px; }
  .picker-chip .remove { cursor: pointer; color: var(--text-dim); font-size: 12px; line-height: 1; }
  .picker-chip .remove:hover { color: var(--red); }
  .picker-dropdown { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius); z-index: 50; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
  .picker-dropdown.open { display: block; }
  .picker-search { width: 100%; background: var(--bg); border: none; border-bottom: 1px solid var(--border); color: var(--text); padding: 10px 12px; font-size: 16px; font-family: inherit; outline: none; }
  .picker-options { max-height: 220px; overflow-y: auto; }
  .picker-option { padding: 10px 12px; font-size: 16px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: background 0.1s; }
  .picker-option:hover { background: var(--border); }
  .picker-option.selected { color: var(--accent); }
  .opt-check { width: 14px; height: 14px; border-radius: 3px; border: 2px solid var(--border); flex-shrink: 0; display: grid; place-items: center; font-size: 9px; }
  .picker-option.selected .opt-check { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 900; }
  .purchase-row-group { margin-bottom: 10px; }
  .purchase-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
  .purchase-name { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 8px 10px; font-size: 16px; font-family: inherit; outline: none; transition: border-color 0.15s; }
  .purchase-name:focus { border-color: var(--accent); }
  .purchase-price-wrap { position: relative; flex-shrink: 0; }
  .purchase-price-wrap::after { content: '€'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px; pointer-events: none; }
  .purchase-price { width: 80px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 8px 24px 8px 10px; font-size: 16px; font-family: inherit; outline: none; transition: border-color 0.15s; -moz-appearance: textfield; appearance: textfield; }
  .purchase-price::-webkit-outer-spin-button, .purchase-price::-webkit-inner-spin-button { -webkit-appearance: none; }
  .purchase-price:focus { border-color: var(--accent); }
  .purchase-url { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 6px 10px; font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.15s; }
  .purchase-url:focus { border-color: var(--accent); }
  .remove-purchase { width: 34px; height: 34px; border-radius: 4px; border: none; background: none; color: var(--text-dim); cursor: pointer; font-size: 16px; flex-shrink: 0; display: grid; place-items: center; transition: all 0.15s; }
  .remove-purchase:hover { background: var(--red-dim); color: var(--red); }
  .purchases-total { display: flex; justify-content: flex-end; font-size: 14px; font-weight: 700; color: var(--accent); margin-top: 4px; margin-bottom: 6px; font-variant-numeric: tabular-nums; }
  .add-purchase-btn { background: none; border: 1px dashed var(--border); border-radius: var(--radius); color: var(--text-muted); padding: 8px 12px; font-size: 16px; cursor: pointer; width: 100%; transition: all 0.15s; margin-top: 2px; }
  .add-purchase-btn:hover { border-color: var(--accent); color: var(--accent); }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 200; display: none; place-items: center; padding: 20px; overflow-y: auto; }
  .modal-overlay.open { display: grid; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; width: 100%; max-width: 500px; padding: 24px; animation: slideIn 0.2s ease; margin: auto; }
  @keyframes slideIn { from { transform: translateY(12px); opacity: 0; } }
  .modal-title { font-size: 16px; font-weight: 700; margin-bottom: 18px; }
  .field { margin-bottom: 14px; }
  .field label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; }
  .field input, .field select { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 9px 12px; font-size: 16px; font-family: inherit; transition: border-color 0.15s; outline: none; }
  .field input:focus, .field select:focus { border-color: var(--accent); }
  .field select option { background: var(--surface); }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; align-items: center; }
  .btn-ghost { padding: 8px 16px; background: none; border: 1px solid var(--border); color: var(--text-muted); border-radius: var(--radius); font-size: 16px; cursor: pointer; transition: all 0.15s; }
  .btn-ghost:hover { border-color: var(--text-muted); color: var(--text); }
  .btn-danger { padding: 8px 14px; background: none; border: 1px solid var(--red); color: var(--red); border-radius: var(--radius); font-size: 16px; cursor: pointer; transition: all 0.15s; }
  .btn-danger:hover { background: var(--red-dim); }
  .modal-section { border-top: 1px solid var(--border); margin-top: 16px; padding-top: 14px; }
  .modal-section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px; }
  .empty { text-align: center; padding: 40px 20px; color: var(--text-dim); font-size: 16px; }
  .selection-bar { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-top: 1px solid var(--border); padding: 12px 20px; display: flex; align-items: center; gap: 10px; z-index: 150; font-size: 14px; font-weight: 600; color: var(--text); box-shadow: 0 -4px 16px rgba(0,0,0,0.08); }
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 10px 18px; border-radius: 8px; font-size: 16px; z-index: 300; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; }
  .toast.show { opacity: 1; }
  .exp-kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; margin-bottom: 4px; }
  .exp-kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 14px 16px; transition: border-color 0.15s; }
  .exp-kpi-card:hover { border-color: var(--accent); }
  .exp-kpi-card--poste { border-left: 3px solid var(--accent); }
  .exp-kpi-card--app { border-left: 3px solid var(--blue); }
  .exp-kpi-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-dim); margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .exp-kpi-value { font-size: 20px; font-weight: 800; color: var(--text); font-variant-numeric: tabular-nums; line-height: 1.2; }
  .exp-kpi-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
  .exp-kpi-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 8px; }
  .exp-kpi-bar-fill { height: 100%; background: var(--accent); border-radius: 2px; }
  .exp-kpi-bar-fill--blue { background: var(--blue); }
  @media (max-width: 600px) { main { padding: 12px; } .header-stats { display: none; } .progress-bar { width: 50px; } .modal { padding: 16px; } .nav-toggle-group { gap: 2px; } .nav-tab-btn { padding: 5px 8px; font-size: 12px; } }
`
