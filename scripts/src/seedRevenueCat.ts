import { rcGet, rcPost, rcPatch } from "./revenueCatClient.js";

const PROJECT_NAME = "AttenteZéro";
const PRODUCT_IDENTIFIER = "attentezero_premium_onetime";
const PLAY_STORE_PRODUCT_IDENTIFIER = "attentezero_premium_onetime:onetime";
const PRODUCT_DISPLAY_NAME = "AttenteZéro Premium";
const PRODUCT_USER_FACING_TITLE = "AttenteZéro Premium — À vie";
const PRODUCT_DURATION = "P1Y"; // one-time lifetime via annual as best proxy

const APP_STORE_APP_NAME = "AttenteZéro iOS";
const APP_STORE_BUNDLE_ID = "com.attentezero.app";
const PLAY_STORE_APP_NAME = "AttenteZéro Android";
const PLAY_STORE_PACKAGE_NAME = "com.attentezero.app";

const ENTITLEMENT_IDENTIFIER = "premium";
const ENTITLEMENT_DISPLAY_NAME = "Premium Access";

const OFFERING_IDENTIFIER = "default";
const OFFERING_DISPLAY_NAME = "Default Offering";

const PACKAGE_IDENTIFIER = "$rc_lifetime";
const PACKAGE_DISPLAY_NAME = "Lifetime Premium";

// 20 CAD ≈ 14.99 USD after Apple 30% cut (or 16.99 with 15% Small Business)
const PRODUCT_PRICES = [
  { amount_micros: 14990000, currency: "USD" },
  { amount_micros: 19990000, currency: "CAD" },
];

type RCItem = { id: string; name?: string; lookup_key?: string; type?: string; app_id?: string; store_identifier?: string; is_current?: boolean };
type RCList<T> = { items: T[] };

