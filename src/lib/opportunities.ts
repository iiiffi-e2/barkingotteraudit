import {
  AffectedResourceItem,
  NormalizedOpportunity,
  OpportunityCategory,
} from "@/types/audit";
import { formatBytes, formatDurationMs } from "@/lib/utils";

export interface RawLighthouseAudit {
  id?: string;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  numericValue?: number;
  numericUnit?: string;
  displayValue?: string;
  metricSavings?: Record<string, number>;
  details?: {
    type?: string;
    overallSavingsMs?: number;
    overallSavingsBytes?: number;
    items?: Array<Record<string, unknown>>;
  };
}

interface AuditRuleMetadata {
  category: OpportunityCategory;
  title: string;
  explanation: string;
  whyItMatters: string;
  recommendation: string;
  technicalRecommendation: string;
  complexity: "STRAIGHTFORWARD" | "INVESTIGATION" | "COMPLEX";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  affectsPrimaryLoad: boolean;
  defaultDocUrl: string;
}

const AUDIT_KNOWLEDGE_BASE: Record<string, AuditRuleMetadata> = {
  "uses-optimized-images": {
    category: "Image sizing and compression",
    title: "Your Images Could Be Compressed More Efficiently",
    explanation:
      "Several images on this page are larger in file size than necessary. Compressing them reduces download size without noticeably changing visual quality.",
    whyItMatters:
      "Large image files slow down page loading, especially for visitors on mobile connections, and can delay when key page visuals appear.",
    recommendation:
      "Compress JPEG and PNG assets using modern encoders and configure automated image optimization in your media pipeline or CDN.",
    technicalRecommendation:
      "Encode raster images at quality ~80–85%, strip unnecessary EXIF metadata, and serve via an optimizing image CDN or build pipeline.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/",
  },
  "uses-responsive-images": {
    category: "Image sizing and compression",
    title: "Images Are Larger Than the Screen Size They Display At",
    explanation:
      "The page is sending high-resolution desktop-sized images even when displayed inside much smaller containers or mobile screens.",
    whyItMatters:
      "Visitors download extra megabytes of image data that their screen cannot even display, slowing down initial page load.",
    recommendation:
      "Generate multiple image sizes and serve responsive `srcset` and `sizes` attributes matched to your layout breakpoints.",
    technicalRecommendation:
      "Implement responsive `<img srcset=\"...\" sizes=\"...\">` attributes or Next.js/Cloudflare/Shopify responsive image helpers.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/uses-responsive-images/",
  },
  "image-delivery-insight": {
    category: "Image sizing and compression",
    title: "Image Delivery Can Be Streamlined",
    explanation:
      "Images on this page could be delivered in smaller dimensions and more efficient formats to reduce download time.",
    whyItMatters:
      "Optimizing image delivery directly reduces page weight and helps hero visuals appear faster.",
    recommendation:
      "Serve responsive image dimensions, apply modern WebP/AVIF encoding, and compress oversized visual assets.",
    technicalRecommendation:
      "Audit image containers against natural dimensions, enable AVIF/WebP negotiation, and set explicit `width`/`height` attributes.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/uses-optimized-images/",
  },
  "modern-image-formats": {
    category: "Modern image formats",
    title: "Convert Legacy Images to Modern Formats (WebP or AVIF)",
    explanation:
      "Some images are still served as older JPEG or PNG files instead of modern formats like WebP or AVIF, which offer smaller file sizes at equivalent quality.",
    whyItMatters:
      "Modern formats typically reduce image payload size by 25–50%, helping visual content load faster across all devices.",
    recommendation:
      "Convert static JPEG and PNG images to WebP or AVIF or enable automatic format conversion on your CDN or hosting platform.",
    technicalRecommendation:
      "Use `<picture>` elements with AVIF/WebP sources or configure `Accept: image/avif,image/webp` content negotiation at the CDN edge.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/modern-image-formats/",
  },
  "uses-webp-images": {
    category: "Modern image formats",
    title: "Serve Images in Next-Gen Formats",
    explanation:
      "Images on this page can be converted to modern formats like WebP or AVIF to reduce download time without sacrificing sharpness.",
    whyItMatters:
      "Smaller image files load faster and consume less mobile data for your visitors.",
    recommendation:
      "Enable automatic WebP/AVIF conversion via your CMS plugin, build pipeline, or CDN.",
    technicalRecommendation:
      "Replace legacy JPEG/PNG delivery with WebP/AVIF assets and verify fallback support.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/modern-image-formats/",
  },
  "offscreen-images": {
    category: "Lazy loading",
    title: "Defer Loading of Below-the-Fold Images",
    explanation:
      "The browser is downloading images located far down the page immediately on initial load, before the visitor scrolls to them.",
    whyItMatters:
      "Downloading offscreen images competes for bandwidth with the headline and primary visuals at the top of the page.",
    recommendation:
      "Add lazy loading to images below the fold while keeping your primary hero image eagerly loaded.",
    technicalRecommendation:
      "Apply `loading=\"lazy\"` and `decoding=\"async\"` to below-the-fold `<img>` elements; ensure the LCP image retains `fetchpriority=\"high\"` and eager loading.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/offscreen-images/",
  },
  "render-blocking-resources": {
    category: "Render-blocking resources",
    title: "Stylesheets and Scripts Are Delaying Initial Page Display",
    explanation:
      "Before the browser can show your page content, it has to pause and download several CSS and JavaScript files in the page header.",
    whyItMatters:
      "Visitors stare at a blank screen until these blocking files finish downloading and parsing.",
    recommendation:
      "Defer non-essential scripts, inline critical above-the-fold styles, and load secondary stylesheets asynchronously.",
    technicalRecommendation:
      "Add `defer` or `async` to non-critical `<script>` tags in `<head>`, extract critical CSS for initial viewport rendering, and split unused global bundles.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/render-blocking-resources/",
  },
  "render-blocking-insight": {
    category: "Render-blocking resources",
    title: "Render-Blocking Assets Are Slowing First Paint",
    explanation:
      "Several CSS or JavaScript files must be fetched before the browser can draw any content on screen.",
    whyItMatters:
      "Eliminating render-blocking requests directly improves First Contentful Paint and Largest Contentful Paint.",
    recommendation:
      "Inline critical CSS and defer scripts that are not required for immediate visual rendering.",
    technicalRecommendation:
      "Audit `<head>` synchronous stylesheets and scripts; relocate or mark scripts with `defer`.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/render-blocking-resources/",
  },
  "unused-javascript": {
    category: "Unused JavaScript",
    title: "Unused JavaScript Code Is Being Downloaded",
    explanation:
      "The page downloads JavaScript code that isn't needed to load or interact with the current page—often from plugins, tracking tags, or bundled libraries.",
    whyItMatters:
      "Even unused JavaScript must be downloaded, parsed, and compiled by the visitor's device, slowing down both loading and responsiveness.",
    recommendation:
      "Audit installed plugins, remove unneeded scripts on this template, and split large JavaScript bundles so pages only load what they use.",
    technicalRecommendation:
      "Use code-splitting, dynamic `import()`, tree-shaking, and conditional script loading per route/template.",
    complexity: "INVESTIGATION",
    confidence: "MEDIUM",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/unused-javascript/",
  },
  "bootup-time": {
    category: "JavaScript execution",
    title: "Heavy JavaScript Execution Is Slowing Down the Browser",
    explanation:
      "The visitor's browser spends a long time evaluating and running JavaScript scripts while the page loads.",
    whyItMatters:
      "When the browser is busy running heavy scripts, buttons, menus, and forms can feel unresponsive or laggy, particularly on mobile phones.",
    recommendation:
      "Reduce JavaScript bundle complexity, defer non-essential third-party widgets, and optimize expensive client-side scripts.",
    technicalRecommendation:
      "Profile long script evaluation tasks in DevTools, minimize hydration payload, and defer non-critical third-party tag execution until after interaction or idle.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/bootup-time/",
  },
  "unminified-javascript": {
    category: "JavaScript execution",
    title: "JavaScript Files Are Not Minified",
    explanation:
      "Some JavaScript files include extra whitespace, comments, and long variable names that increase file size unnecessarily.",
    whyItMatters:
      "Minifying scripts shrinks download size and speeds up script parsing with low risk.",
    recommendation:
      "Enable JavaScript minification in your build tool, CMS optimization plugin, or CDN.",
    technicalRecommendation:
      "Minify production JS bundles with Terser/SWC/esbuild or enable edge auto-minification.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/unminified-javascript/",
  },
  "duplicated-javascript": {
    category: "JavaScript execution",
    title: "Duplicate JavaScript Modules Are Included Multiple Times",
    explanation:
      "The same JavaScript libraries are being downloaded more than once across different bundles on the page.",
    whyItMatters:
      "Visitors pay the download and execution cost twice for identical code.",
    recommendation:
      "Deduplicate shared dependencies in your bundler or consolidate overlapping plugins.",
    technicalRecommendation:
      "Inspect bundle graphs and lockfile versions to deduplicate common libraries across chunks.",
    complexity: "INVESTIGATION",
    confidence: "MEDIUM",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/duplicated-javascript/",
  },
  "legacy-javascript": {
    category: "JavaScript execution",
    title: "Legacy JavaScript Polyfills Are Served to Modern Browsers",
    explanation:
      "The site ships older compatibility code that modern mobile and desktop browsers already support natively.",
    whyItMatters:
      "Removing unnecessary polyfills reduces JavaScript payload and execution overhead.",
    recommendation:
      "Update build targets to modern browser baselines (`es2020+`) so modern browsers receive lean native code.",
    technicalRecommendation:
      "Configure Browserslist / Babel / TypeScript target to modern evergreen browsers and avoid bundling redundant core-js polyfills.",
    complexity: "INVESTIGATION",
    confidence: "MEDIUM",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/legacy-javascript/",
  },
  "mainthread-work-breakdown": {
    category: "Main-thread workload",
    title: "The Browser Main Thread Is Overloaded During Load",
    explanation:
      "The browser is doing too much simultaneous work—parsing HTML, styling elements, recalculating layouts, and running scripts—all on a single thread.",
    whyItMatters:
      "An overloaded main thread directly increases Total Blocking Time (TBT) and makes the page feel sluggish when visitors try to scroll or tap.",
    recommendation:
      "Simplify DOM structure, reduce JavaScript execution volume, and break up long-running browser tasks.",
    technicalRecommendation:
      "Reduce DOM node count, minimize forced synchronous layouts, yield during long tasks, and offload or defer non-essential client logic.",
    complexity: "COMPLEX",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/mainthread-work-breakdown/",
  },
  "dom-size": {
    category: "Main-thread workload",
    title: "The Page Structure (DOM) Is Unusually Large",
    explanation:
      "This page contains a very high number of HTML elements, which often happens with visual page builders or complex mega-menus.",
    whyItMatters:
      "Large DOM trees require more memory and make every style calculation and layout update slower.",
    recommendation:
      "Simplify nested page-builder containers and render hidden modals or large lists only when needed.",
    technicalRecommendation:
      "Keep total DOM nodes under ~1,500, flatten deeply nested wrapper `<div>` elements, and virtualize or lazy-mount offscreen sections.",
    complexity: "COMPLEX",
    confidence: "MEDIUM",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/dom-size/",
  },
  "unused-css-rules": {
    category: "CSS optimization",
    title: "Unused Stylesheet Rules Are Slowing Page Rendering",
    explanation:
      "The browser downloads large CSS stylesheets where most of the styling rules are not used on this specific page.",
    whyItMatters:
      "All stylesheets must be downloaded and processed before the browser renders the page, so extra CSS delays initial display.",
    recommendation:
      "Remove unused theme or plugin stylesheets on pages that don't need them and inline critical above-the-fold styles.",
    technicalRecommendation:
      "Purge unused CSS classes at build time, split template-specific CSS, and defer non-critical plugin stylesheets.",
    complexity: "INVESTIGATION",
    confidence: "MEDIUM",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/unused-css-rules/",
  },
  "unminified-css": {
    category: "CSS optimization",
    title: "CSS Stylesheets Can Be Minified",
    explanation:
      "Stylesheets contain extra spaces and comments that can be stripped out automatically to reduce file size.",
    whyItMatters:
      "Smaller CSS files download faster and allow the browser to paint the page sooner.",
    recommendation:
      "Enable CSS minification in your build pipeline, caching plugin, or CDN.",
    technicalRecommendation:
      "Run cssnano/lightningcss during build or enable CDN CSS minification.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/unminified-css/",
  },
  "font-display": {
    category: "Font loading",
    title: "Web Fonts May Delay Text Visibility While Loading",
    explanation:
      "Custom fonts on this page are configured in a way that can cause text to remain invisible until the font files finish downloading.",
    whyItMatters:
      "Visitors should be able to read your headlines and content immediately using a fallback font while custom fonts load.",
    recommendation:
      "Configure web fonts with `font-display: swap` or `optional` and preload your primary heading/body font files.",
    technicalRecommendation:
      "Add `font-display: swap` to `@font-face` declarations, self-host WOFF2 fonts where practical, and `<link rel=\"preload\" as=\"font\" type=\"font/woff2\" crossorigin>` critical fonts.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/font-display/",
  },
  "font-display-insight": {
    category: "Font loading",
    title: "Optimize Custom Font Loading",
    explanation:
      "Custom web fonts can delay text rendering if fallback font behavior is not configured.",
    whyItMatters:
      "Ensuring text remains visible during webfont load improves perceived speed and First Contentful Paint.",
    recommendation:
      "Use `font-display: swap` and preload primary WOFF2 font assets.",
    technicalRecommendation:
      "Set `font-display: swap` on `@font-face` rules and eliminate redundant font weights.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/font-display/",
  },
  "uses-long-cache-ttl": {
    category: "Browser caching",
    title: "Static Assets Have Short Browser Cache Lifetimes",
    explanation:
      "Images, fonts, stylesheets, and scripts are not telling repeat visitors' browsers to keep local copies for long enough.",
    whyItMatters:
      "Proper browser caching makes second page views and return visits load dramatically faster.",
    recommendation:
      "Configure longer `Cache-Control` headers for static assets like images, fonts, and versioned CSS/JS files.",
    technicalRecommendation:
      "Set `Cache-Control: public, max-age=31536000, immutable` on fingerprinted static assets and reasonable TTLs on media files.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: false,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/uses-long-cache-ttl/",
  },
  "server-response-time": {
    category: "Server response performance",
    title: "The Web Server Takes Too Long to Respond (Slow TTFB)",
    explanation:
      "When a visitor requests your page, the server takes longer than recommended before sending back the first piece of HTML.",
    whyItMatters:
      "Every other part of page loading has to wait for the initial server response. A slow server delays the entire experience.",
    recommendation:
      "Enable full-page caching or CDN edge caching, optimize slow database queries or CMS plugins, and evaluate hosting resources.",
    technicalRecommendation:
      "Measure Time to First Byte (TTFB) across cached vs. uncached requests; implement edge/page caching, OPcache/Redis object caching, or upgrade origin compute.",
    complexity: "COMPLEX",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/time-to-first-byte/",
  },
  redirects: {
    category: "Redirect chains",
    title: "Multiple URL Redirects Delay Page Loading",
    explanation:
      "Before reaching the final page, the browser is redirected through one or more intermediate addresses.",
    whyItMatters:
      "Each redirect adds an extra network round-trip before the page even begins to load.",
    recommendation:
      "Update links and canonical URLs to point directly to the final destination URL without intermediate hops.",
    technicalRecommendation:
      "Consolidate HTTP-to-HTTPS and www/non-www redirects into a single hop at the edge.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/redirects/",
  },
  "third-party-summary": {
    category: "Third-party scripts",
    title: "External Marketing, Chat, or Analytics Scripts Are Slowing the Page",
    explanation:
      "Third-party tools (such as analytics tags, live chat widgets, ad pixels, or embedded social feeds) are adding significant loading and processing overhead.",
    whyItMatters:
      "External scripts run on your visitors' devices and frequently block the main thread or delay visual rendering.",
    recommendation:
      "Audit tag manager containers to remove unused tracking pixels, delay chat widgets until user interaction, and load third-party scripts asynchronously.",
    technicalRecommendation:
      "Defer non-essential third-party scripts until `requestIdleCallback` or user interaction, use facade placeholders for embeds/chat widgets, and audit GTM triggers.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/third-party-summary/",
  },
  "third-party-insight": {
    category: "Third-party scripts",
    title: "Third-Party Code Is Impacting Page Responsiveness",
    explanation:
      "External scripts loaded from third-party domains are consuming browser time and bandwidth during page load.",
    whyItMatters:
      "Reducing or deferring third-party scripts frees up the browser to render your core content faster.",
    recommendation:
      "Remove redundant trackers and delay non-essential widgets like chat or video embeds until interaction.",
    technicalRecommendation:
      "Audit third-party execution time and load non-critical tags post-hydration or via lightweight facades.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/third-party-summary/",
  },
  "unsized-images": {
    category: "Layout instability",
    title: "Images Are Missing Explicit Width and Height Dimensions",
    explanation:
      "Some images do not specify their width and height in the page code, so the browser doesn't know how much space to reserve before they load.",
    whyItMatters:
      "When those images finish downloading, surrounding text and buttons jump down the page (Cumulative Layout Shift).",
    recommendation:
      "Add explicit `width` and `height` attributes (or CSS aspect-ratio rules) to all image elements.",
    technicalRecommendation:
      "Ensure all `<img>` and `<svg>` elements declare intrinsic `width` and `height` attributes or explicit CSS `aspect-ratio`.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/unsized-images/",
  },
  "layout-shift-elements": {
    category: "Layout instability",
    title: "Page Elements Shift Position While Loading",
    explanation:
      "Key page sections move unexpectedly as fonts, images, banners, or dynamic widgets finish loading.",
    whyItMatters:
      "Layout shifts frustrate visitors—sometimes causing them to tap the wrong button or lose their place while reading.",
    recommendation:
      "Reserve fixed space for images, notification bars, embeds, and dynamically injected content above the fold.",
    technicalRecommendation:
      "Inspect shifting DOM nodes, reserve min-height on dynamic containers/banners, and set explicit dimensions on media elements.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/layout-shift-elements/",
  },
  "prioritize-lcp-image": {
    category: "Resource prioritization",
    title: "The Main Hero Image Isn't Prioritized Early Enough",
    explanation:
      "The largest visual element at the top of your page isn't marked as high priority, so the browser discovers and downloads it later than it could.",
    whyItMatters:
      "Prioritizing the main hero image directly improves Largest Contentful Paint (LCP), making the page feel immediately faster.",
    recommendation:
      "Preload the primary hero image and add `fetchpriority=\"high\"` while ensuring it is not lazy-loaded.",
    technicalRecommendation:
      "Add `fetchpriority=\"high\"` and remove `loading=\"lazy\"` on the LCP `<img>` element; if loaded via CSS background, inject a `<link rel=\"preload\" as=\"image\">` tag.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/prioritize-lcp-image/",
  },
  "lcp-lazy-loaded": {
    category: "Resource prioritization",
    title: "The Main Above-the-Fold Image Is Being Lazy-Loaded",
    explanation:
      "Your primary hero image has lazy-loading enabled, which tells the browser to wait before downloading the most important visual on the screen.",
    whyItMatters:
      "Lazy-loading the main hero image noticeably delays Largest Contentful Paint (LCP).",
    recommendation:
      "Disable lazy-loading on the primary above-the-fold hero image and set its fetch priority to high.",
    technicalRecommendation:
      "Remove `loading=\"lazy\"` from the LCP element and add `fetchpriority=\"high\"`.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/lcp-lazy-loaded/",
  },
  "uses-rel-preconnect": {
    category: "Resource prioritization",
    title: "Preconnect to Required Third-Party Origins",
    explanation:
      "The page fetches critical fonts, images, or scripts from external domains without establishing early network connections.",
    whyItMatters:
      "Early preconnect hints save DNS lookup, TCP handshake, and TLS negotiation time.",
    recommendation:
      "Add `<link rel=\"preconnect\">` hints for the most important external asset or font domains.",
    technicalRecommendation:
      "Add `<link rel=\"preconnect\" href=\"https://...\" crossorigin>` for critical origins on the LCP/FCP path.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/uses-rel-preconnect/",
  },
  "total-byte-weight": {
    category: "Network payload size",
    title: "Total Page Download Size Is Very Large",
    explanation:
      "Loading this page requires visitors to download a heavy overall payload of images, video, fonts, and scripts.",
    whyItMatters:
      "Heavy pages load slowly on mobile networks and increase abandonment before the page finishes appearing.",
    recommendation:
      "Compress large media files, replace autoplay background videos with lightweight poster images or compressed streams, and trim unused code.",
    technicalRecommendation:
      "Target a total initial page transfer size under 1.6 MB by optimizing top byte-weight resources.",
    complexity: "INVESTIGATION",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/total-byte-weight/",
  },
  "uses-text-compression": {
    category: "Network payload size",
    title: "Enable Text Compression (Brotli or Gzip)",
    explanation:
      "Text-based assets (HTML, CSS, JavaScript) are being sent over the network without compression.",
    whyItMatters:
      "Brotli or Gzip compression typically shrinks text assets by 65–80% immediately.",
    recommendation:
      "Enable Brotli (`br`) or Gzip compression on your web server or CDN.",
    technicalRecommendation:
      "Configure `Content-Encoding: br` or `gzip` for `text/html`, `text/css`, `application/javascript`, and `image/svg+xml` responses.",
    complexity: "STRAIGHTFORWARD",
    confidence: "HIGH",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/uses-text-compression/",
  },
  "critical-request-chains": {
    category: "Long dependency chains",
    title: "Long Chains of Dependent Network Requests Delay Rendering",
    explanation:
      "Critical files are discovering and requesting other critical files one after another in a chain rather than loading in parallel.",
    whyItMatters:
      "Sequential request chains multiply network latency, especially on mobile connections.",
    recommendation:
      "Flatten dependency chains by preloading key assets, avoiding `@import` in CSS, and deferring non-critical scripts.",
    technicalRecommendation:
      "Eliminate CSS `@import` statements, preload critical fonts/chunks, and minimize deep ES module waterfalls.",
    complexity: "INVESTIGATION",
    confidence: "MEDIUM",
    affectsPrimaryLoad: true,
    defaultDocUrl: "https://developer.chrome.com/docs/lighthouse/performance/critical-request-chains/",
  },
};

