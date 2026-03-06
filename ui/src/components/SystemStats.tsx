import { useEffect, useState } from 'react';
import { HardDrive, Loader2, Trash2 } from 'lucide-react';
import { formatBytes } from '@/lib/format';
import { Button } from '@/components/ui/button'; // Ajout de l'import Button

interface StorageData {
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  free_percent: number;
}

export function SystemStats() {
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false); // État pour l'animation du nettoyage

  const fetchStorage = async () => {
    try {
      const response = await fetch('/api/system/storage');
      if (!response.ok) throw new Error();
      const data = await response.json();
      setStorage(data);
      setError(false);
    } catch (err) {
      console.error("Erreur lecture disque:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // NOUVEAU : Fonction qui appelle le nettoyage Go
  const handleCleanTemp = async () => {
    setIsCleaning(true);
    try {
      await fetch('/api/system/clean-tmp', { method: 'POST' });
      await fetchStorage(); // On met à jour les chiffres pour voir la place libérée !
    } catch (err) {
      console.error("Erreur lors du nettoyage:", err);
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    fetchStorage();
    const interval = setInterval(fetchStorage, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (error || !storage) return null;

  const usedPercent = storage.total_bytes > 0 
    ? Math.round((storage.used_bytes / storage.total_bytes) * 100) 
    : 0;
  
  const getProgressColor = () => {
    if (usedPercent > 95) return 'bg-destructive';
    if (usedPercent > 80) return 'bg-orange-500';
    return 'bg-primary';
  };

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 rounded-md border border-border/50">
      <div className="flex flex-col gap-1 min-w-[140px]">
        <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          <span className="flex items-center gap-1 italic">
            <HardDrive className="w-3 h-3" /> System
          </span>
          <span>{usedPercent}%</span>
        </div>
        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-700 ${getProgressColor()}`} 
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="text-[9px] text-muted-foreground font-mono flex justify-between">
          <span>Free: {formatBytes(storage.free_bytes)}</span>
        </div>
      </div>

      {/* NOUVEAU : La petite ligne de séparation et le bouton Poubelle */}
      <div className="pl-2 py-1 border-l border-border/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={handleCleanTemp}
          disabled={isCleaning}
          title="Clean Temporary Files"
        >
          {isCleaning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}