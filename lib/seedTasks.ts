import type { Purchase } from './notion'

export type SeedTask = {
  app: string
  room: string
  cat: string
  label: string
  blockedByLabels: string[]
  assignees: string[]
  purchases: Purchase[]
}

function t(
  app: string, room: string, cat: string, label: string,
  blockedByLabels: string[] = [], assignees: string[] = [], purchases: Purchase[] = []
): SeedTask {
  return { app, room, cat, label, blockedByLabels, assignees, purchases }
}

export const SEED_TASKS: SeedTask[] = [
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
]