function inferCategoryFromAudit(id: string, title: string): OpportunityCategory {
  const combined = `${id} ${title}`.toLowerCase();
  if (combined.includes("webp") || combined.includes("avif") || combined.includes("modern-image")) {
    return "Modern image formats";
  }
  if (combined.includes("offscreen") || combined.includes("lazy")) {
    return "Lazy loading";
  }
  if (combined.includes("unsized") || combined.includes("layout-shift") || combined.includes("cls")) {
    return "Layout instability";
  }
  if (combined.includes("lcp") || combined.includes("preconnect") || combined.includes("preload") || combined.includes("prioritize")) {
    return "Resource prioritization";
  }
  if (combined.includes("image")) {
    return "Image sizing and compression";
  }
  if (combined.includes("unused-javascript")) {
    return "Unused JavaScript";
  }
  if (combined.includes("render-blocking")) {
    return "Render-blocking resources";
  }
  if (combined.includes("css")) {
    return "CSS optimization";
  }
  if (combined.includes("font")) {
    return "Font loading";
  }
  if (combined.includes("cache")) {
    return "Browser caching";
  }
  if (combined.includes("server-response") || combined.includes("ttfb") || combined.includes("document-latency")) {
    return "Server response performance";
  }
  if (combined.includes("redirect")) {
    return "Redirect chains";
  }
  if (combined.includes("third-party")) {
    return "Third-party scripts";
  }
  if (combined.includes("mainthread") || combined.includes("dom-size") || combined.includes("long-tasks")) {
    return "Main-thread workload";
  }
  if (combined.includes("byte-weight") || combined.includes("compression")) {
    return "Network payload size";
  }
  if (combined.includes("chain") || combined.includes("network-dependency")) {
    return "Long dependency chains";
  }
  if (combined.includes("javascript") || combined.includes("bootup")) {
    return "JavaScript execution";
  }
  return "Other Lighthouse diagnostics";
}

