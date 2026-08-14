import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Pause,
  ImageIcon,
  RefreshCcw,
  Sparkles
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminAutoCoverStats, processAdminAutoCovers } from "@/lib/admin-igdb.functions";
import { toast } from "sonner";

export function AdminAutoCoverPanel() {
  const [stats, setStats] = useState<{
    totalProducts: number;
    productsWithoutImages: number;
    productsWithIgdbCovers: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const getStatsFn = useServerFn(getAdminAutoCoverStats);
  const processFn = useServerFn(processAdminAutoCovers);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getStatsFn();
      setStats(data);
    } catch (e) {
      toast.error("Statistika yüklənərkən xəta");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const startProcessing = async () => {
    if (!stats || stats.productsWithoutImages === 0) {
      toast.info("Şəkilsiz məhsul yoxdur");
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setProcessedCount(0);
    setAppliedCount(0);
    setProgress(0);

    const totalToProcess = stats.productsWithoutImages;
    const BATCH_LIMIT = 20;

    try {
      while (processedCount < totalToProcess) {
        if (isPaused) break;

        const result = await processFn({ data: { limit: BATCH_LIMIT } });
        
        if (result.processed === 0 || result.status === "completed") {
          break;
        }

        const newProcessed = processedCount + result.processed;
        const newApplied = appliedCount + (result.applied || 0);
        
        setProcessedCount(newProcessed);
        setAppliedCount(newApplied);
        setProgress(Math.min(100, Math.round((newProcessed / totalToProcess) * 100)));

        // Small break between batches
        await new Promise(r => setTimeout(r, 1000));
        
        // Refresh stats periodically
        if (newProcessed % 100 === 0) {
          loadStats();
        }
      }
      
      if (!isPaused) {
        toast.success(`Proses tamamlandı! ${appliedCount} şəkil əlavə edildi.`);
        loadStats();
      }
    } catch (error: any) {
      console.error("Auto-process error:", error);
      toast.error(error.message || "Proses zamanı xəta");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-neon" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-lighter p-6 rounded-2xl border border-border card-shadow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Ümumi Məhsul</p>
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats?.totalProducts || 0}</span>
          </div>
        </div>
        <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20 card-shadow">
          <p className="text-xs text-red-500 uppercase tracking-wider font-semibold mb-1">Şəkilsiz Məhsul</p>
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-red-500" />
            <span className="text-2xl font-bold text-red-500">{stats?.productsWithoutImages || 0}</span>
          </div>
        </div>
        <div className="bg-green-500/5 p-6 rounded-2xl border border-green-500/20 card-shadow">
          <p className="text-xs text-green-500 uppercase tracking-wider font-semibold mb-1">IGDB ilə tamamlanan</p>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold text-green-500">{stats?.productsWithIgdbCovers || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-lighter p-8 rounded-2xl border border-neon/20 card-shadow">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="h-20 w-20 rounded-full bg-neon/10 flex items-center justify-center text-neon shrink-0">
            {isProcessing ? (
              <RefreshCcw className="h-10 w-10 animate-spin" />
            ) : (
              <ImageIcon className="h-10 w-10" />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <h3 className="text-xl font-bold">Bütün məhsullara logo əlavə et</h3>
            <p className="text-muted-foreground max-w-xl">
              Sistem bütün logosuz məhsulları analiz edəcək və IGDB bazasından uyğun şəkilləri taparaq avtomatik əlavə edəcək.
              Yalnız yüksək uyğunluq (90%+) olan şəkillər tətbiq olunacaq.
            </p>
          </div>

          <div className="shrink-0 flex gap-3">
            {!isProcessing ? (
              <Button 
                onClick={startProcessing} 
                disabled={stats?.productsWithoutImages === 0}
                className="bg-neon text-background hover:opacity-90 px-8 h-12 text-base font-bold rounded-xl neon-ring"
              >
                <Play className="h-5 w-5 mr-2" /> Başlat
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsPaused(!isPaused)}
                  className="border-neon/50 text-neon hover:bg-neon/10 h-12"
                >
                  {isPaused ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                  {isPaused ? "Davam et" : "Dayandır"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {isProcessing && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>{isPaused ? "Dayandırılıb" : "Prosessor işləyir..."}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-3 bg-background" />
            <div className="grid grid-cols-2 gap-4 mt-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              <div>Yoxlanıldı: <span className="text-foreground text-sm ml-1">{processedCount}</span></div>
              <div className="text-right">Əlavə edildi: <span className="text-neon text-sm ml-1">{appliedCount}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { Package } from "lucide-react";
