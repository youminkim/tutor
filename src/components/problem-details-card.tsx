
"use client";

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
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
};

export default function ProblemDetailsCard({ problem, showImage = true }: ProblemDetailsCardProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  // utteranceRef is not strictly needed for basic play/stop if cancel() is always used globally,
  // but can be useful if more granular control or direct reference to the utterance is needed later.
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({
        title: "Speech Error",
        description: "Text-to-speech is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel(); // This should trigger the 'onend' event if speech was active
      // setIsSpeaking(false); // onend will handle this
    } else {
      if (problem.advice && problem.advice.trim() !== "") {
        const newUtterance = new SpeechSynthesisUtterance(problem.advice);
        utteranceRef.current = newUtterance;

        newUtterance.onstart = () => {
          setIsSpeaking(true);
        };
        newUtterance.onend = () => {
          setIsSpeaking(false);
          utteranceRef.current = null;
        };
        newUtterance.onerror = (event) => {
          console.error("Speech synthesis error:", event);
          setIsSpeaking(false);
          utteranceRef.current = null;
          toast({
            title: "Speech Error",
            description: "Could not read the advice aloud.",
            variant: "destructive",
          });
        };
        window.speechSynthesis.speak(newUtterance);
      } else {
        toast({
          title: "No Advice",
          description: "There is no advice available to read.",
          variant: "default",
        });
      }
    }
  };

  useEffect(() => {
    // Cleanup function to stop speech synthesis when the component unmounts
    // or when the problem prop changes (identified by problem.id).
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        // Check if speech was active for the current utterance and reset state if so.
        // This ensures that if the component unmounts mid-speech, the state is correct.
        if (utteranceRef.current && window.speechSynthesis.speaking) {
            // It's good practice to cancel, though onend should handle state.
        }
        window.speechSynthesis.cancel(); 
        setIsSpeaking(false); // Explicitly reset state on unmount or problem change
        utteranceRef.current = null;
      }
    };
  }, [problem.id]); // Add problem.id as a dependency

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
