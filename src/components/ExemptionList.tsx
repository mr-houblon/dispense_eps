import { useMemo, useState } from 'react';
import { db, type Student } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { JustificatifViewer } from './JustificatifViewer';
import { isArchived, matchesQuery, normalize } from '../utils/students';

type Filter = 'active' | 'done' | 'all';

export const ExemptionList = () => {
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');

  // Lecture complète, puis tri en mémoire.
  //
  // La v1.6 triait via l'index startDate (db.exemptions.orderBy('startDate')).
  // Piège classique d'IndexedDB : un parcours d'index ignore purement et
  // simplement les enregistrements dont la clé indexée est absente ou
  // invalide. Une seule dispense à la date malformée suffisait donc à la
  // faire disparaître de l'historique, sans erreur ni trace.
  const exemptions = useLiveQuery(() => db.exemptions.toArray());
  const students = useLiveQuery(() => db.students.toArray());

  const today = new Date().toISOString().split('T')[0];
  const isActive = (endDate: string) => endDate >= today;

  // Index par identifiant : la recherche appelait students.find() pour chaque
  // dispense, soit un balayage complet de la liste à chaque frappe.
  const studentsById = useMemo(() => {
    const map = new Map<number, Student>();
    for (const s of students ?? []) if (s.id !== undefined) map.set(s.id, s);
    return map;
  }, [students]);

  const sorted = useMemo(
    () => [...(exemptions ?? [])].sort(
      (a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')
    ),
    [exemptions]
  );

  const handleDelete = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dispense ?')) {
      db.exemptions.delete(id);
    }
  };

  const handleStop = (id: number) => {
    if (confirm("L'élève est-il apte à reprendre aujourd'hui ?")) {
      db.exemptions.update(id, { endDate: today });
    }
  };

  const getStudentName = (id: number) => {
    const s = studentsById.get(id);
    return s ? `${s.lastName.toUpperCase()} ${s.firstName} (${s.classe})` : 'Élève inconnu';
  };

  /* --- Chargement / état vide --- */

  if (!exemptions || !students) {
    return <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>Chargement…</div>;
  }

  if (exemptions.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📭</div>
        Aucune dispense enregistrée pour l'instant.
        <div style={{ fontSize: '0.85rem', marginTop: '8px', color: '#9ca3af' }}>
          Utilisez l'onglet « Nouveau » pour en ajouter une.
        </div>
      </div>
    );
  }

  /* --- Filtrage --- */

  const query = search.trim();
  const visible = sorted.filter((ex) => {
    if (filter === 'active' && !isActive(ex.endDate)) return false;
    if (filter === 'done' && isActive(ex.endDate)) return false;

    if (query) {
      const s = studentsById.get(ex.studentId);
      // Fiche introuvable : on cherche dans le libellé affiché, pour que la
      // dispense reste atteignable malgré tout.
      const ok = s
        ? matchesQuery(s, query)
        : normalize('Élève inconnu').includes(normalize(query));
      if (!ok) return false;
    }
    return true;
  });

  const activeCount = sorted.filter((ex) => isActive(ex.endDate)).length;

  const filters: { id: Filter; label: string }[] = [
    { id: 'active', label: `En cours (${activeCount})` },
    { id: 'done', label: `Terminées (${sorted.length - activeCount})` },
    { id: 'all', label: `Toutes (${sorted.length})` },
  ];

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>📋 Historique</h3>

      {/* FILTRES */}
      <div className="filter-row">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`filter-chip ${filter === f.id ? 'active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* RECHERCHE */}
      <input
        type="search"
        className="input-field"
        placeholder="Rechercher un élève ou une classe…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: '10px' }}
      />

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '30px 0' }}>
          <p style={{ marginTop: 0 }}>Aucune dispense ne correspond.</p>
          {/* Le filtre « En cours » est actif par défaut : sans ce rappel, un
              historique bien rempli peut sembler vide. */}
          {filter !== 'all' && (
            <button type="button" className="filter-chip" onClick={() => setFilter('all')}>
              Voir les {sorted.length} dispenses
            </button>
          )}
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visible.map((ex) => {
            const student = studentsById.get(ex.studentId);

            return (
              <li
                key={ex.id}
                style={{
                  borderBottom: '1px solid #eee',
                  padding: '15px 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: isActive(ex.endDate) ? 1 : 0.55,
                }}
              >
                {/* INFO GAUCHE */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                    {getStudentName(ex.studentId)}
                  </div>

                  {/* L'élève ne figure plus dans la liste : on le signale,
                      sinon son absence des écrans de saisie ressemble à un bug. */}
                  {student && isArchived(student) && (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Retiré de la liste d'élèves
                    </div>
                  )}

                  <div style={{ color: '#666', fontSize: '0.9rem', marginTop: '4px' }}>
                    {ex.type === 'full' ? '🔴 Inapte Total' : `🟠 Partiel : ${ex.sport}`}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888' }}>
                    Du {new Date(ex.startDate).toLocaleDateString()} au{' '}
                    {new Date(ex.endDate).toLocaleDateString()}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {isActive(ex.endDate) ? (
                      <span style={{ color: 'green', fontWeight: 'bold', fontSize: '0.8rem' }}>En cours</span>
                    ) : (
                      <span style={{ color: 'gray', fontSize: '0.8rem' }}>Terminée</span>
                    )}

                    {/* JUSTIFICATIF : consultable, enfin */}
                    {ex.photo ? (
                      <JustificatifViewer photo={ex.photo} />
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>⚠️ Sans justificatif</span>
                    )}
                  </div>
                </div>

                {/* BOUTONS DROITE */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
                  {isActive(ex.endDate) && (
                    <button
                      onClick={() => ex.id && handleStop(ex.id)}
                      style={{
                        background: '#f59e0b', color: 'white', border: 'none',
                        padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
                      }}
                    >
                      Arrêter
                    </button>
                  )}

                  <button
                    onClick={() => ex.id && handleDelete(ex.id)}
                    style={{
                      background: '#ef4444', color: 'white', border: 'none',
                      padding: '6px 10px', borderRadius: '4px', cursor: 'pointer',
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
