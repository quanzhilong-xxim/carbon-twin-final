import {z} from 'zod';
export const roomEnergySchema=z.object({power:z.number().min(0).max(5000),hours:z.number().min(0).max(24),lighting:z.number().min(0).max(24),embodied:z.number().min(0).max(100000).nullable(),enabled:z.boolean(),temperature:z.number().min(18).max(30),grade:z.union([z.literal(1),z.literal(3)])});

export const devicesSchema=z.object({television:z.boolean().optional(),kettle:z.boolean().optional(),server:z.boolean().optional(),computer:z.boolean().optional(),officeHVAC:z.boolean().optional(),officeLight:z.boolean().optional(),coffeeMachine:z.boolean().optional(),fridge:z.boolean().optional(),grinder:z.boolean().optional(),cafeLight:z.boolean().optional()});
export const spaceContextSchema=z.object({kind:z.enum(['home','office','cafe']),selected:z.string().max(40).nullable(),devices:devicesSchema});
