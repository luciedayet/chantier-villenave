'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase, Task } from '@/lib/supabase'

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
type Purchase = { name: string; price: number | null }
type AppTask = Omit<Task, 'blocked_by_ids'> & { blockedByIds: number[] }

// ── Seed Data ──────────────────────────────────────────────────────────────────
function makeSeedTasks(): Omit<Task, 'id'>[] {
  type RawTask = Omit<Task, 'id' | 'blocked_by_ids'> & { blockedByLabels: string[] }
  let id = 1000
  const t = (
    app: string, room: string, cat: string, label: string,
    blockedByLabels: string[] = [], assignees: string[] = [], purchases: Purchase[] = []
  ): RawTask => ({ app, room, cat, label, blockedByLabels, assignees, purchases, done: false })

  const raw: (RawTask & { _tmpId: number })[] = [
    t('App 1','Chambre','Fenêtre','Enduit 2 + finitions coins'),
    t('App 1','Chambre','Fenêtre','Ponçage 2',[],[],[{name:'Papier abrasif P120',price:null},{name:'Éponge à poncer',price:null}]),
    t('App 1','Chambre','Électricité','Ampoule plafond',[],[],[{name:'Ampoule LED E27',price:null}]),
    t('App 1','Chambre','Électricité','Interrupteur',[],[],[{name:'Interrupteur va-et-vient',price:null}]),
    t('App 1','Chambre','Électricité','3 prises',[],[],[{name:'Prises x3',price:null}]),
    t('App 1','Chambre','Électricité','Cacher ou installer radiateur'),
    t('App 1','Chambre','Peinture (mur + plafond)','Sous couche',[],[],[{name:'Sous-couche universelle 10L',price:null}]),
    t('App 1','Chambre','Peinture (mur + plafond)','Couche 1',['Sous couche'],[],[{name:'Peinture blanche mat 10L',price:null}]),
    t('App 1','Chambre','Peinture (mur + plafond)','Couche 2',['Couche 1']),
    t('App 1','Chambre','Finitions','Plinthes',['Couche 2'],[],[{name:'Plinthes MDF 2.4m x6',price:null},{name:'Mastic blanc',price:null}]),
    t('App 1','Salon','Placage','Dessus ouverture'),
    t('App 1','Salon','Enduit','Couche 1 quart'),
    t('App 1','Salon','Enduit','Ponçage 1 quart',['Couche 1 quart']),
    t('App 1','Salon','Enduit','Couche 2 quart',['Ponçage 1 quart']),
    t('App 1','Salon','Enduit','Ponçage 2 quart',['Couche 2 quart']),
    t('App 1','Salon','Peinture (mur + plafond + 2 portes)','Sous couche',['Ponçage 2 quart']),
    t('App 1','Salon','Peinture (mur + plafond + 2 portes)','Couche 1',['Sous couche']),
    t('App 1','Salon','Peinture (mur + plafond + 2 portes)','Couche 2',['Couche 1']),
    t('App 1','Salon','Électricité','Ampoule plafond',[],[],[{name:'Ampoule LED E27',price:null}]),
    t('App 1','Salon','Électricité','3 interrupteurs (1 avant placage)',[],[],[{name:'Interrupteurs x3',price:null}]),
    t('App 1','Salon','Électricité','3 prises',[],[],[{name:'Prises x3',price:null}]),
    t('App 1','Salon','Électricité','Cacher ou installer clim'),
    t('App 1','Salon','Sol','Ragréage ?',[],[],[{name:'Ragréage autonivelant 25kg',price:null}]),
    t('App 1','Salon','Sol','Sol (parquet ?)',['Ragréage ?'],[],[{name:'Parquet flottant (mesurer surface)',price:null},{name:'Sous-couche parquet',price:null}]),
    t('App 1','Salon','Sol','Plinthes',['Sol (parquet ?)'],[],[{name:'Plinthes assorties parquet',price:null}]),
    t('App 1','Salon','Sol','Jointure cuisine'),
    t('App 1','Cuisine','Entrée','Installation + coffrage porte entrée',[],[],[{name:'Porte entrée',price:null},{name:'Bâti',price:null},{name:'Mousse isolante',price:null}]),
    t('App 1','Cuisine','Entrée','Disquer et peindre ancienne attache volet'),
    t('App 1','Cuisine','Électricité','Retirer vieille lampe'),
    t('App 1','Cuisine','Électricité','Installation 6 prises',[],[],[{name:'Prises x6',price:null}]),
    t('App 1','Cuisine','Électricité','Lampe sur plan de travail',[],[],[{name:'Réglette LED plan de travail',price:null}]),
    t('App 1','Cuisine','Électricité','Baguette + ampoule plafond',[],[],[{name:'Baguette PVC',price:null},{name:'Ampoule LED',price:null}]),
    t('App 1','Cuisine','Électricité','Interrupteur',[],[],[{name:'Interrupteur',price:null}]),
    t('App 1','Cuisine','Peinture (mur + plafond + 1 porte)','Sous couche'),
    t('App 1','Cuisine','Peinture (mur + plafond + 1 porte)','Couche 1',['Sous couche']),
    t('App 1','Cuisine','Peinture (mur + plafond + 1 porte)','Couche 2',['Couche 1']),
    t('App 1','Cuisine','Enduit','Couche 2'),
    t('App 1','Cuisine','Enduit','Ponçage 2',['Couche 2']),
    t('App 1','Cuisine','Eau','Évacuation évier',[],[],[{name:'Siphon',price:null},{name:'Tuyau évacuation',price:null}]),
    t('App 1','Cuisine','Eau','Eau chaude / froide évier',[],[],[{name:'Flexibles mitigeur',price:null},{name:"Robinets d'arrêt",price:null}]),
    t('App 1','Cuisine','Meubles','Meuble + évier + mitigeur',['Eau chaude / froide évier'],[],[{name:'Meuble sous-évier',price:null},{name:'Évier inox',price:null},{name:'Mitigeur',price:null}]),
    t('App 1','Cuisine','Meubles','Meuble 50 côté frigo',[],[],[{name:'Meuble bas 50cm',price:null}]),
    t('App 1','Cuisine','Meubles','Frigo',[],[],[{name:'Réfrigérateur (mesurer niche)',price:null}]),
    t('App 1','Cuisine','Meubles','Plaque de cuisson',[],[],[{name:'Plaque induction 2 feux',price:null}]),
    t('App 1','Cuisine','Meubles','Plan de travail',[],[],[{name:'Plan de travail (mesurer longueur)',price:null}]),
    t('App 1','Salle de bain','Sol','Plancher'),
    t('App 1','Salle de bain','Sol','Sol (lino)',['Plancher'],[],[{name:'Lino vinyle (mesurer surface)',price:null},{name:'Colle lino',price:null}]),
    t('App 1','Salle de bain','Eau','Installation chauffe-eau',[],[],[{name:'Chauffe-eau',price:null},{name:'Flexibles',price:null},{name:"Robinets d'arrêt",price:null}]),
    t('App 1','Salle de bain','Eau','Installation toilette',[],[],[{name:'WC suspendu ou au sol',price:null},{name:'Réservoir',price:null},{name:'Fixations',price:null}]),
    t('App 1','Salle de bain','Eau','Nourricière',[],[],[{name:'Collecteur/nourricière',price:null}]),
    t('App 1','Salle de bain','Eau','Placage hydro + normal',[],[],[{name:'Plaque hydrofuge',price:null},{name:'Plaque standard BA13',price:null}]),
    t('App 1','Salle de bain','Eau','Arrivées eau toilette évier',[],[],[{name:'Flexibles',price:null},{name:"Robinets d'arrêt x2",price:null}]),
    t('App 1','Salle de bain','Meubles','Meuble + vasque',['Arrivées eau toilette évier'],[],[{name:'Meuble vasque',price:null},{name:'Vasque à poser',price:null},{name:'Mitigeur lavabo',price:null}]),
    t('App 1','Salle de bain','Électricité','Séparation douche / évier'),
    t('App 1','Salle de bain','Électricité','Électricité App 2 et 3 avant plancher',['Plancher']),
    t('App 1','Salle de bain','Électricité','Interrupteur',[],[],[{name:'Interrupteur IP44 salle de bain',price:null}]),
    t('App 1','Salle de bain','Électricité','Prévoir prises',[],[],[{name:'Prises IP44 x2',price:null}]),
    t('App 1','Salle de bain','Électricité','Passer câbles clim'),
    t('App 1','Salle de bain','Électricité','Lumière 1 (sur porte)',[],[],[{name:'Plafonnier IP44',price:null}]),
    t('App 1','Salle de bain','Électricité','Lumière 2 (sur évier)',[],[],[{name:'Miroir lumineux ou applique IP44',price:null}]),
    t('App 1','Salle de bain','Douche','Carrelage douche',[],[],[{name:'Carrelage mural (mesurer surface)',price:null},{name:'Colle flex',price:null},{name:'Joint époxy',price:null}]),
    t('App 1','Salle de bain','Douche','Installation receveur',['Carrelage douche'],[],[{name:'Receveur douche',price:null},{name:'Bonde',price:null},{name:'Paroi ou rideau',price:null}]),
    t('App 1','Salle de bain','Enduit','Enduit 1'),
    t('App 1','Salle de bain','Enduit','Ponçage 1',['Enduit 1']),
    t('App 1','Salle de bain','Enduit','Enduit 2',['Ponçage 1']),
    t('App 1','Salle de bain','Enduit','Ponçage 2',['Enduit 2']),
    t('App 1','Salle de bain','Peinture (mur + plafond)','Sous couche',['Ponçage 2']),
    t('App 1','Salle de bain','Peinture (mur + plafond)','Couche 1',['Sous couche']),
    t('App 1','Salle de bain','Peinture (mur + plafond)','Couche 2',['Couche 1']),
  ].map(r => ({ ...r, _tmpId: id++ }))

  return raw.map(task => {
    const blocked_by_ids = (task.blockedByLabels || []).map((label: string) => {
      const found = raw.find(t => t.label === label && t.app === task.app)
      return found ? found._tmpId : null
    }).filter(Boolean) as number[]
    const { blockedByLabels, _tmpId, ...rest } = task
    return { ...rest, blocked_by_ids, id: _tmpId }
  })
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ChantierApp() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [apps, setApps] = useState<string[]>(['App 1', 'App 2', 'App 3', 'Extérieur'])
  const [currentApp, setCurrentApp] = useState('App 1')
  const [activeFilter, setActiveFilter] = useState('all')
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
  const [addBlockedIds, setAddBlockedIds] = useState<number[]>([])
  const [addAssignees, setAddAssignees] = useState<string[]>([])
  const [addPurchases, setAddPurchases] = useState<Purchase[]>([])

  // Edit form
  const [editLabel, setEditLabel] = useState('')
  const [editBlockedIds, setEditBlockedIds] = useState<number[]>([])
  const [editAssignees, setEditAssignees] = useState<string[]>([])
  const [editPurchases, setEditPurchases] = useState<Purchase[]>([])

  // Picker dropdowns open state
  const [openPicker, setOpenPicker] = useState<string | null>(null)

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

  async function loadTasks() {
    setLoading(true)
    const { data, error } = await supabase.from('tasks').select('*').order('id')
    if (error) { console.error(error); setLoading(false); return }

    if (!data || data.length === 0) {
      // Seed
      const seed = makeSeedTasks()
      const { data: inserted } = await supabase.from('tasks').insert(seed).select()
      if (inserted) setTasks(inserted as Task[])
    } else {
      setTasks(data as Task[])
      const uniqueApps = [...new Set([...['App 1', 'App 2', 'App 3', 'Extérieur'], ...data.map((t: Task) => t.app)])]
      setApps(uniqueApps)
    }
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
  function filterTask(task: Task) {
    if (activeFilter === 'done') return task.done
    if (activeFilter === 'blocked') return isBlocked(task) && !task.done
    if (activeFilter === 'todo') return !task.done && !isBlocked(task)
    return true
  }

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function toggleTask(id: number) {
    const task = tasks.find(t => t.id === id)
    if (!task) return
    if (isBlocked(task) && !task.done) {
      showToast("⛔ Tâche bloquée — terminez les dépendances d'abord")
      return
    }
    const newDone = !task.done
    const { error } = await supabase.from('tasks').update({ done: newDone }).eq('id', id)
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
    const { data, error } = await supabase.from('tasks').insert(newTask).select().single()
    if (error) { console.error(error); return }
    setTasks(prev => [...prev, data as Task])
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
    const { error } = await supabase.from('tasks').update(updates).eq('id', editTask.id)
    if (error) { console.error(error); return }
    setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...updates } : t))
    setEditModal(false)
    showToast('✓ Tâche modifiée')
  }

  async function deleteTask(id: number) {
    if (!confirm('Supprimer cette tâche ?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { console.error(error); return }
    // Remove from blockedByIds of other tasks
    const affected = tasks.filter(t => t.blocked_by_ids?.includes(id))
    for (const t of affected) {
      const newIds = t.blocked_by_ids.filter(bid => bid !== id)
      await supabase.from('tasks').update({ blocked_by_ids: newIds }).eq('id', t.id)
    }
    setTasks(prev => prev
      .filter(t => t.id !== id)
      .map(t => ({ ...t, blocked_by_ids: (t.blocked_by_ids || []).filter(bid => bid !== id) }))
    )
    setEditModal(false)
    showToast('Tâche supprimée')
  }

  // ── Open modals ──────────────────────────────────────────────────────────────
  function openAdd() {
    setAddApp(currentApp)
    setAddRoom(getRooms(currentApp)[0] || 'Chambre')
    setAddCat(getCats(currentApp, getRooms(currentApp)[0] || 'Chambre')[0] || 'Autre')
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

  // ── Stats ────────────────────────────────────────────────────────────────────
  const statDone = tasks.filter(t => t.done).length
  const statTotal = tasks.length
  const statBlocked = tasks.filter(t => isBlocked(t) && !t.done).length

  // ── Picker helpers ───────────────────────────────────────────────────────────
  function toggleBlockedId(id: number, setter: React.Dispatch<React.SetStateAction<number[]>>) {
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  function toggleAssignee(name: string, setter: React.Dispatch<React.SetStateAction<string[]>>) {
    setter(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name])
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
  const addTaskOptions = tasks.filter(t => t.app === addApp)
  const editTaskOptions = editTask ? tasks.filter(t => t.app === editTask.app && t.id !== editTask.id) : []

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
      </header>

      {/* Tabs */}
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

      {/* Main */}
      <main>
        <div className="toolbar">
          <div className="toolbar-filters">
            {(['all','todo','blocked','done'] as const).map(f => (
              <button key={f} className={`filter-btn${activeFilter === f ? ' active' : ''}`} onClick={() => setActiveFilter(f)}>
                {f === 'all' ? 'Tout' : f === 'todo' ? 'À faire' : f === 'blocked' ? 'Bloquées' : 'Terminées'}
              </button>
            ))}
          </div>
          <button className="btn-primary" onClick={openAdd}>＋ Ajouter</button>
        </div>

        <div id="roomsContainer">
          {rooms.length === 0 ? (
            <div className="empty">Aucune tâche pour {currentApp} — cliquez sur "＋ Ajouter".</div>
          ) : rooms.map(room => {
            const roomTasks = tasks.filter(t => t.app === currentApp && t.room === room)
            const roomDone = roomTasks.filter(t => t.done).length
            const pct = roomTasks.length ? Math.round(roomDone / roomTasks.length * 100) : 0
            const filteredRoom = roomTasks.filter(filterTask)
            if (!filteredRoom.length && activeFilter !== 'all') return null
            const cats = getCats(currentApp, room)

            return (
              <RoomSection key={room} room={room} pct={pct}>
                {cats.map(cat => {
                  const catTasks = tasks.filter(t => t.app === currentApp && t.room === room && t.cat === cat)
                  const filtered = catTasks.filter(filterTask)
                  if (!filtered.length && activeFilter !== 'all') return null
                  return (
                    <div key={cat} className="category">
                      <div className="category-title">
                        <span className="cat-icon">{getCatIcon(cat)}</span>{cat}
                      </div>
                      {filtered.map(task => {
                        const blocked = isBlocked(task)
                        const blockingLabels = getBlockingLabels(task)
                        const blockedPending = blockingLabels.filter(b => !b.done)
                        const blockedOk = blockingLabels.filter(b => b.done)
                        return (
                          <div key={task.id} className={`task${task.done ? ' done' : blocked ? ' blocked' : ''}`} onClick={() => openEdit(task)}>
                            <button className="task-check" onClick={e => { e.stopPropagation(); toggleTask(task.id) }}>
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
                      })}
                    </div>
                  )
                })}
              </RoomSection>
            )
          })}
        </div>
      </main>

      {/* Modal Add */}
      {addModal && (
        <div className="modal-overlay open" onClick={e => { if (e.target === e.currentTarget) setAddModal(false) }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Nouvelle tâche</div>
            <div className="field">
              <label>Appartement</label>
              <select value={addApp} onChange={e => { setAddApp(e.target.value); setAddRoom(getRooms(e.target.value)[0] || 'Chambre') }}>
                {apps.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Pièce</label>
              <select value={addRoom} onChange={e => { setAddRoom(e.target.value); setAddCat(getCats(addApp, e.target.value)[0] || 'Autre') }}>
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
  options: { id: number; label: string }[]
  selectedIds: number[]
  onToggle: (id: number) => void
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
  function add() { onChange([...purchases, { name: '', price: null }]) }
  const total = purchases.reduce((s, p) => s + (p.price || 0), 0)

  return (
    <>
      <div style={{ display: 'flex', gap: 6, marginBottom: 4, padding: '0 2px' }}>
        <div style={{ flex: 1, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Libellé</div>
        <div style={{ width: 80, fontSize: 11, color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prix</div>
        <div style={{ width: 34 }} />
      </div>
      {purchases.map((p, i) => (
        <div key={i} className="purchase-row">
          <input className="purchase-name" type="text" placeholder="Libellé" value={p.name} onChange={e => update(i, 'name', e.target.value)} />
          <div className="purchase-price-wrap">
            <input className="purchase-price" type="number" min="0" step="0.01" placeholder="0" value={p.price ?? ''} onChange={e => update(i, 'price', e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <button className="remove-purchase" onClick={() => remove(i)}>✕</button>
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
  main { padding: 20px; max-width: 960px; margin: 0 auto; }
  .toolbar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
  .toolbar-filters { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; }
  .filter-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid var(--border); background: none; color: var(--text-muted); font-size: 14px; cursor: pointer; transition: all 0.15s; }
  .filter-btn:hover { border-color: var(--text-muted); color: var(--text); }
  .filter-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }
  .btn-primary { padding: 8px 16px; background: var(--accent); color: #fff; border: none; border-radius: var(--radius); font-size: 16px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; display: flex; align-items: center; gap: 6px; }
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
  .task { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 6px; margin-top: 2px; transition: background 0.1s; position: relative; cursor: pointer; }
  .task:hover { background: var(--surface2); }
  .task.done { opacity: 0.45; }
  .task.done .task-label { text-decoration: line-through; color: var(--text-muted); }
  .task.blocked { background: var(--stripe); border: 1px solid rgba(231,76,60,0.2); }
  .task.blocked .task-label { color: var(--text-muted); }
  .task-check { width: 18px; height: 18px; border-radius: 4px; border: 2px solid var(--border); background: none; cursor: pointer; flex-shrink: 0; margin-top: 2px; display: grid; place-items: center; transition: all 0.15s; }
  .task-check:hover { border-color: var(--accent); background: var(--accent-dim); }
  .task.done .task-check { background: var(--green); border-color: var(--green); }
  .task.blocked .task-check { opacity: 0.4; cursor: not-allowed; pointer-events: none; }
  .checkmark { color: #fff; font-size: 10px; font-weight: 900; display: none; }
  .task.done .checkmark { display: block; }
  .task-body { flex: 1; min-width: 0; }
  .task-label { font-size: 16px; line-height: 1.4; }
  .task-meta { display: flex; gap: 5px; margin-top: 4px; flex-wrap: wrap; align-items: center; }
  .badge { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
  .badge-blocked { background: var(--red-dim); color: var(--red); }
  .badge-ok { background: var(--green-dim); color: var(--green); }
  .badge-person { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(74,158,255,0.2); }
  .badge-shop { background: var(--orange-dim); color: var(--orange); border: 1px solid rgba(243,156,18,0.2); }
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
  .purchase-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; }
  .purchase-name { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 8px 10px; font-size: 16px; font-family: inherit; outline: none; transition: border-color 0.15s; }
  .purchase-name:focus { border-color: var(--accent); }
  .purchase-price-wrap { position: relative; flex-shrink: 0; }
  .purchase-price-wrap::after { content: '€'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px; pointer-events: none; }
  .purchase-price { width: 80px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); padding: 8px 24px 8px 10px; font-size: 16px; font-family: inherit; outline: none; transition: border-color 0.15s; -moz-appearance: textfield; appearance: textfield; }
  .purchase-price::-webkit-outer-spin-button, .purchase-price::-webkit-inner-spin-button { -webkit-appearance: none; }
  .purchase-price:focus { border-color: var(--accent); }
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
  .toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--surface2); border: 1px solid var(--border); color: var(--text); padding: 10px 18px; border-radius: 8px; font-size: 16px; z-index: 300; opacity: 0; transition: opacity 0.2s; pointer-events: none; white-space: nowrap; }
  .toast.show { opacity: 1; }
  @media (max-width: 600px) { main { padding: 12px; } .header-stats { display: none; } .progress-bar { width: 50px; } .modal { padding: 16px; } }
`
