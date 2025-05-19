"use client";

import { useEffect, useState } from 'react';
import { getHistory, clearHistoryStorage, type AnalyzedProblem } from '@/lib/local-storage';
import ProblemDetailsCard from './problem-details-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollText, Trash2, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


export default function HistoryList() {
  const [history, setHistory] = useState<AnalyzedProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<AnalyzedProblem | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleClearHistory = () => {
    clearHistoryStorage();
    setHistory([]);
    toast({
      title: "History Cleared",
      description: "All your analyzed problems have been removed.",
    });
  };

  if (history.length === 0) {
    return (
      <Card className="w-full text-center py-12 shadow-lg bg-card">
        <CardHeader>
          <ScrollText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-2xl font-semibold text-foreground">History is Empty</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-muted-foreground">
            Once you analyze exam problems, they will appear here for review.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Revision History</h2>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" aria-label="Clear History">
              <Trash2 className="mr-2 h-4 w-4" /> Clear All
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all your analyzed problems from history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Yes, clear history
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      <div className="space-y-4">
        {history.map((problem) => (
           <Card key={problem.id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">
                Problem from {new Date(problem.timestamp).toLocaleDateString()}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProblem(problem)} aria-label="View Details">
                <Info className="h-4 w-4 text-accent" />
                <span className="ml-1 text-xs text-accent">Details</span>
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground line-clamp-2">
                <strong>Concepts:</strong> {problem.concepts || "N/A"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedProblem && (
        <AlertDialog open={!!selectedProblem} onOpenChange={(open) => !open && setSelectedProblem(null)}>
          <AlertDialogContent className="max-w-lg w-[90vw] max-h-[80vh] overflow-y-auto p-0">
             <div className="p-6"> {/* Add padding back for content inside scroll area */}
                <ProblemDetailsCard problem={selectedProblem} />
             </div>
            <AlertDialogFooter className="sticky bottom-0 bg-background p-4 border-t">
              <AlertDialogCancel onClick={() => setSelectedProblem(null)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
