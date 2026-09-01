import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { Student } from '../db';
import { byClasse, byName, fullName, matchesQuery } from '../utils/students';

interface Props {
  /** Élèves sélectionnables (déjà filtrés sur les élèves encore inscrits). */
  students: Student[] | undefined;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

/** Au-delà, on n'affiche pas tout : on invite à préciser la recherche. */
const MAX_RESULTS = 60;

/**
 * Choix d'un élève.
 *
 * La recherche par nom est le chemin principal : parcourir les classes en
 * faisant défiler une bande horizontale était l'opération la plus pénible de
 * l'application, précisément au moment où l'on est debout au bord du terrain.
 * Les classes restent disponibles, mais sur plusieurs lignes, toutes visibles
 * d'un coup, et seulement tant qu'aucune recherche n'est en cours.
 */
export const StudentPicker = ({ students, selectedId, onSelect }: Props) => {
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const classes = useMemo(
    () => [...new Set((students ?? []).map((s) => s.classe))].sort(byClasse),
    [students]
  );

  const selected = students?.find((s) => s.id === selectedId) ?? null;

  const query = search.trim();

  // La recherche prime sur la classe : dès qu'on tape, on cherche partout.
  const results = useMemo(() => {
    if (!students) return [];
    const base = query
      ? students.filter((s) => matchesQuery(s, query))
      : selectedClass
        ? students.filter((s) => s.classe === selectedClass)
        : [];
    return [...base].sort(byName);
  }, [students, query, selectedClass]);

  /* --- Un élève est choisi : on replie le sélecteur --- */

  if (selected) {
    return (
      <div className="picked-student">
        <div style={{ minWidth: 0 }}>
          <div className="picked-student-name">{fullName(selected)}</div>
          <div className="picked-student-classe">{selected.classe}</div>
        </div>
        <button
          type="button"
          className="picked-student-change"
          onClick={() => onSelect(null)}
        >
          Changer
        </button>
      </div>
    );
  }

  /* --- Sélection --- */

  return (
    <div style={{ marginBottom: '20px' }}>
      <label className="form-label" htmlFor="student-search">Élève :</label>

      <div className="search-box">
        <Search size={20} className="search-box-icon" />
        <input
          id="student-search"
          type="search"
          className="search-box-input"
          placeholder="Nom, prénom ou classe…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        {search && (
          <button
            type="button"
            className="search-box-clear"
            onClick={() => setSearch('')}
            aria-label="Effacer la recherche"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Les classes ne servent plus qu'à parcourir sans savoir qui chercher.
          Sur plusieurs lignes : plus rien à faire défiler du pouce. */}
      {!query && (
        <div className="class-grid">
          {classes.map((c) => (
            <button
              key={c}
              type="button"
              className={`class-chip ${selectedClass === c ? 'active' : ''}`}
              onClick={() => setSelectedClass(selectedClass === c ? '' : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {!students ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Chargement…</p>
      ) : !query && !selectedClass ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px', fontSize: '0.9rem' }}>
          Tapez les premières lettres d'un nom, ou choisissez une classe.
        </p>
      ) : results.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
          Aucun élève ne correspond.
        </p>
      ) : (
        <>
          <div className="student-grid">
            {results.slice(0, MAX_RESULTS).map((s) => (
              <button
                key={s.id}
                type="button"
                className="student-card"
                onClick={() => onSelect(s.id!)}
              >
                <strong>{s.lastName.toUpperCase()}</strong>
                <small>{s.firstName}</small>
                {/* La classe n'est plus déductible du contexte quand on
                    cherche par nom à travers tous les niveaux. */}
                {query && <small className="student-card-classe">{s.classe}</small>}
              </button>
            ))}
          </div>

          {results.length > MAX_RESULTS && (
            <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '0.8rem', marginBottom: 0 }}>
              {results.length - MAX_RESULTS} autres élèves — précisez la recherche.
            </p>
          )}
        </>
      )}
    </div>
  );
};
