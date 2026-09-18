import { z } from 'zod'

const square = z.string().regex(/^[a-h][1-8]$/, 'casa inválida')

const boardArrow = z.object({
  from: square,
  to: square,
})

const alternative = z.object({
  san: z.string().min(1),
  uci: z.string(),
  label: z.string().min(1),
  explanation: z.string().min(1),
  acceptable: z.boolean(),
})

export const openingMoveLessonSchema = z.object({
  ply: z.number().int().positive(),
  uci: z.string(),
  san: z.string().min(1),
  comment: z.string().trim().min(1),
  strategicIdea: z.string().trim().min(1).optional(),
  tacticalIdea: z.string().trim().min(1).optional(),
  highlights: z.array(square).optional(),
  arrows: z.array(boardArrow).optional(),
  alternatives: z.array(alternative).optional(),
  warning: z.string().trim().min(1).optional(),
  resultingPlan: z.string().trim().min(1).optional(),
})

const variation = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().trim().min(1),
  rootNodeId: z.string(),
  line: z.array(openingMoveLessonSchema).min(1),
})

const plan = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  positionNodeId: z.string().min(1),
  objective: z.string().trim().min(1),
  when: z.string().trim().min(1),
  risk: z.string().trim().min(1),
  arrows: z.array(boardArrow).optional(),
  positionPly: z.number().int().nonnegative().optional(),
})

const structure = z.object({
  name: z.string().min(1),
  description: z.string().trim().min(1),
  pawnBreaks: z.array(z.string().min(1)),
  weakSquares: z.array(square),
  openFiles: z.array(z.string().min(1)),
})

const mistake = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1),
  moveSan: z.string().min(1),
  explanation: z.string().trim().min(1),
  principle: z.string().trim().min(1),
  positionPly: z.number().int().nonnegative().optional(),
})

/** Contrato dos arquivos autorados antes de construir o grafo derivado. */
export const openingAuthoringSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug inválido'),
  name: z.string().trim().min(1),
  side: z.enum(['white', 'black']),
  ecoCodes: z.array(z.string().min(1)).min(1),
  description: z.string().trim().min(1),
  philosophy: z.string().trim().min(1),
  theoryComplexity: z.number().int().min(1).max(4),
  prerequisites: z.array(z.string()),
  tags: z.array(z.string().min(1)).min(1),
  transitionToMiddlegame: z.string().trim().min(1),
  mainline: z.array(openingMoveLessonSchema).min(1),
  variations: z.array(variation),
  plans: z.array(plan).min(1),
  structures: z.array(structure).min(1),
  mistakes: z.array(mistake).min(1),
  version: z.number().int().positive(),
})

export type OpeningAuthoringInput = z.input<typeof openingAuthoringSchema>
