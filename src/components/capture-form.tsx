"use client";

import { useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import { analyzePsleProblem, type AnalyzePsleProblemOutput } from '@/ai/flows/analyze-psle-problem';
import { addProblemToHistory } from '@/lib/local-storage';
import type { AnalyzedProblem } from '@/types/problem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UploadCloud, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import ProblemDetailsCard from './problem-details-card';
import { useToast } from "@/hooks/use-toast";

export default function CaptureForm() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalyzedProblem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setAnalysisResult(null);
      setError(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !imagePreview) {
      setError("Please select an image first.");
      toast({
        title: "No Image Selected",
        description: "Please upload an image of the exam problem.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result: AnalyzePsleProblemOutput = await analyzePsleProblem({ problemImage: imagePreview });
      
      const newAnalyzedProblem: AnalyzedProblem = {
        id: new Date().toISOString(),
        problemImageUri: imagePreview,
        advice: result.advice,
        concepts: result.concepts,
        timestamp: Date.now(),
      };

      setAnalysisResult(newAnalyzedProblem);
      addProblemToHistory(newAnalyzedProblem);
      toast({
        title: "Analysis Complete!",
        description: "Problem analyzed and saved to history.",
        action: <CheckCircle className="text-green-500" />,
      });
    } catch (err) {
      console.error("Analysis failed:", err);
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
      setError(errorMessage);
      toast({
        title: "Analysis Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <div className="space-y-4 p-6 border border-dashed rounded-lg shadow-sm bg-card">
        <Label htmlFor="problem-image" className="text-lg font-semibold text-center block text-foreground">
          Upload Exam Problem
        </Label>
        <Input
          id="problem-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="file:text-primary file:font-semibold file:mr-2 hover:file:bg-primary/10"
          aria-describedby="image-help-text"
        />
        <p id="image-help-text" className="text-xs text-muted-foreground text-center">
          Take a clear picture of the primary school exam problem.
        </p>
      </div>

      {imagePreview && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-center text-foreground">Image Preview</h3>
          <div className="relative aspect-video w-full max-w-md mx-auto overflow-hidden rounded-lg border shadow-md">
            <Image src={imagePreview} alt="Problem preview" layout="fill" objectFit="contain" data-ai-hint="exam question" />
          </div>
        </div>
      )}

      {imageFile && (
        <Button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-md"
          aria-label="Analyze Problem"
        >
          {isLoading ? (
            <Sparkles className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-5 w-5" />
          )}
          {isLoading ? "Analyzing..." : "Analyze Problem"}
        </Button>
      )}

      {isLoading && (
        <div className="space-y-2">
          <Progress value={undefined} className="w-full h-2 animate-pulse" /> {/* Indeterminate progress */}
          <p className="text-sm text-center text-primary">AI is working its magic... please wait.</p>
        </div>
      )}

      {error && (
        <Alert variant="destructive" className="shadow-md">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {analysisResult && (
        <div className="mt-8">
          <ProblemDetailsCard problem={analysisResult} />
        </div>
      )}
    </div>
  );
}
