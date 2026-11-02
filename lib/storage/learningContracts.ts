import { z } from 'zod';
import { activitySchema } from '@/lib/activitySchema';
const base={id:z.string().uuid(),timestamp:z.number().finite().nonnegative(),version:z.literal(1)};
export const learningEventSchema=z.discriminatedUnion('type',[
  z.object({...base,type:z.literal('slider'),activity:activitySchema,field:z.enum(['electricity','gasoline','beef'])}),
  z.object({...base,type:z.literal('question'),text:z.string().max(4000),activity:activitySchema,identity:z.enum(['student','business','city']).optional()}),
  z.object({...base,type:z.literal('answer'),text:z.string().max(30000),identity:z.enum(['student','business','city']),citations:z.array(z.string().max(100)).max(10)}),
  z.object({...base,type:z.literal('module'),module:z.string().max(100)}),
  z.object({...base,type:z.literal('quiz'),question:z.string().max(2000),answer:z.number().int(),correct:z.boolean()}),
  z.object({...base,type:z.literal('report'),reportId:z.string().uuid(),activity:activitySchema,annual:z.number().finite().nonnegative(),advice:z.string().max(30000),uploaded:z.boolean()}),
]);
export type StoredLearningEvent=z.infer<typeof learningEventSchema>;
export type LearningEvent=StoredLearningEvent extends infer T?T extends StoredLearningEvent?Omit<T,'id'|'timestamp'|'version'>:never:never;
