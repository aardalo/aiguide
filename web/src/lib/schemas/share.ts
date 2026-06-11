import { z } from 'zod';

export const shareCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(['VIEWER', 'EDITOR']),
});
export type ShareCreateInput = z.infer<typeof shareCreateSchema>;
