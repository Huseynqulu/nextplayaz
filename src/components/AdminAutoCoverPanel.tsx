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
  Sparkles,
  Package,
  ShieldCheck,
  Zap,
  ChevronRight
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getAdminAutoCoverStats, processAdminAutoCovers, runCanaryTest } from "@/lib/admin-igdb.functions";
import { toast } from "sonner";

export function AdminAutoCoverPanel() {
  const [stats, setStats] = useState<{
    totalProducts: number;
    productsWithoutImages: number;
    productsWithIgdbCovers: number;
  } | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "canary" | "bulk">("idle");
  const [progress, setProgress] = useState(0);
  
  // Counters
  const [processedCount, setProcessedCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [noMatchCount, setNoMatchCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  
  const [loading, setLoading] = useState(true);

  const getStatsFn = useServerFn(getAdminAutoCoverStats);
  const processFn = useServerFn(processAdminAutoCovers);
  const canaryFn = useServerFn(runCanaryTest);

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

  const handleCanary = async () => {
    setCurrentStep("canary");
    setIsProcessing(true);
    try {
      toast.loading("Canary testi başladıldı...");
      const result = await canaryFn();
      if (result.success) {
        toast.success("Canary testi uğurla keçdi!");
        loadStats();
        // Automatically start bulk if user wants, or wait for manual trigger
        // Let's wait for manual for safety in this UI
      } else {
        toast.error("Canary testi uğursuz oldu. Loqları yoxlayın.");
      }
    } catch (e) {
      toast.error("Canary testi zamanı xəta");
    } finally {
      setIsProcessing(false);
      setCurrentStep("idle");
    }
  };

  const startBulk = async () => {
    if (!stats || stats.productsWithoutImages === 0) {
      toast.info("Şəkilsiz məhsul yoxdur");
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setCurrentStep("bulk");
    setProcessedCount(0);
    setAppliedCount(0);
    setReviewCount(0);
    setNoMatchCount(0);
    setErrorCount(0);
    setProgress(0);

    const totalToProcess = stats.productsWithoutImages;
    const BATCH_LIMIT = 20;
    let localProcessed = 0;

    try {
      while (localProcessed < totalToProcess) {
        if (isPaused) break;

        const result = await processFn({ data: { limit: BATCH_LIMIT, minConfidence: 90 } });
        
        if (!result || result.processed === 0 || result.status === "completed") break;

        localProcessed += result.processed;
        setProcessedCount(prev => prev + result.processed);
        setAppliedCount(prev => prev + (result.applied || 0));
        setReviewCount(prev => prev + (result.review || 0));
        setNoMatchCount(prev => prev + (result.noMatch || 0));
        setErrorCount(prev => prev + (result.errors || 0));
        
        setProgress(Math.min(100, Math.round((localProcessed / totalToProcess) * 100)));

        await new Promise(r => setTimeout(r, 1000));
        if (localProcessed % 60 === 0) loadStats();
      }
      
      if (!isPaused) {
        toast.success("Proses tamamlandı!");
        loadStats();
        setIsProcessing(false);
      }
    } catch (error: any) {
      toast.error("Proses dayandırıldı: " + error.message);
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
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-lighter p-6 rounded-2xl border border-border card-shadow">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Ümumi</p>
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{stats?.totalProducts || 0}</span>
          </div>
        </div>
        <div className="bg-red-500/5 p-6 rounded-2xl border border-red-500/20 card-shadow">
          <p className="text-xs text-red-500 uppercase tracking-wider font-semibold mb-1">Şəkilsiz</p>
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-red-500" />
            <span className="text-2xl font-bold text-red-500">{stats?.productsWithoutImages || 0}</span>
          </div>
        </div>
        <div className="bg-green-500/5 p-6 rounded-2xl border border-green-500/20 card-shadow">
          <p className="text-xs text-green-500 uppercase tracking-wider font-semibold mb-1">Tamamlanan</p>
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-green-500" />
            <span className="text-2xl font-bold text-green-500">{stats?.productsWithIgdbCovers || 0}</span>
          </div>
        </div>
        <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/20 card-shadow">
          <p className="text-xs text-blue-500 uppercase tracking-wider font-semibold mb-1">Xətalar</p>
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold text-blue-500">{errorCount}</span>
          </div>
        </div>
      </div>

      {/* Main Action Panel */}
      <div className="bg-surface-lighter p-8 rounded-2xl border border-neon/20 card-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap className="h-32 w-32 text-neon" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="h-20 w-20 rounded-full bg-neon/10 flex items-center justify-center text-neon shrink-0">
            {isProcessing ? (
              <RefreshCcw className="h-10 w-10 animate-spin" />
            ) : (
              <ShieldCheck className="h-10 w-10" />
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <h3 className="text-xl font-bold text-white">Avtomatik Logo Sistemi (IGDB)</h3>
            <p className="text-muted-foreground max-w-xl">
              Platformadakı bütün logosuz məhsullara permanent şəkillər əlavə edir. 
              90%+ uyğunluq avtomatik tətbiq olunur, 75-89% yoxlama siyahısına düşür.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            {!isProcessing ? (
              <>
                <Button 
                  onClick={handleCanary}
                  variant="outline"
                  className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10 h-12 px-6 rounded-xl"
                >
                  <Search className="h-5 w-5 mr-2" /> Canary Testi
                </Button>
                <Button 
                  onClick={startBulk} 
                  disabled={stats?.productsWithoutImages === 0}
                  className="bg-neon text-background hover:opacity-90 px-8 h-12 text-base font-bold rounded-xl neon-ring"
                >
                  <Play className="h-5 w-5 mr-2" /> Toplu Başlat
                </Button>
              </>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setIsPaused(!isPaused)}
                className="border-neon/50 text-neon hover:bg-neon/10 h-12 w-full sm:w-auto"
              >
                {isPaused ? <Play className="h-5 w-5 mr-2" /> : <Pause className="h-5 w-5 mr-2" />}
                {isPaused ? "Davam et" : "Dayandır"}
              </Button>
            )}
          </div>
        </div>

        {/* Progress & Detailed Counters */}
        {isProcessing && currentStep === "bulk" && (
          <div className="mt-8 space-y-6 pt-6 border-t border-border/50">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-neon" />
                  {isPaused ? "Dayandırılıb" : "Məhsullar emal olunur..."}
                </span>
                <span className="text-neon">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-background/50" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-background/30 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Yoxlanılan</p>
                <p className="text-lg font-bold">{processedCount}</p>
              </div>
              <div className="bg-neon/5 p-3 rounded-lg border border-neon/20">
                <p className="text-[10px] text-neon uppercase font-bold mb-1">Əlavə edilən</p>
                <p className="text-lg font-bold text-neon">{appliedCount}</p>
              </div>
              <div className="bg-blue-500/5 p-3 rounded-lg border border-blue-500/20">
                <p className="text-[10px] text-blue-500 uppercase font-bold mb-1">Yoxlama tələb edən</p>
                <p className="text-lg font-bold text-blue-500">{reviewCount}</p>
              </div>
              <div className="bg-background/30 p-3 rounded-lg border border-border">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Şəkil tapılmayan</p>
                <p className="text-lg font-bold">{noMatchCount}</p>
              </div>
              <div className="bg-red-500/5 p-3 rounded-lg border border-red-500/20">
                <p className="text-[10px] text-red-500 uppercase font-bold mb-1">Xətalı</p>
                <p className="text-lg font-bold text-red-500">{errorCount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-lighter/50 p-6 rounded-2xl border border-border flex gap-4">
          <ShieldCheck className="h-6 w-6 text-green-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Təhlükəsizlik Zəmanəti</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Hər bir şəkil permanent olaraq Supabase Storage-a yüklənir və 10 illik imzalanmış URL ilə təmin olunur. 
              Sistem yalnız ictimai yoxlamadan (Public Verification) keçən şəkilləri tətbiq edir.
            </p>
          </div>
        </div>
        <div className="bg-surface-lighter/50 p-6 rounded-2xl border border-border flex gap-4">
          <RefreshCcw className="h-6 w-6 text-blue-500 shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm">Ağıllı Qruplaşdırma</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Eyni oyunun müxtəlif variantları (P2, P3, Steam, PS4/5) bir dəfə IGDB-də axtarılır və eyni şəkil təkrar yüklənmədən hamısına tətbiq olunur.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