function extractAffectedResources(audit: RawLighthouseAudit): AffectedResourceItem[] {
  const rawItems = audit.details?.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [];
  }

  const results: AffectedResourceItem[] = [];
  for (const item of rawItems.slice(0, 6)) {
    const url =
      typeof item.url === "string"
        ? item.url
        : typeof (item.entity as Record<string, unknown> | undefined)?.text === "string"
        ? String((item.entity as Record<string, unknown>).text)
        : typeof item.source === "string"
        ? item.source
        : undefined;

    const label =
      typeof item.groupLabel === "string"
        ? item.groupLabel
        : typeof item.label === "string"
        ? item.label
        : typeof (item.node as Record<string, unknown> | undefined)?.nodeLabel === "string"
        ? String((item.node as Record<string, unknown>).nodeLabel)
        : typeof (item.entity as Record<string, unknown> | undefined)?.text === "string"
        ? String((item.entity as Record<string, unknown>).text)
        : undefined;

    const totalBytes =
      typeof item.totalBytes === "number"
        ? item.totalBytes
        : typeof item.transferSize === "number"
        ? item.transferSize
        : undefined;

    const wastedBytes =
      typeof item.wastedBytes === "number" ? item.wastedBytes : undefined;

    const wastedMs =
      typeof item.wastedMs === "number"
        ? item.wastedMs
        : typeof item.blockingTime === "number"
        ? item.blockingTime
        : typeof item.scripting === "number"
        ? item.scripting
        : typeof item.duration === "number"
        ? item.duration
        : undefined;

    if (url || label || totalBytes || wastedBytes || wastedMs) {
      results.push({
        url: url ? url.slice(0, 180) : undefined,
        label: label ? label.slice(0, 120) : undefined,
        totalBytes,
        wastedBytes,
        wastedMs,
        TransferSizeDisplay: totalBytes ? formatBytes(totalBytes) : undefined,
        savingsDisplay: wastedMs
          ? formatDurationMs(wastedMs)
          : wastedBytes
          ? formatBytes(wastedBytes)
          : undefined,
      });
    }
  }

  return results;
}

