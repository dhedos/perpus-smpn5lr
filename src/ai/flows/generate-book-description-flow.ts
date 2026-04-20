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
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE',
      },
    ],
  },
  prompt: `You are an expert book describer for a school library. Your task is to generate a helpful and engaging book description in Indonesian (Bahasa Indonesia).
Focus on what the book is about, its educational value, or the story. 

If the provided input seems like gibberish or random characters, try to imagine what a book with that title might be about, or provide a generic but encouraging library-style description.

Information:
{{#if title}}Title: {{{title}}}{{/if}}
{{#if author}}Author: {{{author}}}{{/if}}
{{#if isbn}}ISBN: {{{isbn}}}{{/if}}

Generate the description based on the available information.`,
});

const generateBookDescriptionFlow = ai.defineFlow(
  {
    name: 'generateBookDescriptionFlow',
    inputSchema: GenerateBookDescriptionInputSchema,
    outputSchema: GenerateBookDescriptionOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        throw new Error('AI returned empty output');
      }
      return output;
    } catch (error) {
      console.error('Genkit flow error:', error);
      return {
        description: "Maaf, AI tidak dapat menghasilkan deskripsi untuk data ini saat ini. Silakan tulis deskripsi secara manual."
      };
    }
  }
);
