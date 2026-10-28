import { test, expect } from "@playwright/test";

test.describe("Barking Otter Website Performance Analyzer E2E", () => {
  test("validates unsafe URLs inline, runs an analysis, switches devices, expands opportunities, downloads PDF, and submits a lead", async ({
    page,
    request,
  }) => {
    await page.goto("/speed-test");

    // Verify Hero headline & primary CTA
    await expect(
      page.getByRole("heading", { name: "How Fast Is Your Website?" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analyze My Website" })
    ).toBeVisible();

    // 1. Test unsafe URL rejection inline
    const urlInput = page.getByPlaceholder("https://yourwebsite.com");
    await urlInput.fill("http://localhost:3000/private");
    await page.getByRole("button", { name: "Analyze My Website" }).click();
    await expect(page.getByRole("alert")).toContainText(
      "Localhost and internal network addresses cannot be tested"
    );

    // 2. Submit a valid website for analysis
    await urlInput.fill("slow-bakery.example");
    await page.getByRole("button", { name: "Analyze My Website" }).click();

    // Should navigate to /audit/[id] and display the Results Dashboard
    await expect(page).toHaveURL(/\/audit\/[a-z0-9]+/i, { timeout: 20000 });
    await expect(
      page.getByText("Your Website Performance Report")
    ).toBeVisible({ timeout: 15000 });

    // 3. Verify Mobile score & switching to Desktop tab
    const scoreEl = page.getByTestId("primary-performance-score");
    await expect(scoreEl).toBeVisible();
    const mobileScoreText = await scoreEl.textContent();
    const mobileScore = Number(mobileScoreText);
    expect(mobileScore).toBeGreaterThan(0);

    const desktopTab = page.getByRole("tab", { name: /Desktop/i });
    await desktopTab.click();
    await expect(desktopTab).toHaveAttribute("aria-selected", "true");
    const desktopScoreText = await scoreEl.textContent();
    const desktopScore = Number(desktopScoreText);
    expect(desktopScore).toBeGreaterThanOrEqual(mobileScore);

    // Switch back to Mobile
    await page.getByRole("tab", { name: /Mobile/i }).click();

    // 4. Verify Plain-English Summary, Lab Metrics, CrUX Panel, and Barking Otter Assessment
    await expect(
      page.getByRole("heading", { name: "Here's What We Found" })
    ).toBeVisible();
    await expect(page.getByTestId("plain-english-summary-text")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "How Real Visitors Experience Your Website",
      })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What Can Barking Otter Improve?" })
    ).toBeVisible();

    // 5. Expand an Opportunity card's technical details
    const expandButtons = page.getByRole("button", {
      name: "View Technical Details",
    });
    await expect(expandButtons.first()).toBeVisible();
    await expandButtons.first().click();
    await expect(
      page.getByText("Lighthouse Technical Diagnostics").first()
    ).toBeVisible();

    // 6. Test Report Sharing & Email Report Link
    await page.getByRole("button", { name: "Email Report" }).click();
    await page
      .getByPlaceholder("you@company.com")
      .fill("prospect@slow-bakery.example");
    await page.getByRole("button", { name: "Send Report Link" }).click();
    await expect(
      page.getByText(/sent a link to this report to your inbox/i)
    ).toBeVisible();

    // 7. Verify PDF Report endpoint returns a valid PDF document
    const currentUrl = page.url();
    const auditId = currentUrl.split("/audit/")[1]?.split(/[?#]/)[0];
    expect(auditId).toBeTruthy();
    const pdfResponse = await request.get(`/api/audits/${auditId}/pdf`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");

    // 8. Submit Lead Capture Form & verify confirmation
    await page.getByLabel(/Your Name/i).fill("Jordan Baker");
    await page.getByLabel(/Business Email/i).fill("jordan@slow-bakery.example");
    await page.getByLabel(/Company Name/i).fill("Baker Street Patisserie");
    await page
      .getByRole("button", { name: "Request My Optimization Plan" })
      .click();

    const confirmationBox = page.getByTestId("lead-confirmation-box");
    await expect(confirmationBox).toBeVisible();
    await expect(confirmationBox).toContainText("Your Request Is In.");
  });

  test("renders responsive mobile layout and sticky conversion CTA cleanly", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: /Your website could be faster/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Analyze My Website" })
    ).toBeVisible();
  });

  test("enforces Admin authentication and allows authorized admins to view stats, audits, leads, and settings", async ({
    page,
  }) => {
    await page.goto("/admin");

    // Should display Admin Login Gate first
    await expect(
      page.getByRole("heading", { name: "Barking Otter Admin Console" })
    ).toBeVisible();

    // Reject unauthorized email
    await page
      .getByLabel("Authorized Admin Email")
      .fill("intruder@example.com");
    await page
      .getByRole("button", { name: "Sign In to Admin Dashboard" })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "not on the authorized Barking Otter administrator allowlist"
    );

    // Sign in with allowlisted admin email
    await page
      .getByLabel("Authorized Admin Email")
      .fill("admin@barkingotter.com");
    await page
      .getByRole("button", { name: "Sign In to Admin Dashboard" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Operational Dashboard" })
    ).toBeVisible();
    await expect(page.getByText("Total Audits")).toBeVisible();

    // Navigate to Historical Audits
    await page.getByRole("link", { name: "Historical Audits" }).click();
    await expect(
      page.getByRole("heading", { name: "Historical Website Audits" })
    ).toBeVisible();

    // Navigate to Captured Leads
    await page.getByRole("link", { name: "Captured Leads" }).click();
    await expect(
      page.getByRole("heading", { name: "Captured Optimization Leads" })
    ).toBeVisible();

    // Navigate to Tool Settings
    await page.getByRole("link", { name: "Tool Settings" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Tool Configuration & Guardrails",
      })
    ).toBeVisible();
    await expect(
      page.getByText("Environment Credential Status (Read-Only)")
    ).toBeVisible();
  });
});
