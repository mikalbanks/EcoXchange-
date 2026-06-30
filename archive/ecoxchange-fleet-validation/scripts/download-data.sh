#!/usr/bin/env bash
# Download USPVDB, EIA Form 860, and EIA Form 923 into ./data/.
# URLs follow the spec. The exact filenames may rotate as new revisions ship;
# update them annually.

set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/.." && pwd)
cd "$ROOT"

mkdir -p data/uspvdb data/eia860 data/eia923

# 1. USPVDB CSV (USGS / LBNL)
USPVDB_URL="${USPVDB_URL:-https://energy.usgs.gov/uspvdb/assets/data/uspvdbCSV.zip}"
echo "Downloading USPVDB from $USPVDB_URL ..."
curl -fL "$USPVDB_URL" -o data/uspvdb/uspvdbCSV.zip
( cd data/uspvdb && unzip -o -q uspvdbCSV.zip )
# Find the unzipped CSV (filename includes version stamp) and copy to a stable name
CSV_FILE=$(find data/uspvdb -maxdepth 2 -name '*.csv' ! -name 'uspvdb_centroids.csv' | head -1)
if [ -n "$CSV_FILE" ]; then
  cp -f "$CSV_FILE" data/uspvdb/uspvdb_centroids.csv
fi

# 2. EIA 860 (year is configurable; default 2024 = latest complete year)
#    EIA serves the latest year at /xls/ and older years at /archive/xls/.
EIA860_YEAR="${EIA860_YEAR:-2024}"
EIA860_URL="${EIA860_URL:-https://www.eia.gov/electricity/data/eia860/xls/eia860${EIA860_YEAR}.zip}"
echo "Downloading EIA 860 ${EIA860_YEAR} from $EIA860_URL ..."
fetch_eia () {
  local url="$1"; local out="$2"
  curl -fL "$url" -o "$out" || return 1
  if ! unzip -t "$out" >/dev/null 2>&1; then
    return 2
  fi
  return 0
}
if ! fetch_eia "$EIA860_URL" data/eia860/eia860.zip; then
  EIA860_URL="https://www.eia.gov/electricity/data/eia860/archive/xls/eia860${EIA860_YEAR}.zip"
  echo "Falling back to archive: $EIA860_URL"
  fetch_eia "$EIA860_URL" data/eia860/eia860.zip
fi
( cd data/eia860 && unzip -o -q eia860.zip )
# Solar workbook is named 3_3_Solar_Y{year}.xlsx (was 3_1 in older releases)
SOLAR_FILE=$(find data/eia860 -maxdepth 2 -iname '*Solar*Y*.xlsx' | head -1)
if [ -n "$SOLAR_FILE" ]; then cp -f "$SOLAR_FILE" data/eia860/eia860_solar.xlsx; fi

# 3. EIA 923 (year is configurable; default 2024)
EIA923_YEAR="${EIA923_YEAR:-2024}"
EIA923_URL="${EIA923_URL:-https://www.eia.gov/electricity/data/eia923/xls/f923_${EIA923_YEAR}.zip}"
echo "Downloading EIA 923 ${EIA923_YEAR} from $EIA923_URL ..."
if ! fetch_eia "$EIA923_URL" data/eia923/eia923.zip; then
  EIA923_URL="https://www.eia.gov/electricity/data/eia923/archive/xls/f923_${EIA923_YEAR}.zip"
  echo "Falling back to archive: $EIA923_URL"
  fetch_eia "$EIA923_URL" data/eia923/eia923.zip
fi
( cd data/eia923 && unzip -o -q eia923.zip )
# The generation data we want is in Schedules_2_3_4_5_M_12 (monthly).
SCHEDULES_FILE=$(find data/eia923 -maxdepth 2 -iname 'EIA923_Schedules_2_3_4_5_M_12*.xlsx' | head -1)
if [ -n "$SCHEDULES_FILE" ]; then cp -f "$SCHEDULES_FILE" data/eia923/EIA923_Schedules.xlsx; fi

echo "Done. Files at:"
echo "  data/uspvdb/uspvdb_centroids.csv"
echo "  data/eia860/eia860_solar.xlsx"
echo "  data/eia923/EIA923_Schedules.xlsx"
