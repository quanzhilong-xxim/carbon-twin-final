import { z } from 'zod';
export const activitySchema = z.object({ electricity: z.number().finite().min(0).max(10000), gasoline: z.number().finite().min(0).max(3000), beef: z.number().finite().min(0).max(100) }).strict();
