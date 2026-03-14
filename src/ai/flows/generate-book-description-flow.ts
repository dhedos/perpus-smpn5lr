'use server';
/**
 * @fileOverview A Genkit flow for generating book descriptions based on provided book details.
 *
 * - generateBookDescription - A function that handles the book description generation process.
 * - GenerateBookDescriptionInput - The input type for the generateBookDescription function.
 * - GenerateBookDescriptionOutput - The return type for the generateBookDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBookDescriptionInputSchema = z.object({
  title: z.string().describe('The title of the book.').optional(),
  author: z.string().describe('The author of the book.').optional(),
  isbn: z.string().describe('The International Standard Book Number (ISBN) of the book.').optional(),
});
export type GenerateBookDescriptionInput = z.infer<typeof GenerateBookDescriptionInputSchema>;

const GenerateBookDescriptionOutputSchema = z.object({
  description: z.string().describe('A detailed description of the book.'),
});
export type GenerateBookDescriptionOutput = z.infer<typeof GenerateBookDescriptionOutputSchema>;

export async function generateBookDescription(input: GenerateBookDescriptionInput): Promise<GenerateBookDescriptionOutput> {
  return generateBookDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateBookDescriptionPrompt',
  input: {schema: GenerateBookDescriptionInputSchema},
  output: {schema: GenerateBookDescriptionOutputSchema},
  prompt: `You are an expert book describer. Your task is to generate a detailed and engaging book description.
Focus on the plot, themes, and target audience. Do not include any promotional language like "buy now" or "available today".

Use the following information to create the description:

{{#if title}}Title: {{{title}}}{{/if}}
{{#if author}}Author: {{{author}}}{{/if}}
{{#if isbn}}ISBN: {{{isbn}}}{{/if}}

Generate the description based on the available information. If only limited information is provided, make educated guesses to create a compelling description.`,
});

const generateBookDescriptionFlow = ai.defineFlow(
  {
    name: 'generateBookDescriptionFlow',
    inputSchema: GenerateBookDescriptionInputSchema,
    outputSchema: GenerateBookDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