async function seedRevenueCat() {
  // 1. Find or create project
  const projects = await rcGet<RCList<RCItem & { name: string }>>("/v2/projects?limit=20");
  let project = projects.items?.find((p) => p.name === PROJECT_NAME);

  if (!project) {
    project = await rcPost<RCItem & { name: string }>("/v2/projects", { name: PROJECT_NAME });
    console.log("✅ Created project:", project.id);
  } else {
    console.log("✅ Project found:", project.id);
  }

  const projectId = project.id;

  // 2. List apps
  const apps = await rcGet<RCList<RCItem & { type: string }>>(`/v2/projects/${projectId}/apps?limit=20`);
  let testApp = apps.items?.find((a) => a.type === "test_store");
  let appStoreApp = apps.items?.find((a) => a.type === "app_store");
  let playStoreApp = apps.items?.find((a) => a.type === "play_store");

  if (!testApp) throw new Error("No test store app found — check project setup in RevenueCat dashboard");
  console.log("✅ Test Store app:", testApp.id);

  if (!appStoreApp) {
    appStoreApp = await rcPost<RCItem>(`/v2/projects/${projectId}/apps`, {
      name: APP_STORE_APP_NAME,
      type: "app_store",
      app_store: { bundle_id: APP_STORE_BUNDLE_ID },
    });
    console.log("✅ Created App Store app:", appStoreApp.id);
  } else {
    console.log("✅ App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    playStoreApp = await rcPost<RCItem>(`/v2/projects/${projectId}/apps`, {
      name: PLAY_STORE_APP_NAME,
      type: "play_store",
      play_store: { package_name: PLAY_STORE_PACKAGE_NAME },
    });
    console.log("✅ Created Play Store app:", playStoreApp.id);
  } else {
    console.log("✅ Play Store app:", playStoreApp.id);
  }

  // 3. Ensure products
  const allProducts = await rcGet<RCList<RCItem & { store_identifier: string; app_id: string }>>(`/v2/projects/${projectId}/products?limit=100`);

  const ensureProduct = async (appId: string, storeId: string, label: string, isTestStore: boolean) => {
    const existing = allProducts.items?.find((p) => p.store_identifier === storeId && p.app_id === appId);
    if (existing) { console.log(`✅ ${label} product:`, existing.id); return existing; }
    const body: Record<string, unknown> = {
      store_identifier: storeId,
      app_id: appId,
      type: "subscription",
      display_name: PRODUCT_DISPLAY_NAME,
    };
    if (isTestStore) {
      body.subscription = { duration: PRODUCT_DURATION };
      body.title = PRODUCT_USER_FACING_TITLE;
    }
    const p = await rcPost<RCItem>(`/v2/projects/${projectId}/products`, body);
    console.log(`✅ Created ${label} product:`, p.id);
    return p;
  };

  const testProduct = await ensureProduct(testApp.id, PRODUCT_IDENTIFIER, "Test Store", true);
  const iosProduct = await ensureProduct(appStoreApp.id, PRODUCT_IDENTIFIER, "App Store", false);
  const androidProduct = await ensureProduct(playStoreApp.id, PLAY_STORE_PRODUCT_IDENTIFIER, "Play Store", false);

  // 4. Add test store prices
  try {
    await rcPost(`/v2/projects/${projectId}/products/${testProduct.id}/test_store_prices`, { prices: PRODUCT_PRICES });
    console.log("✅ Test store prices set");
  } catch {
    console.log("ℹ️ Test store prices already exist or skipped");
  }

  // 5. Entitlement
  const entitlements = await rcGet<RCList<RCItem & { lookup_key: string }>>(`/v2/projects/${projectId}/entitlements?limit=20`);
  let entitlement = entitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (!entitlement) {
    entitlement = await rcPost<RCItem>(`/v2/projects/${projectId}/entitlements`, {
      lookup_key: ENTITLEMENT_IDENTIFIER,
      display_name: ENTITLEMENT_DISPLAY_NAME,
    });
    console.log("✅ Created entitlement:", entitlement.id);
  } else {
    console.log("✅ Entitlement:", entitlement.id);
  }

  // Attach products to entitlement
  try {
    await rcPost(`/v2/projects/${projectId}/entitlements/${entitlement.id}/products/attach`, {
      product_ids: [testProduct.id, iosProduct.id, androidProduct.id],
    });
    console.log("✅ Products attached to entitlement");
  } catch {
    console.log("ℹ️ Products already attached to entitlement");
  }

  // 6. Offering
  const offerings = await rcGet<RCList<RCItem & { lookup_key: string; is_current: boolean }>>(`/v2/projects/${projectId}/offerings?limit=20`);
  let offering = offerings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (!offering) {
    offering = await rcPost<RCItem & { is_current: boolean }>(`/v2/projects/${projectId}/offerings`, {
      lookup_key: OFFERING_IDENTIFIER,
      display_name: OFFERING_DISPLAY_NAME,
    });
    console.log("✅ Created offering:", offering.id);
  } else {
    console.log("✅ Offering:", offering.id);
  }

  if (!offering.is_current) {
    await rcPatch(`/v2/projects/${projectId}/offerings/${offering.id}`, { is_current: true });
    console.log("✅ Set offering as current");
  }

  // 7. Package
  const packages = await rcGet<RCList<RCItem & { lookup_key: string }>>(`/v2/projects/${projectId}/offerings/${offering.id}/packages?limit=20`);
  let pkg = packages.items?.find((p) => p.lookup_key === PACKAGE_IDENTIFIER);
  if (!pkg) {
    pkg = await rcPost<RCItem>(`/v2/projects/${projectId}/offerings/${offering.id}/packages`, {
      lookup_key: PACKAGE_IDENTIFIER,
      display_name: PACKAGE_DISPLAY_NAME,
    });
    console.log("✅ Created package:", pkg.id);
  } else {
    console.log("✅ Package:", pkg.id);
  }

  // Attach products to package
  try {
    await rcPost(`/v2/projects/${projectId}/packages/${pkg.id}/products/attach`, {
      products: [
        { product_id: testProduct.id, eligibility_criteria: "all" },
        { product_id: iosProduct.id, eligibility_criteria: "all" },
        { product_id: androidProduct.id, eligibility_criteria: "all" },
      ],
    });
    console.log("✅ Products attached to package");
  } catch {
    console.log("ℹ️ Products already attached to package");
  }

  // 8. Get public API keys
  const testKeys = await rcGet<{ items: { key: string }[] }>(`/v2/projects/${projectId}/apps/${testApp.id}/api_keys?limit=10`);
  const iosKeys = await rcGet<{ items: { key: string }[] }>(`/v2/projects/${projectId}/apps/${appStoreApp.id}/api_keys?limit=10`);
  const androidKeys = await rcGet<{ items: { key: string }[] }>(`/v2/projects/${projectId}/apps/${playStoreApp.id}/api_keys?limit=10`);

  console.log("\n════════════════════════════════════════");
  console.log("✅ RevenueCat setup complete — AttenteZéro");
  console.log("════════════════════════════════════════");
  console.log("REVENUECAT_PROJECT_ID =", projectId);
  console.log("REVENUECAT_TEST_STORE_APP_ID =", testApp.id);
  console.log("REVENUECAT_APPLE_APP_STORE_APP_ID =", appStoreApp.id);
  console.log("REVENUECAT_GOOGLE_PLAY_STORE_APP_ID =", playStoreApp.id);
  console.log("EXPO_PUBLIC_REVENUECAT_TEST_API_KEY =", testKeys.items?.[0]?.key ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_IOS_API_KEY =", iosKeys.items?.[0]?.key ?? "N/A");
  console.log("EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY =", androidKeys.items?.[0]?.key ?? "N/A");
  console.log("════════════════════════════════════════\n");
}

seedRevenueCat().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
