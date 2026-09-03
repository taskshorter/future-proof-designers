process.env.APP_ENV = "local";
process.env.NEXT_PUBLIC_APP_ENV = "local";
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
process.env.FACTORY_CUSTOMER_GATEWAY_URL = "http://127.0.0.1:3001";

import "@testing-library/jest-dom/vitest";
