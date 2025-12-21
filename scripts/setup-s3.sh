#!/bin/bash

# Setup script for S3/Storage upload function
# Usage: ./scripts/setup-s3.sh

echo "🚀 Setting up S3 Upload Edge Function..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Load variables from .env
echo "📥 Reading S3 config from .env..."
source .env

# Validate S3 config
if [ -z "$VITE_S3_ENDPOINT" ] || [ -z "$VITE_S3_ACCESS_KEY_ID" ] || [ -z "$VITE_S3_SECRET_ACCESS_KEY" ] || [ -z "$VITE_S3_BUCKET" ]; then
    echo "❌ Missing S3 configuration in .env"
    echo "Please ensure the following variables are set:"
    echo "  - VITE_S3_ENDPOINT"
    echo "  - VITE_S3_ACCESS_KEY_ID"
    echo "  - VITE_S3_SECRET_ACCESS_KEY"
    echo "  - VITE_S3_BUCKET"
    exit 1
fi

# Get Project Ref
if [ -z "$VITE_SUPABASE_URL" ]; then
    # Try to extract from URL if not set explicitly or prompt
    echo "⚠️ VITE_SUPABASE_URL not found in .env"
    read -p "Enter your Supabase Project Reference (e.g., mvrfx...): " PROJECT_REF
else
    # Extract project ref from URL (https://<project-ref>.supabase.co)
    PROJECT_REF=$(echo $VITE_SUPABASE_URL | awk -F'.' '{print $1}' | awk -F'//' '{print $2}')
    echo "ℹ️  Project Ref detected: $PROJECT_REF"
fi

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project Reference is required."
    exit 1
fi

echo "🔐 Setting Supabase Secrets (S3 Credentials)..."
# Map VITE_ vars to Backend vars
npx supabase secrets set \
    S3_ENDPOINT="$VITE_S3_ENDPOINT" \
    S3_REGION="${VITE_S3_REGION:-auto}" \
    S3_ACCESS_KEY_ID="$VITE_S3_ACCESS_KEY_ID" \
    S3_SECRET_ACCESS_KEY="$VITE_S3_SECRET_ACCESS_KEY" \
    S3_BUCKET="$VITE_S3_BUCKET" \
    S3_PUBLIC_URL="$VITE_S3_PUBLIC_URL" \
    --project-ref "$PROJECT_REF"

echo "☁️  Deploying 'upload-to-s3' Edge Function..."
npx supabase functions deploy upload-to-s3 --project-ref "$PROJECT_REF" --no-verify-jwt

echo "✅ Deployment complete!"
echo ""
echo "📝 NEXT STEP:"
echo "Update your .env file with the following line:"
echo ""
echo "VITE_S3_API_ENDPOINT=https://$PROJECT_REF.supabase.co/functions/v1/upload-to-s3"
echo ""
echo "After updating .env, restart your dev server (npm run dev) and test the S3 connection in Settings."
