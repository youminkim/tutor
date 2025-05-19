import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AnalyzedProblem } from '@/types/problem';
import { formatDistanceToNow } from 'date-fns';

type ProblemDetailsCardProps = {
  problem: AnalyzedProblem;
  showImage?: boolean;
};

export default function ProblemDetailsCard({ problem, showImage = true }: ProblemDetailsCardProps) {
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
          <h3 className="text-lg font-semibold text-accent">Tutor's Advice</h3>
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
