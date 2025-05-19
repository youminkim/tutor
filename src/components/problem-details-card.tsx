
"use client";

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AnalyzedProblem } from '@/types/problem';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Volume2, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ProblemDetailsCardProps = {
  problem: AnalyzedProblem;
  showImage?: boolean;
  autoPlaySpeech?: boolean; // New prop for automatic speech playback
};

export default function ProblemDetailsCard({ problem, showImage = true, autoPlaySpeech = false }: ProblemDetailsCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasAutoPlayedForCurrentProblem, setHasAutoPlayedForCurrentProblem] = useState(false);
  const { toast } = useToast();
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Effect to reset auto-play state when the problem itself changes
  useEffect(() => {
    setHasAutoPlayedForCurrentProblem(false);
    // Cancel any ongoing speech from a previous problem if component re-renders with new problem
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    // Ensure speaking state is also reset if problem changes while speaking (though cancel() should trigger onend)
    setIsSpeaking(false); 
  }, [problem.id]);

  const speakAdvice = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({
        title: "Speech Error",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    if (problem.advice && problem.advice.trim() !== "") {
      // Cancel any existing speech before starting new
      window.speechSynthesis.cancel();
      
      const newUtterance = new SpeechSynthesisUtterance(problem.advice);
      utteranceRef.current = newUtterance;

      newUtterance.onstart = () => {
        setIsSpeaking(true);
      };
      newUtterance.onend = () => {
        setIsSpeaking(false);
        utteranceRef.current = null;
        // For autoPlay, mark it as done
        if (autoPlaySpeech && !hasAutoPlayedForCurrentProblem) {
            setHasAutoPlayedForCurrentProblem(true);
        }
      };
      newUtterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        setIsSpeaking(false);
        utteranceRef.current = null;
        if (autoPlaySpeech && !hasAutoPlayedForCurrentProblem) {
            setHasAutoPlayedForCurrentProblem(true); // Mark as attempted
        }
        toast({
          title: "Speech Error",
          description: "Could not read the advice aloud.",
          variant: "destructive",
        });
      };
      window.speechSynthesis.speak(newUtterance);
    } else if (autoPlaySpeech) {
        // If autoPlay was true but no advice, mark as "done" for autoPlay logic
        setHasAutoPlayedForCurrentProblem(true);
        toast({
          title: "No Advice",
          description: "There is no advice available to read.",
          variant: "default",
        });
    }
  }, [problem.advice, toast, autoPlaySpeech, hasAutoPlayedForCurrentProblem]);


  // Effect for auto-playing speech
  useEffect(() => {
    if (autoPlaySpeech && problem.advice && !isSpeaking && !hasAutoPlayedForCurrentProblem) {
      speakAdvice();
    }
  }, [autoPlaySpeech, problem.advice, isSpeaking, hasAutoPlayedForCurrentProblem, speakAdvice]);


  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "Speech Error", description: "Text-to-speech is not supported.", variant: "destructive" });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel(); // This should trigger 'onend'
    } else {
      if (problem.advice && problem.advice.trim() !== "") {
        speakAdvice();
      } else {
         toast({ title: "No Advice", description: "No advice to read.", variant: "default" });
      }
    }
  };

  // Cleanup function to stop speech synthesis when the component unmounts
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
    };
  }, []);


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle>Problem Analysis</CardTitle>
        <CardDescription>
          Analyzed {formatDistanceToNow(new Date(problem.timestamp), { addSuffix: true })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showImage && problem.problemImageUri && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Problem Image</h3>
            <div className="relative aspect-video w-full overflow-hidden rounded-md border">
              <Image
                src={problem.problemImageUri}
                alt="Problem image"
                layout="fill"
                objectFit="contain"
                data-ai-hint="math problem"
              />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-accent">Key Concepts</h3>
          <ScrollArea className="h-32 rounded-md border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{problem.concepts || "No concepts identified."}</p>
          </ScrollArea>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-accent">Tutor's Advice</h3>
            {problem.advice && problem.advice.trim() !== "" && (
              <Button variant="ghost" size="icon" onClick={handleToggleSpeech} aria-label={isSpeaking ? "Stop reading advice" : "Read advice aloud"}>
                {isSpeaking ? <StopCircle className="h-5 w-5 text-destructive" /> : <Volume2 className="h-5 w-5 text-primary" />}
              </Button>
            )}
          </div>
          <ScrollArea className="h-48 rounded-md border p-3 bg-muted/50">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{problem.advice || "No advice available."}</p>
          </ScrollArea>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Remember to review these concepts regularly!</p>
      </CardFooter>
    </Card>
  );
}
