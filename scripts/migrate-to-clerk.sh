#!/bin/bash

# Clerk Migration Script
# This script automates the migration from Better Auth to Clerk

set -e

echo "🚀 Starting Clerk Migration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Update API dependencies
echo -e "${YELLOW}📦 Step 1: Updating API dependencies...${NC}"
cd apps/api
pnpm remove better-auth better-auth-cloudflare || true
pnpm add @clerk/backend
cd ../..
echo -e "${GREEN}✅ API dependencies updated${NC}"

# Step 2: Update Web dependencies
echo -e "${YELLOW}📦 Step 2: Updating Web dependencies...${NC}"
cd apps/web
pnpm remove better-auth || true
pnpm add @clerk/clerk-react
cd ../..
echo -e "${GREEN}✅ Web dependencies updated${NC}"

# Step 3: Backup current auth files
echo -e "${YELLOW}💾 Step 3: Backing up current auth files...${NC}"
mkdir -p .backup/auth
cp apps/api/src/auth/index.ts .backup/auth/api-auth-index.ts 2>/dev/null || true
cp apps/api/src/middleware/authMiddleware.ts .backup/auth/api-authMiddleware.ts 2>/dev/null || true
cp apps/web/src/lib/auth-client.ts .backup/auth/web-auth-client.ts 2>/dev/null || true
cp apps/web/src/contexts/AuthContext.tsx .backup/auth/web-AuthContext.tsx 2>/dev/null || true
echo -e "${GREEN}✅ Backup completed in .backup/auth/${NC}"

# Step 4: Create environment template files
echo -e "${YELLOW}📝 Step 4: Creating environment templates...${NC}"

cat > apps/api/.env.clerk << 'EOF'
# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_key_here

# Environment
ENVIRONMENT=development
FRONTEND_URL=http://localhost:5174

# Database (existing)
# Add your existing database config here
EOF

cat > apps/web/.env.clerk << 'EOF'
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here

# API Configuration
VITE_API_URL=http://localhost:8787
VITE_SITE_URL=http://localhost:5173
EOF

echo -e "${GREEN}✅ Environment templates created${NC}"
echo -e "${YELLOW}⚠️  Please update .env.clerk files with your Clerk keys${NC}"

# Step 5: Instructions
echo ""
echo -e "${GREEN}✅ Migration preparation complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Create a Clerk account at https://clerk.com"
echo "2. Create a new application in Clerk Dashboard"
echo "3. Configure roles in Clerk: admin, pa, consultant, reception"
echo "4. Copy your Clerk keys to the .env.clerk files"
echo "5. Update wrangler.json with Clerk environment variables"
echo "6. Test the new authentication flow"
echo ""
echo -e "${YELLOW}To rollback:${NC}"
echo "Restore files from .backup/auth/ directory"
echo ""
echo "📚 See CLERK_MIGRATION_GUIDE.md for detailed instructions"
