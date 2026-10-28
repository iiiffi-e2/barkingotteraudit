import {
  createOrReuseCachedAudit,
  executeAuditPipeline,
} from "../src/lib/audit-runner";
import { prisma } from "../src/lib/db";

async function main() {
  const sampleSites = [
    {
      url: "https://slow-bakery.example",
      hostname: "slow-bakery.example",
      source: "PUBLIC_WEB" as const,
    },
    {
      url: "https://shop-store.example",
      hostname: "shop-store.example",
      source: "HOMEPAGE_WIDGET" as const,
    },
    {
      url: "https://fast-saas.example",
      hostname: "fast-saas.example",
      source: "PUBLIC_WEB" as const,
    },
    {
      url: "https://no-crux-site.example",
      hostname: "no-crux-site.example",
      source: "PUBLIC_WEB" as const,
    },
  ];

  for (const site of sampleSites) {
    const { auditId } = await createOrReuseCachedAudit({
      requestedUrl: site.url,
      normalizedUrl: site.url,
      hostname: site.hostname,
      source: site.source,
    });
    await executeAuditPipeline(auditId);

    if (site.hostname === "slow-bakery.example") {
      const existingLead = await prisma.lead.findFirst({
        where: { email: "owner@slow-bakery.example" },
      });
      if (!existingLead) {
        await prisma.lead.create({
          data: {
            auditId,
            name: "Elena Vance",
            email: "owner@slow-bakery.example",
            company: "Artisan Bakery Co.",
            websiteUrl: site.url,
            goalOrConcern: "Fix slow WordPress / Shopify / CMS performance",
            message:
              "Our mobile homepage takes over 5 seconds to load and we are running local ads next month.",
            source: "OPTIMIZATION_PLAN",
            marketingConsent: false,
            status: "NEW",
          },
        });
      }
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
