import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

export const ExemptionList = () => {
  // 1. On récupère les dispenses ET les élèves pour afficher les noms
  const exemptions = useLiveQuery(() => db.exemptions.toArray());
  const students = useLiveQuery(() => db.students.toArray());

  // 2. Action : Supprimer définitivement
  const handleDelete = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette dispense ?")) {
      db.exemptions.delete(id);
    }
  };

  // 3. Action : Arrêter la dispense aujourd'hui (Guérison)
  const handleStop = (id: number) => {
    if (confirm("L'élève est-il apte à reprendre aujourd'hui ?")) {
      const today = new Date().toISOString().split('T')[0];
      // On met à jour SEULEMENT la date de fin
      db.exemptions.update(id, { endDate: today });
    }
  };

  // Petite fonction pour trouver le nom de l'élève grâce à son ID
  const getStudentName = (id: number) => {
    const s = students?.find(student => student.id === id);
    return s ? `${s.lastName.toUpperCase()} ${s.firstName} (${s.classe})` : 'Élève inconnu';
  };

  // Fonction pour vérifier si une dispense est active (date de fin dans le futur)
  const isActive = (endDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    return endDate >= today;
  };

  if (!exemptions || exemptions.length === 0) return null;

  return (
    <div className="card">
      <h3>📋 Liste des dispenses ({exemptions.length})</h3>
      
      <ul style={{listStyle: 'none', padding: 0}}>
        {/* On trie pour avoir les plus récentes en haut */}
        {exemptions.sort((a, b) => b.startDate.localeCompare(a.startDate)).map(ex => (
          <li key={ex.id} style={{
            borderBottom: '1px solid #eee', 
            padding: '15px 0',
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            opacity: isActive(ex.endDate) ? 1 : 0.5 // On grise les anciennes
          }}>
            
            {/* INFO GAUCHE */}
            <div>
              <div style={{fontWeight: 'bold', fontSize: '1.1rem'}}>
                {getStudentName(ex.studentId)}
              </div>
              <div style={{color: '#666', fontSize: '0.9rem', marginTop: '4px'}}>
                {ex.type === 'full' ? '🔴 Inapte Total' : `🟠 Partiel : ${ex.sport}`}
              </div>
              <div style={{fontSize: '0.8rem', color: '#888'}}>
                Du {new Date(ex.startDate).toLocaleDateString()} au {new Date(ex.endDate).toLocaleDateString()}
              </div>
              
              {/* Indicateur visuel */}
              {isActive(ex.endDate) 
                ? <span style={{color: 'green', fontWeight: 'bold', fontSize:'0.8rem'}}>En cours</span>
                : <span style={{color: 'gray', fontSize:'0.8rem'}}>Terminée</span>
              }
            </div>

            {/* BOUTONS DROITE */}
            <div style={{display: 'flex', flexDirection: 'column', gap: '5px'}}>
              
              {/* Bouton STOP (Seulement si encore active) */}
              {isActive(ex.endDate) && (
                <button 
                  onClick={() => ex.id && handleStop(ex.id)}
                  style={{
                    background: '#f59e0b', color: 'white', border: 'none', 
                    padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                  }}
                >
                  Arrêter
                </button>
              )}

              {/* Bouton SUPPRIMER */}
              <button 
                onClick={() => ex.id && handleDelete(ex.id)}
                style={{
                  background: '#ef4444', color: 'white', border: 'none', 
                  padding: '5px 10px', borderRadius: '4px', cursor: 'pointer'
                }}
              >
                Supprimer
              </button>
            </div>

          </li>
        ))}
      </ul>
    </div>
  );
};