function stripMarkdownLinks(text: string): { cleanText: string; docUrl: string | null } {
  let docUrl: string | null = null;
  const linkMatch = text.match(/\[[^\]]+\]\((https?:\/\/[^\s)]+)\)/);
  if (linkMatch && linkMatch[1]) {
    docUrl = linkMatch[1];
  }
  const cleanText = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1").trim();
  return { cleanText, docUrl };
}

export function extractAndPrioritizeOpportunities(
  audits: Record<string, RawLighthouseAudit> | undefined | null
): NormalizedOpportunity[] {
  if (!audits || typeof audits !== "object") {
    return [];
  }

  // Exclude core metric value audits that are already displayed in Section C
  const CORE_METRIC_IDS = new Set([
    "first-contentful-paint",
    "largest-contentful-paint",
    "total-blocking-time",
    "cumulative-layout-shift",
    "speed-index",
    "interactive",
    "max-potential-fid",
    "first-meaningful-paint",
    "metrics",
    "network-requests",
    "network-rtt",
    "network-server-latency",
    "main-thread-tasks",
    "diagnostics",
    "screenshot-thumbnails",
    "final-screenshot",
    "script-treemap-data",
  ]);

  const opportunities: NormalizedOpportunity[] = [];

  for (const [auditId, audit] of Object.entries(audits)) {
    if (!audit || CORE_METRIC_IDS.has(auditId)) continue;

    const mode = audit.scoreDisplayMode;
    if (
      mode === "notApplicable" ||
      mode === "informative" ||
      mode === "manual" ||
      mode === "error"
    ) {
      continue;
    }

    const score = typeof audit.score === "number" ? audit.score : null;
    // Skip passing audits (score >= 0.9)
    if (score === null || score >= 0.9) continue;

    const wastedMs =
      typeof audit.details?.overallSavingsMs === "number"
        ? audit.details.overallSavingsMs
        : typeof audit.metricSavings?.LCP === "number" ||
          typeof audit.metricSavings?.FCP === "number" ||
          typeof audit.metricSavings?.TBT === "number"
        ? Math.max(
            audit.metricSavings?.LCP ?? 0,
            audit.metricSavings?.FCP ?? 0,
            audit.metricSavings?.TBT ?? 0
          )
        : undefined;

    const wastedBytes =
      typeof audit.details?.overallSavingsBytes === "number"
        ? audit.details.overallSavingsBytes
        : undefined;

    const knownMeta = AUDIT_KNOWLEDGE_BASE[auditId];
    const items = extractAffectedResources(audit);

    // Filter out low-signal noise if unknown diagnostic has passing-ish score and no items/savings
    if (
      !knownMeta &&
      score > 0.5 &&
      !wastedMs &&
      !wastedBytes &&
      items.length === 0
    ) {
      continue;
    }

    const { cleanText: cleanedDesc, docUrl: extractedDocUrl } = stripMarkdownLinks(
      audit.description || ""
    );

    const category =
      knownMeta?.category ||
      inferCategoryFromAudit(auditId, audit.title || "");

    const affectsPrimaryLoad =
      knownMeta?.affectsPrimaryLoad ??
      Boolean(
        (wastedMs && wastedMs >= 300) ||
          audit.metricSavings?.LCP ||
          audit.metricSavings?.FCP
      );

    // Calculate deterministic impact score (0 - 100) for evidence-based prioritization
    const severityComponent = (1 - score) * 45; // 0 to 45
    const timeSavingsComponent = wastedMs ? Math.min(30, (wastedMs / 1200) * 30) : 0;
    const byteSavingsComponent = wastedBytes
      ? Math.min(15, (wastedBytes / (400 * 1024)) * 15)
      : 0;
    const primaryLoadBonus = affectsPrimaryLoad ? 10 : 0;

    const impactScore = Number(
      (
        severityComponent +
        timeSavingsComponent +
        byteSavingsComponent +
        primaryLoadBonus
      ).toFixed(2)
    );

    // Determine priority based on evidence, severity, and measured impact
    let priority: "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (
      (score <= 0.49 && (affectsPrimaryLoad || (wastedMs && wastedMs >= 450) || (wastedBytes && wastedBytes >= 250 * 1024))) ||
      (wastedMs && wastedMs >= 750) ||
      impactScore >= 52
    ) {
      priority = "HIGH";
    } else if (
      score <= 0.75 ||
      (wastedMs && wastedMs >= 200) ||
      (wastedBytes && wastedBytes >= 75 * 1024) ||
      impactScore >= 28
    ) {
      priority = "MEDIUM";
    }

    const complexity = knownMeta?.complexity ?? "INVESTIGATION";
    const confidence =
      knownMeta?.confidence ?? (items.length > 0 || wastedMs ? "MEDIUM" : "LOW");

    const savingsParts: string[] = [];
    if (wastedMs && wastedMs >= 50) {
      savingsParts.push(`Est. time impact: ${formatDurationMs(wastedMs)}`);
    }
    if (wastedBytes && wastedBytes >= 4096) {
      savingsParts.push(`Est. payload reduction: ${formatBytes(wastedBytes)}`);
    }
    if (savingsParts.length === 0 && audit.displayValue) {
      savingsParts.push(audit.displayValue);
    }

    opportunities.push({
      sourceAuditIds: [auditId],
      title: knownMeta?.title || audit.title || "Performance Optimization Opportunity",
      originalTitle: audit.title || auditId,
      category,
      priority,
      complexity,
      confidence,
      explanation:
        knownMeta?.explanation ||
        cleanedDesc ||
        "Lighthouse identified an opportunity to reduce loading overhead for this resource.",
      whyItMatters:
        knownMeta?.whyItMatters ||
        "Addressing this finding reduces browser work and helps visitors view and interact with the page more smoothly.",
      recommendation:
        knownMeta?.recommendation ||
        "Review the affected resources below and optimize how they are compressed, prioritized, or delivered.",
      technicalRecommendation:
        knownMeta?.technicalRecommendation ||
        cleanedDesc ||
        `Inspect Lighthouse audit "${auditId}" and optimize the listed resources.`,
      documentationUrl: knownMeta?.defaultDocUrl || extractedDocUrl,
      evidence: {
        items,
        overallSavingsMs: wastedMs,
        overallSavingsBytes: wastedBytes,
        auditScore: score,
        displayValue: audit.displayValue,
      },
      estimatedSavings: {
        wastedMs,
        wastedBytes,
        displayValue: savingsParts.join(" · ") || undefined,
      },
      impactScore,
    });
  }

  // Deduplicate overlapping opportunities that map to the exact same title by merging sourceAuditIds
  const mergedMap = new Map<string, NormalizedOpportunity>();
  for (const opp of opportunities) {
    const existing = mergedMap.get(opp.title);
    if (!existing) {
      mergedMap.set(opp.title, opp);
    } else {
      existing.sourceAuditIds = Array.from(
        new Set([...existing.sourceAuditIds, ...opp.sourceAuditIds])
      );
      if (opp.impactScore > existing.impactScore) {
        existing.impactScore = opp.impactScore;
        existing.priority = opp.priority;
      }
      if (existing.evidence.items.length === 0 && opp.evidence.items.length > 0) {
        existing.evidence.items = opp.evidence.items;
      }
    }
  }

  const priorityRank: Record<"HIGH" | "MEDIUM" | "LOW", number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  return Array.from(mergedMap.values()).sort((a, b) => {
    const rankDiff = priorityRank[b.priority] - priorityRank[a.priority];
    if (rankDiff !== 0) return rankDiff;
    return b.impactScore - a.impactScore;
  });
}
