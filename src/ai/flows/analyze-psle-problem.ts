'use server';

/**
 * @fileOverview Analyzes a PSLE problem, extracts text using OCR, and provides advice as an experienced PSLE tutor.
 *
 * - analyzePsleProblem - A function that analyzes the PSLE problem and provides advice.
 * - AnalyzePsleProblemInput - The input type for the analyzePsleProblem function.
 * - AnalyzePsleProblemOutput - The return type for the analyzePsleProblem function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePsleProblemInputSchema = z.object({
  problemImage: z
    .string()
    .describe(
      "A photo of a PSLE exam problem, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzePsleProblemInput = z.infer<typeof AnalyzePsleProblemInputSchema>;

const AnalyzePsleProblemOutputSchema = z.object({
  advice: z.string().describe('Advice and explanations from an experienced PSLE tutor.'),
  concepts: z.string().describe('Summary of the key concepts from the problem.'),
});
export type AnalyzePsleProblemOutput = z.infer<typeof AnalyzePsleProblemOutputSchema>;

export async function analyzePsleProblem(input: AnalyzePsleProblemInput): Promise<AnalyzePsleProblemOutput> {
  return analyzePsleProblemFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePsleProblemPrompt',
  input: {schema: AnalyzePsleProblemInputSchema},
  output: {schema: AnalyzePsleProblemOutputSchema},
  prompt: `You are an experienced PSLE tutor. A student has provided an image of a PSLE exam problem.

  Your task is to analyze the problem, extract the text using OCR, and provide advice and explanations to the student. You should also provide a summary of the key concepts from the problem.

  Problem Image: {{media url=problemImage}}
  `,
});

const analyzePsleProblemFlow = ai.defineFlow(
  {
    name: 'analyzePsleProblemFlow',
    inputSchema: AnalyzePsleProblemInputSchema,
    outputSchema: AnalyzePsleProblemOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
