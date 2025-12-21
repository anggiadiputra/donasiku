#!/bin/bash

# Script untuk membantu migrasi warna hardcoded ke dynamic theming
# Usage: ./migrate-colors.sh <filename>

echo "🎨 Dynamic Color Migration Helper"
echo "=================================="
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./migrate-colors.sh <filename>"
  echo "Example: ./migrate-colors.sh src/pages/ZakatPage.tsx"
  exit 1
fi

FILE=$1

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "📄 Processing: $FILE"
echo ""

# Count hardcoded colors
ORANGE_COUNT=$(grep -o "orange-[0-9]" "$FILE" | wc -l | tr -d ' ')
BLUE_COUNT=$(grep -o "blue-[0-9]" "$FILE" | wc -l | tr -d ' ')
PINK_COUNT=$(grep -o "pink-[0-9]" "$FILE" | wc -l | tr -d ' ')
PURPLE_COUNT=$(grep -o "purple-[0-9]" "$FILE" | wc -l | tr -d ' ')

echo "📊 Hardcoded Colors Found:"
echo "   - Orange: $ORANGE_COUNT instances"
echo "   - Blue: $BLUE_COUNT instances"
echo "   - Pink: $PINK_COUNT instances"
echo "   - Purple: $PURPLE_COUNT instances"
echo ""

TOTAL=$((ORANGE_COUNT + BLUE_COUNT + PINK_COUNT + PURPLE_COUNT))

if [ $TOTAL -eq 0 ]; then
  echo "✅ No hardcoded colors found! File is already migrated."
  exit 0
fi

echo "🔍 Lines with hardcoded colors:"
echo ""
grep -n "orange-[0-9]\|blue-[67]\|pink-[0-9]\|purple-[0-9]" "$FILE" | head -20
echo ""

echo "💡 Suggested Actions:"
echo ""
echo "1. Add imports:"
echo "   import { usePrimaryColor } from '../hooks/usePrimaryColor';"
echo "   import { getHoverColor, addAlpha } from '../utils/colorUtils';"
echo ""
echo "2. Add hooks in component:"
echo "   const primaryColor = usePrimaryColor();"
echo "   const hoverColor = getHoverColor(primaryColor);"
echo ""
echo "3. Common replacements:"
echo "   bg-orange-500 → style={{ backgroundColor: primaryColor }}"
echo "   text-orange-500 → style={{ color: primaryColor }}"
echo "   hover:bg-orange-600 → onMouseEnter/onMouseLeave with hoverColor"
echo "   border-orange-500 → style={{ borderColor: primaryColor }}"
echo ""
echo "📝 Total instances to update: $TOTAL"
echo ""
