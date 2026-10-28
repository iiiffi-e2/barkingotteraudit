import { prisma } from "@/lib/db";
import { z } from "zod";

export const AppSettingsSchema = z.object({
  publicRateLimitPerHour: z.number().int().min(1).max(1000).default(20),
  cacheLifetimeHours: z.number().int().min(0).max(720).default(24),
  reportRetentionDays: z.number().int().min(1).max(3650).default(90),
  aiAnalysisEnabled: z.boolean().default(true),
  aiProvider: z.enum(["openai", "anthropic", "deterministic"]).default("openai"),
  aiModel: z.string().min(1).max(120).default(process.env.AI_MODEL || "gpt-4o-mini"),
  notificationRecipients: z
    .string()
    .default(process.env.NOTIFICATION_RECIPIENTS || "team@barkingotter.com"),
  enableOriginCruxFallback: z.boolean().default(true),
  enableDemoFallbackInDev: z
    .boolean()
    .default(process.env.ALLOW_DEMO_FALLBACK === "true"),
  maxConcurrentAudits: z.number().int().min(1).max(50).default(8),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

const SETTINGS_KEY = "global_analyzer_settings";

export const DEFAULT_APP_SETTINGS: AppSettings = AppSettingsSchema.parse({});

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const record = await prisma.settings.findUnique({
      where: { key: SETTINGS_KEY },
    });
    if (!record || !record.value || typeof record.value !== "object") {
      return DEFAULT_APP_SETTINGS;
    }
    const parsed = AppSettingsSchema.safeParse({
      ...DEFAULT_APP_SETTINGS,
      ...(record.value as Record<string, unknown>),
    });
    return parsed.success ? parsed.data : DEFAULT_APP_SETTINGS;
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export async function updateAppSettings(
  partial: Partial<AppSettings>
): Promise<AppSettings> {
  const current = await getAppSettings();
  const merged = AppSettingsSchema.parse({
    ...current,
    ...partial,
  });

  await prisma.settings.upsert({
    where: { key: SETTINGS_KEY },
    create: {
      key: SETTINGS_KEY,
      value: merged,
    },
    update: {
      value: merged,
    },
  });

  return merged;
}
