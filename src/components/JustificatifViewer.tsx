import { useState, useEffect, useRef } from 'react';
import { FileText, X } from 'lucide-react';

interface Props {
  photo?: Blob | File;
  /** Style compact : petite pastille au lieu du bouton texte */
  compact?: boolean;
}

/**
 * Affiche le justificatif (photo ou PDF) stocké avec une dispense.
 *
 * L'URL objet n'est créée qu'à l'ouverture et libérée à la fermeture :
 * sans cela, chaque consultation garderait le blob en mémoire jusqu'au
 * rechargement de la page.
 */
export const JustificatifViewer = ({ photo, compact = false }: Props) => {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!photo) return;
    const objectUrl = URL.createObjectURL(photo);
    urlRef.current = objectUrl;
    setUrl(objectUrl);
  };

  const close = () => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setUrl(null);
  };

  // Libération de secours si le composant disparaît alors que la
  // visionneuse est encore ouverte.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  // Fermeture à la touche Échap / au bouton retour
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [url]);

  if (!photo) return null;

  const isPdf = photo.type === 'application/pdf';

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={compact ? 'justificatif-pill' : 'justificatif-btn'}
        title="Voir le justificatif"
      >
        <FileText size={compact ? 14 : 16} />
        {!compact && <span>Justificatif</span>}
      </button>

      {url && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <strong>Justificatif</strong>
              <button type="button" onClick={close} className="modal-close" aria-label="Fermer">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {isPdf ? (
                <iframe src={url} title="Justificatif" className="modal-pdf" />
              ) : (
                <img src={url} alt="Justificatif" className="modal-img" />
              )}
            </div>

            <a
              href={url}
              download={isPdf ? 'justificatif.pdf' : 'justificatif.jpg'}
              className="modal-download"
            >
              Ouvrir dans une autre application
            </a>
          </div>
        </div>
      )}
    </>
  );
};
