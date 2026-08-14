import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Loader2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Image as ImageIcon,
  Check,
  X,
  Play
} from "lucide-react";
import { searchIgdbCovers, applyProductCovers } from "@/lib/igdb.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AutoCoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productsWithoutImages: any[];
  onSuccess: () => void;
}

interface MatchCandidate {
  igdbId: number;
  name: string;
  coverUrl: string;
  coverId: string;
  releaseYear?: number;
  platforms?: string[];
  confidence: number;
}

interface IgdbMatchResult {
  productId: string;
  normalizedTitle: string;
  candidates: MatchCandidate[];
}

export function AutoCoverDialog({ 
  open, 
  onOpenChange, 
  productsWithoutImages,
  onSuccess 
}: AutoCoverDialogProps) {
  const [step, setStep] = useState<"initial" | "searching" | "review" | "applying" | "finished">("initial");
  const [results, setResults] = useState<IgdbMatchResult[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Record<string, number>>({});
  const [applyingProgress, setApplyingProgress] = useState(0);
  const [batchIndex, setBatchIndex] = useState(0);
  const BATCH_SIZE = 10;

  const searchFn = useServerFn(searchIgdbCovers);
  const applyFn = useServerFn(applyProductCovers);

  const startSearch = async () => {
    setStep("searching");
    try {
      const productIds = productsWithoutImages.map(p => p.id);
      // Process in batches to avoid timeouts
      const allResults: IgdbMatchResult[] = [];
      for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
        const batch = productIds.slice(i, i + BATCH_SIZE);
        const batchResults = await searchFn({ data: { productIds: batch } });
        allResults.push(...(batchResults as IgdbMatchResult[]));
      }
      
      setResults(allResults);
      
      // Pre-select high confidence matches (>= 90)
      const initialSelected: Record<string, number> = {};
      allResults.forEach(res => {
        const best = res.candidates[0];
        if (best && best.confidence >= 90) {
          initialSelected[res.productId] = best.igdbId;
        }
      });
      setSelectedMatches(initialSelected);
      
      setStep("review");
    } catch (error) {
      toast.error("Sorğu zamanı xəta baş verdi");
      setStep("initial");
    }
  };

  const handleApply = async () => {
    setStep("applying");
    setApplyingProgress(0);
    
    const matchesToApply = Object.entries(selectedMatches).map(([productId, igdbId]) => {
      const result = results.find(r => r.productId === productId);
      const candidate = result?.candidates.find(c => c.igdbId === igdbId);
      return {
        productId,
        igdbGameId: igdbId,
        igdbCoverId: candidate?.coverId || "",
        imageUrl: candidate?.coverUrl || "",
        normalizedTitle: result?.normalizedTitle || "",
        confidence: candidate?.confidence || 0,
      };
    });

    if (matchesToApply.length === 0) {
      setStep("finished");
      return;
    }

    try {
      // Apply in small batches
      for (let i = 0; i < matchesToApply.length; i += 5) {
        const batch = matchesToApply.slice(i, i + 5);
        await applyFn({ data: { matches: batch } });
        setApplyingProgress(Math.round(((i + batch.length) / matchesToApply.length) * 100));
      }
      
      toast.success("Seçilmiş məhsulların şəkilləri uğurla yeniləndi");
      setStep("finished");
      onSuccess();
    } catch (error) {
      toast.error("Tətbiq zamanı xəta baş verdi");
      setStep("review");
    }
  };

  const currentBatch = results.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);
  const totalBatches = Math.ceil(results.length / BATCH_SIZE);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-surface border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-neon" /> Şəkilləri avtomatik tamamla
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {productsWithoutImages.length} fotosuz məhsul tapıldı. IGDB vasitəsilə uyğun üz qabıqlarını müəyyən edin.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "initial" && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-neon/10 flex items-center justify-center text-neon">
                <Search className="h-10 w-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-semibold">Axtarışa başlayın</h3>
                <p className="text-muted-foreground">
                  Sistem məhsul başlıqlarını analiz edərək oyun adlarını müəyyən edəcək və uyğun şəkilləri tapacaq.
                </p>
              </div>
              <Button onClick={startSearch} className="bg-neon text-background hover:opacity-90 px-8 py-6 text-lg font-bold rounded-xl">
                <Play className="h-5 w-5 mr-2" /> Axtarışı başlat
              </Button>
            </div>
          )}

          {step === "searching" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-6">
              <Loader2 className="h-12 w-12 text-neon animate-spin" />
              <div className="text-center">
                <h3 className="text-xl font-semibold">Yoxlanılır...</h3>
                <p className="text-muted-foreground">Oyun məlumatları axtarılır, zəhmət olmasa gözləyin.</p>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentBatch.map((res) => {
                  const product = productsWithoutImages.find(p => p.id === res.productId);
                  return (
                    <div key={res.productId} className="flex flex-col border border-border rounded-xl p-4 bg-surface-lighter hover:border-neon/30 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Məhsulun hazırkı başlığı</span>
                          <p className="font-medium text-sm line-clamp-1">{product?.title}</p>
                        </div>
                        <div className="text-right">
                           <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Platforma</span>
                           <p className="text-sm font-medium">{product?.platform}</p>
                        </div>
                      </div>

                      <div className="flex gap-4 mt-2">
                        {res.candidates.length > 0 ? (
                          <div className="flex-1 space-y-3">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tapılan oyunlar</span>
                            <div className="space-y-2">
                              {res.candidates.map((can) => (
                                <div 
                                  key={can.igdbId} 
                                  className={cn(
                                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all",
                                    selectedMatches[res.productId] === can.igdbId 
                                      ? "bg-neon/10 border-neon text-neon" 
                                      : "bg-background border-border hover:border-muted-foreground"
                                  )}
                                  onClick={() => setSelectedMatches({
                                    ...selectedMatches,
                                    [res.productId]: selectedMatches[res.productId] === can.igdbId ? 0 : can.igdbId
                                  })}
                                >
                                  <div className="relative h-12 w-9 rounded overflow-hidden bg-background shrink-0">
                                    {can.coverUrl ? (
                                      <img src={can.coverUrl} alt={can.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                                        <ImageIcon className="h-4 w-4" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold truncate">{can.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={cn(
                                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                                        can.confidence >= 90 ? "bg-green-500/20 text-green-500" :
                                        can.confidence >= 75 ? "bg-yellow-500/20 text-yellow-500" :
                                        "bg-red-500/20 text-red-500"
                                      )}>
                                        {can.confidence}%
                                      </span>
                                      {can.releaseYear && <span className="text-[10px] text-muted-foreground">{can.releaseYear}</span>}
                                    </div>
                                  </div>
                                  {selectedMatches[res.productId] === can.igdbId && (
                                    <Check className="h-4 w-4 shrink-0" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center py-6 bg-background rounded-lg border border-dashed border-border text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">Uyğun nəticə tapılmadı</p>
                            <Button variant="link" className="text-neon h-auto p-0 mt-1 text-xs">Yenidən axtar</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalBatches > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Səhifə {batchIndex + 1} / {totalBatches}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBatchIndex(i => Math.max(0, i - 1))}
                      disabled={batchIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Əvvəlki
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setBatchIndex(i => Math.min(totalBatches - 1, i + 1))}
                      disabled={batchIndex === totalBatches - 1}
                    >
                      Növbəti <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "applying" && (
            <div className="flex flex-col items-center justify-center py-20 space-y-8">
              <div className="relative h-24 w-24">
                <div className="absolute inset-0 rounded-full border-4 border-neon/20 border-t-neon animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                  {applyingProgress}%
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Tətbiq edilir...</h3>
                <p className="text-muted-foreground">Şəkillər yüklənir və məhsullar yenilənir.</p>
              </div>
              <Progress value={applyingProgress} className="w-64 h-2" />
            </div>
          )}

          {step === "finished" && (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-xl font-semibold">Proses tamamlandı!</h3>
                <p className="text-muted-foreground">
                  Seçilmiş məhsulların şəkilləri uğurla yeniləndi. Dəyişiklikləri görmək üçün səhifəni yeniləyə bilərsiniz.
                </p>
              </div>
              <Button onClick={() => onOpenChange(false)} className="bg-neon text-background hover:opacity-90 px-8">
                Bağla
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 border-t border-border mt-auto">
          {step === "review" && (
            <div className="flex justify-between items-center w-full">
              <p className="text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{Object.keys(selectedMatches).length}</span> məhsul seçilib
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
                <Button 
                  onClick={handleApply} 
                  disabled={Object.keys(selectedMatches).length === 0}
                  className="bg-neon text-background hover:opacity-90"
                >
                  Təsdiqlə və tətbiq et
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
