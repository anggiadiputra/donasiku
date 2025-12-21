#!/bin/bash

# Script untuk mengkonfigurasi Fonnte Token di Supabase
# Usage: ./scripts/setup-fonnte.sh

set -e

echo "🔧 Fonnte Configuration Setup"
echo "=============================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first."
    exit 1
fi

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

# Check if FONNTE_TOKEN is set in .env
if [ -z "$FONNTE_TOKEN" ]; then
    echo "❌ Error: FONNTE_TOKEN not found in .env file!"
    echo ""
    echo "Please add FONNTE_TOKEN to your .env file:"
    echo "FONNTE_TOKEN=your_fonnte_token_here"
    exit 1
fi

echo "✅ FONNTE_TOKEN found in .env"
echo ""

# Get project ref from .env or prompt user
if [ -z "$SUPABASE_PROJECT_REF" ]; then
    echo "📝 Please enter your Supabase Project Reference ID:"
    echo "   (You can find this in your Supabase Dashboard URL)"
    echo "   Example: https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
    read -p "Project Ref: " SUPABASE_PROJECT_REF
    
    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        echo "❌ Error: Project Ref is required!"
        exit 1
    fi
fi

echo ""
echo "🔐 Setting up Fonnte Token in Supabase..."
echo ""

# Check if user is logged in to Supabase CLI
if ! npx supabase projects list &> /dev/null; then
    echo "🔑 You need to login to Supabase CLI first"
    echo "Opening login page..."
    npx supabase login
fi

# Set the secret
echo "📤 Uploading FONNTE_TOKEN to Supabase..."
npx supabase secrets set FONNTE_TOKEN="$FONNTE_TOKEN" --project-ref "$SUPABASE_PROJECT_REF"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ FONNTE_TOKEN successfully configured!"
    echo ""
    
    # Ask if user wants to deploy Edge Functions
    read -p "🚀 Do you want to deploy Edge Functions now? (y/n): " deploy_choice
    
    if [ "$deploy_choice" = "y" ] || [ "$deploy_choice" = "Y" ]; then
        echo ""
        echo "📦 Deploying Edge Functions..."
        npx supabase functions deploy check-duitku-transaction --project-ref "$SUPABASE_PROJECT_REF"
        npx supabase functions deploy duitku-callback --project-ref "$SUPABASE_PROJECT_REF"
        
        echo ""
        echo "✅ Edge Functions deployed successfully!"
    fi
    
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Test the integration by making a test transaction"
    echo "2. Check Supabase Edge Functions logs to verify WhatsApp notifications"
    echo "3. Configure WhatsApp message template in Settings page"
    echo ""
    echo "For more information, see: docs/FONNTE_CONFIGURATION.md"
else
    echo ""
    echo "❌ Failed to set FONNTE_TOKEN"
    echo "Please try setting it manually via Supabase Dashboard:"
    echo "1. Go to Settings → Edge Functions → Secrets"
    echo "2. Add new secret: FONNTE_TOKEN"
    echo "3. Save and deploy Edge Functions"
fi
