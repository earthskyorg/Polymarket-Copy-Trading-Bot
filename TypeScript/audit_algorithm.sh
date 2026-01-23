#!/bin/bash

# 🔍 AUDIT COPY TRADING ALGORITHM
# Independent audit script to verify copy trading algorithm accuracy

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    🔍 COPY TRADING ALGORITHM AUDIT - Independent Verification  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default configuration
AUDIT_DAYS=${AUDIT_DAYS:-14}
AUDIT_MULTIPLIER=${AUDIT_MULTIPLIER:-1.0}
AUDIT_STARTING_CAPITAL=${AUDIT_STARTING_CAPITAL:-1000}

# Check if AUDIT_ADDRESSES or USER_ADDRESSES is set
if [ -z "$AUDIT_ADDRESSES" ] && [ -z "$USER_ADDRESSES" ]; then
    echo -e "${YELLOW}⚠️  No AUDIT_ADDRESSES or USER_ADDRESSES environment variable found${NC}"
    echo ""
    echo -e "${CYAN}Please set trader addresses to audit:${NC}"
    echo ""
    echo -e "Option 1: Export addresses in your shell:"
    echo -e "  ${BLUE}export AUDIT_ADDRESSES='0xAddr1,0xAddr2,0xAddr3'${NC}"
    echo ""
    echo -e "Option 2: Pass inline:"
    echo -e "  ${BLUE}AUDIT_ADDRESSES='0xAddr1,0xAddr2' ./audit_algorithm.sh${NC}"
    echo ""
    echo -e "Option 3: Add to .env file:"
    echo -e "  ${BLUE}AUDIT_ADDRESSES='[\"0xAddr1\", \"0xAddr2\"]'${NC}"
    echo ""
    echo -e "${YELLOW}Using default test addresses for demonstration...${NC}"
    echo ""
fi

echo -e "${CYAN}📋 Audit Configuration:${NC}"
echo ""
echo -e "  Period:            ${YELLOW}${AUDIT_DAYS} days${NC}"
echo -e "  Multiplier:        ${YELLOW}${AUDIT_MULTIPLIER}x${NC}"
echo -e "  Starting Capital:  ${GREEN}\$${AUDIT_STARTING_CAPITAL}${NC}"
echo ""

if [ -n "$AUDIT_ADDRESSES" ]; then
    echo -e "${CYAN}👥 Traders to audit:${NC}"
    echo -e "  ${BLUE}${AUDIT_ADDRESSES}${NC}"
    echo ""
elif [ -n "$USER_ADDRESSES" ]; then
    echo -e "${CYAN}👥 Using traders from USER_ADDRESSES:${NC}"
    echo -e "  ${BLUE}${USER_ADDRESSES}${NC}"
    echo ""
fi

echo -e "${CYAN}🚀 Starting audit...${NC}"
echo ""

# Run the audit
AUDIT_DAYS=$AUDIT_DAYS \
AUDIT_MULTIPLIER=$AUDIT_MULTIPLIER \
AUDIT_STARTING_CAPITAL=$AUDIT_STARTING_CAPITAL \
npm run audit

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Audit completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}📊 Results saved to: ${YELLOW}audit_results/${NC}"
    echo ""
    echo -e "${BLUE}To view results:${NC}"
    echo -e "  ${CYAN}ls -la audit_results/${NC}"
    echo -e "  ${CYAN}cat audit_results/audit_*.json | jq '.analysis'${NC}"
else
    echo ""
    echo -e "${RED}✗ Audit failed with exit code: $EXIT_CODE${NC}"
    echo ""
fi

echo ""
echo -e "${CYAN}═════════════════════════════════════════════════════════════════${NC}"
echo ""
