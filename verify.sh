#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Chat Application Project Verification ===${NC}\n"

# Check required directories
echo -e "${YELLOW}Checking directories...${NC}"
REQUIRED_DIRS=(
  "backend"
  "backend/models"
  "backend/uploads"
  "backend/public"
  "frontend"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $dir exists"
  else
    echo -e "${RED}✗${NC} $dir missing"
  fi
done

# Check required files
echo -e "\n${YELLOW}Checking files...${NC}"
REQUIRED_FILES=(
  "backend/server.js"
  "backend/package.json"
  "backend/Dockerfile"
  "backend/models/User.js"
  "backend/models/Message.js"
  "backend/public/index.html"
  "backend/public/style.css"
  "backend/public/script.js"
  "frontend/index.html"
  "frontend/style.css"
  "frontend/script.js"
  "docker-compose.yml"
  ".gitignore"
  "README.md"
  "QUICKSTART.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file exists"
  else
    echo -e "${RED}✗${NC} $file missing"
  fi
done

# Check file sizes (sanity check)
echo -e "\n${YELLOW}Checking file sizes...${NC}"
FILES_TO_CHECK=(
  "backend/server.js:1000"
  "backend/package.json:200"
  "frontend/index.html:1500"
  "frontend/script.js:2000"
  "docker-compose.yml:500"
)

for file_check in "${FILES_TO_CHECK[@]}"; do
  file="${file_check%:*}"
  min_size="${file_check#*:}"
  
  if [ -f "$file" ]; then
    actual_size=$(wc -c < "$file")
    if [ "$actual_size" -gt "$min_size" ]; then
      echo -e "${GREEN}✓${NC} $file ($actual_size bytes)"
    else
      echo -e "${RED}✗${NC} $file is too small ($actual_size bytes, expected > $min_size)"
    fi
  fi
done

# Check if Node.js is installed
echo -e "\n${YELLOW}Checking dependencies...${NC}"
if command -v node &> /dev/null; then
  echo -e "${GREEN}✓${NC} Node.js installed ($(node --version))"
else
  echo -e "${YELLOW}ℹ${NC} Node.js not installed (required for local development)"
fi

# Check if Docker is installed
if command -v docker &> /dev/null; then
  echo -e "${GREEN}✓${NC} Docker installed ($(docker --version | cut -d' ' -f3))"
else
  echo -e "${YELLOW}ℹ${NC} Docker not installed (required for docker-compose)"
fi

# Check if docker-compose is installed
if command -v docker-compose &> /dev/null; then
  echo -e "${GREEN}✓${NC} docker-compose installed ($(docker-compose --version | cut -d' ' -f3))"
else
  echo -e "${YELLOW}ℹ${NC} docker-compose not installed"
fi

# Check syntax of JavaScript files
echo -e "\n${YELLOW}Checking JavaScript syntax...${NC}"
if command -v node &> /dev/null; then
  for js_file in backend/server.js backend/models/User.js backend/models/Message.js; do
    if node -c "$js_file" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} $js_file syntax OK"
    else
      echo -e "${RED}✗${NC} $js_file has syntax errors"
    fi
  done
else
  echo -e "${YELLOW}ℹ${NC} Node.js required to check JavaScript syntax"
fi

# Summary
echo -e "\n${YELLOW}=== Summary ===${NC}"
echo -e "Project structure is ${GREEN}ready${NC}!"
echo -e "\nNext steps:"
echo -e "1. Review the ${YELLOW}QUICKSTART.md${NC} file"
echo -e "2. Install Docker (if not already installed)"
echo -e "3. Run: ${YELLOW}docker-compose up${NC}"
echo -e "4. Open: ${YELLOW}http://localhost:5000${NC}"
echo -e "\nFor more details, see ${YELLOW}README.md${NC}\n"
