import { createClient } from '@supabase/supabase-js'

const NASA_POWER_BASE_URL =
  'https://power.larc.nasa.gov/api/temporal/daily/point'
const NASA_PARAMETERS = ['ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN', 'T2M']
const COMMUNITY = 'RE'
const NASA_FILL_VALUE = -999

const NREL_SOLAR_RESOURCE_URL =
  'https://developer.nrel.gov/api/solar/solar_resource/v1.json'
const NREL_NSRDB_DATA_QUERY_URL =
  'https://developer.nrel.gov/api/solar/nsrdb_data_query.json'
const NREL_NSRDB_AGG_V4_DOWNLOAD_URL =
  'https://developer.nrel.gov/api/nsrdb/v2/solar/nsrdb-GOES-aggregated-v4-0-0-download.csv'

const DEFAULT_PERFORMANCE_RATIO = 0.77
const DEFAULT_CAPEX_PER_MW_USD = 1_000_000
const DAYS_PER_YEAR = 365

const NREL_BLEND_WEIGHT = 0.7

const MONTH_KEYS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
]

function toApiDate(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function rangeEndingYesterday(days) {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 1)
  const start = new Date(end)
  start.setUTCDate(end.getUTCDate() - (days - 1))
  return {
    start: toApiDate(start),
    end: toApiDate(end),
    startDate: start,
    endDate: end,
  }
}

function mean(values) {
  if (!values.length) return null
  const sum = values.reduce((acc, v) => acc + v, 0)
  return sum / values.length
}

function cleanSeries(series) {
  if (!series || typeof series !== 'object') return []
  return Object.values(series)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v) && v !== NASA_FILL_VALUE)
}

async function fetchNasaRange({ latitude, longitude, start, end }) {
  const url = new URL(NASA_POWER_BASE_URL)
  url.searchParams.set('parameters', NASA_PARAMETERS.join(','))
  url.searchParams.set('community', COMMUNITY)
  url.searchParams.set('longitude', String(longitude))
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('start', start)
  url.searchParams.set('end', end)
  url.searchParams.set('format', 'JSON')

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `NASA POWER request failed: ${res.status} ${res.statusText} ${text}`
    )
  }
  const json = await res.json()
  const p = json?.properties?.parameter ?? {}
  const all = cleanSeries(p.ALLSKY_SFC_SW_DWN)
  const clr = cleanSeries(p.CLRSKY_SFC_SW_DWN)
  const t = cleanSeries(p.T2M)
  return {
    allSkyIrradiance: mean(all),
    clearSkyIrradiance: mean(clr),
    temperatureC: mean(t),
    dayCount: all.length,
    range: { start, end },
  }
}

export async function fetchNasaPower({
  latitude,
  longitude,
  recentDays = 30,
  historicalDays = 365,
}) {
  const recentWindow = rangeEndingYesterday(recentDays)
  const historicalWindow = rangeEndingYesterday(historicalDays)
  const [recent, historical] = await Promise.all([
    fetchNasaRange({ latitude, longitude, ...recentWindow }),
    fetchNasaRange({ latitude, longitude, ...historicalWindow }),
  ])
  return { recent, historical, recentWindow, historicalWindow }
}

export async function fetchNrelSolarResource({ latitude, longitude, apiKey }) {
  const key = apiKey || process.env.NREL_API_KEY || 'DEMO_KEY'
  const url = new URL(NREL_SOLAR_RESOURCE_URL)
  url.searchParams.set('api_key', key)
  url.searchParams.set('lat', String(latitude))
  url.searchParams.set('lon', String(longitude))

  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `NREL NSRDB request failed: ${res.status} ${res.statusText} ${text}`
    )
  }
  const json = await res.json()
  const errs = Array.isArray(json?.errors) ? json.errors : []
  if (errs.length) throw new Error(`NREL NSRDB error: ${errs.join('; ')}`)

  const out = json?.outputs ?? {}
  const ghiAnnual = Number(out?.avg_ghi?.annual)
  const dniAnnual = Number(out?.avg_dni?.annual)
  const latTiltAnnual = Number(out?.avg_lat_tilt?.annual)
  const monthly = out?.avg_ghi?.monthly ?? {}
  return {
    ghiAnnual: Number.isFinite(ghiAnnual) ? ghiAnnual : null,
    dniAnnual: Number.isFinite(dniAnnual) ? dniAnnual : null,
    latTiltAnnual: Number.isFinite(latTiltAnnual) ? latTiltAnnual : null,
    monthlyGhi: monthly,
    sources: json?.metadata?.sources ?? [],
  }
}

export function weightedMonthlyGhi({ monthlyGhi, startDate, endDate }) {
  if (!monthlyGhi || !startDate || !endDate) return null

  let totalWeight = 0
  let weighted = 0

  const cur = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  )
  const stop = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    )
  )
  while (cur.getTime() <= stop.getTime()) {
    const key = MONTH_KEYS[cur.getUTCMonth()]
    const v = Number(monthlyGhi[key])
    if (Number.isFinite(v)) {
      weighted += v
      totalWeight += 1
    }
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return totalWeight > 0 ? weighted / totalWeight : null
}

async function fetchLatestNsrdbYear({ latitude, longitude, apiKey }) {
  const url = new URL(NREL_NSRDB_DATA_QUERY_URL)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('wkt', `POINT(${longitude} ${latitude})`)
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`NSRDB data_query failed: ${res.status}`)
  }
  const json = await res.json()
  const datasets = Array.isArray(json?.outputs) ? json.outputs : []
  const goes = datasets.find((d) => /GOES.*aggregated/i.test(d.name ?? ''))
  const years = Array.isArray(goes?.availableYears) ? goes.availableYears : []
  const latest = years.length ? Math.max(...years) : null
  return { latestYear: latest, datasetName: goes?.name ?? null }
}

export async function fetchNsrdbHourlyGhiWindow({
  latitude,
  longitude,
  startDate,
  endDate,
  apiKey = process.env.NREL_API_KEY,
  email = process.env.NREL_EMAIL,
}) {
  if (!apiKey || apiKey === 'DEMO_KEY') {
    return {
      matched: null,
      reason: 'NREL_API_KEY not set; hourly download requires a registered key.',
    }
  }
  if (!email) {
    return {
      matched: null,
      reason: 'NREL_EMAIL not set; NSRDB hourly download requires a contact email.',
    }
  }

  const { latestYear } = await fetchLatestNsrdbYear({
    latitude,
    longitude,
    apiKey,
  })
  if (!latestYear) {
    return { matched: null, reason: 'No NSRDB aggregated-v4 year available.' }
  }

  const dl = new URL(NREL_NSRDB_AGG_V4_DOWNLOAD_URL)
  dl.searchParams.set('api_key', apiKey)
  dl.searchParams.set('wkt', `POINT(${longitude} ${latitude})`)
  dl.searchParams.set('names', String(latestYear))
  dl.searchParams.set('interval', '60')
  dl.searchParams.set('utc', 'true')
  dl.searchParams.set('email', email)
  dl.searchParams.set('attributes', 'ghi,dni,dhi,air_temperature')
  dl.searchParams.set('leap_day', 'false')

  const res = await fetch(dl.toString())
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `NSRDB hourly download failed: ${res.status} ${res.statusText} ${text.slice(0, 300)}`
    )
  }
  const csv = await res.text()

  const rows = csv.split(/\r?\n/).filter(Boolean)
  if (rows.length < 4) {
    return { matched: null, reason: 'NSRDB CSV malformed.' }
  }
  const headerIdx = rows.findIndex((r) => /^Year,Month,Day/i.test(r))
  if (headerIdx < 0) {
    return { matched: null, reason: 'NSRDB CSV header not found.' }
  }
  const headers = rows[headerIdx].split(',').map((s) => s.trim())
  const monthIdx = headers.indexOf('Month')
  const dayIdx = headers.indexOf('Day')
  const hourIdx = headers.indexOf('Hour')
  const ghiIdx = headers.indexOf('GHI')
  if (monthIdx < 0 || dayIdx < 0 || hourIdx < 0 || ghiIdx < 0) {
    return { matched: null, reason: 'NSRDB CSV missing required columns.' }
  }

  const windowDays = new Set()
  const d = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  )
  const stop = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    )
  )
  while (d.getTime() <= stop.getTime()) {
    windowDays.add(`${d.getUTCMonth() + 1}-${d.getUTCDate()}`)
    d.setUTCDate(d.getUTCDate() + 1)
  }

  const dailyKwh = new Map()
  for (let i = headerIdx + 1; i < rows.length; i += 1) {
    const cols = rows[i].split(',')
    const m = parseInt(cols[monthIdx], 10)
    const day = parseInt(cols[dayIdx], 10)
    const ghi = parseFloat(cols[ghiIdx])
    if (!Number.isFinite(m) || !Number.isFinite(day) || !Number.isFinite(ghi)) continue
    const key = `${m}-${day}`
    if (!windowDays.has(key)) continue
    dailyKwh.set(key, (dailyKwh.get(key) ?? 0) + ghi / 1000)
  }
  if (!dailyKwh.size) {
    return { matched: null, reason: 'No NSRDB hourly rows matched window.' }
  }
  const daily = [...dailyKwh.values()]
  return {
    matched: mean(daily),
    year: latestYear,
    daysCovered: daily.length,
    reason: null,
  }
}

export function modelYield({
  irradiance,
  systemSizeMw,
  performanceRatio = DEFAULT_PERFORMANCE_RATIO,
}) {
  const irr = Number(irradiance)
  const size = Number(systemSizeMw)
  const pr = Number(performanceRatio)
  if (!Number.isFinite(irr) || !Number.isFinite(size) || !Number.isFinite(pr)) {
    return null
  }
  return irr * size * pr
}

export function calculateSgtScore(actual, expected) {
  const a = Number(actual)
  const e = Number(expected)
  if (!Number.isFinite(a) || !Number.isFinite(e) || e === 0) return null
  return (Math.abs(a - e) / e) * 100
}

export function modelFinancialApy({
  baselineIrradiance,
  systemSizeMw,
  performanceRatio = DEFAULT_PERFORMANCE_RATIO,
  ppaRate,
  omAnnualCost,
  capexPerMwUsd = DEFAULT_CAPEX_PER_MW_USD,
}) {
  const irr = Number(baselineIrradiance)
  const size = Number(systemSizeMw)
  const pr = Number(performanceRatio)
  const ppa = Number(ppaRate)
  const om = Number(omAnnualCost)
  const capexPerMw = Number(capexPerMwUsd)
  if (
    ![irr, size, pr, ppa, om, capexPerMw].every((x) => Number.isFinite(x)) ||
    size <= 0 ||
    capexPerMw <= 0
  ) {
    return null
  }
  const dailyMwh = irr * size * pr
  const annualKwh = dailyMwh * DAYS_PER_YEAR * 1000
  const annualRevenue = annualKwh * ppa
  const netIncome = annualRevenue - om
  const capex = size * capexPerMw
  return (netIncome / capex) * 100
}

export function blendScores({ nasaScore, nrelScore, nrelWeight = NREL_BLEND_WEIGHT }) {
  if (nrelScore != null && nasaScore != null) {
    return nasaScore * (1 - nrelWeight) + nrelScore * nrelWeight
  }
  return nrelScore ?? nasaScore ?? null
}

function createSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase credentials missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in your environment.'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function pct(score, digits = 2) {
  return score === null || score === undefined
    ? 'n/a'
    : `${score.toFixed(digits)}%`
}
function num(v, digits = 2) {
  return v === null || v === undefined ? 'n/a' : v.toFixed(digits)
}

function logVerified({ project, m }) {
  const ts = new Date().toISOString()
  const name = project.name ?? project.id
  console.log(
    `[SGT] ${ts}  VERIFIED  ${name}  |  ` +
      `NASA recent=${num(m.nasaRecent, 3)} (${m.windowLabel})  ` +
      `NREL matched=${num(m.nrelMatched, 3)} (${m.nrelSourceLabel})  ` +
      `expected(NREL)=${num(m.expectedYield, 3)} actual=${num(m.actualYield, 3)} MWh/day  ` +
      `NASA Variance: ${pct(m.sgtScoreNasa)} | NREL Variance: ${pct(m.sgtScoreNrel)}  ` +
      `BLEND=${pct(m.sgtScoreBlended)}  APY=${pct(m.financialApy)}`
  )
}

function logSkip(project, reason) {
  const ts = new Date().toISOString()
  const name = project?.name ?? project?.id ?? 'unknown'
  console.warn(`[SGT] ${ts}  SKIP      ${name}  |  ${reason}`)
}
function logError(project, err) {
  const ts = new Date().toISOString()
  const name = project?.name ?? project?.id ?? 'unknown'
  console.error(`[SGT] ${ts}  ERROR     ${name}  |  ${err.message}`)
}

function readNumber(value) {
  if (value === null || value === undefined) return null
  const n = typeof value === 'string' ? parseFloat(value) : Number(value)
  return Number.isFinite(n) ? n : null
}

function coerceProject(row) {
  return {
    id: row.id,
    name: row.name,
    latitude: readNumber(row.latitude ?? row.lat),
    longitude: readNumber(row.longitude ?? row.lng),
    systemSizeMw: readNumber(row.system_size_mw ?? row.capacity_mw),
    performanceRatio:
      readNumber(row.performance_ratio) ?? DEFAULT_PERFORMANCE_RATIO,
    ppaRate: readNumber(row.ppa_rate),
    omAnnualCost: readNumber(row.om_annual_cost),
  }
}

function round(value, digits) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null
  }
  const f = 10 ** digits
  return Math.round(value * f) / f
}

export async function runSgtEngine({
  supabase,
  recentDays = 30,
  historicalDays = 365,
  capexPerMwUsd = DEFAULT_CAPEX_PER_MW_USD,
  nrelApiKey = process.env.NREL_API_KEY,
  nrelEmail = process.env.NREL_EMAIL,
  nrelWeight = NREL_BLEND_WEIGHT,
  enableHourly = true,
} = {}) {
  const client = supabase ?? createSupabaseClient()
  const keyLabel = nrelApiKey ? 'configured' : 'DEMO_KEY'
  const hourlyEligible = Boolean(enableHourly && nrelApiKey && nrelEmail)

  console.log(
    `[SGT] ${new Date().toISOString()}  START     matched-window dual-oracle  recent=${recentDays}d  historical=${historicalDays}d  nrel_key=${keyLabel}  hourly=${hourlyEligible ? 'enabled' : 'disabled (monthly-matched fallback)'}  weight(NREL)=${nrelWeight}`
  )

  const { data: rows, error } = await client.from('projects').select('*')
  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)

  const summary = {
    total: rows?.length ?? 0,
    verified: 0,
    skipped: 0,
    failed: 0,
    nasaVariances: [],
    nrelVariances: [],
  }

  for (const row of rows ?? []) {
    const project = coerceProject(row)
    try {
      if (project.latitude == null || project.longitude == null) {
        logSkip(project, 'missing latitude/longitude')
        summary.skipped += 1
        continue
      }
      if (project.systemSizeMw == null || project.systemSizeMw <= 0) {
        logSkip(project, 'missing or invalid system_size_mw')
        summary.skipped += 1
        continue
      }

      const nasa = await fetchNasaPower({
        latitude: project.latitude,
        longitude: project.longitude,
        recentDays,
        historicalDays,
      })
      const nasaRecent = nasa.recent.allSkyIrradiance
      const nasaHistorical = nasa.historical.allSkyIrradiance
      if (nasaRecent == null || nasaHistorical == null) {
        logSkip(project, 'no NASA POWER ALLSKY data returned')
        summary.skipped += 1
        continue
      }

      const solar = await fetchNrelSolarResource({
        latitude: project.latitude,
        longitude: project.longitude,
        apiKey: nrelApiKey,
      })
      if (solar.ghiAnnual == null) {
        logSkip(project, 'no NREL NSRDB GHI returned')
        summary.skipped += 1
        continue
      }

      let nrelMatched = null
      let nrelSourceLabel = 'monthly-matched'
      let dataResolution = '4km - Matched Monthly'
      if (hourlyEligible) {
        try {
          const hourly = await fetchNsrdbHourlyGhiWindow({
            latitude: project.latitude,
            longitude: project.longitude,
            startDate: nasa.recentWindow.startDate,
            endDate: nasa.recentWindow.endDate,
            apiKey: nrelApiKey,
            email: nrelEmail,
          })
          if (hourly?.matched != null) {
            nrelMatched = hourly.matched
            nrelSourceLabel = `hourly-matched year=${hourly.year}`
            dataResolution = '4km - Hourly PSM v3'
          } else {
            console.warn(
              `[SGT] ${new Date().toISOString()}  HOURLY    ${project.name}  |  fallback to monthly-matched: ${hourly?.reason}`
            )
          }
        } catch (e) {
          console.warn(
            `[SGT] ${new Date().toISOString()}  HOURLY    ${project.name}  |  error, fallback to monthly-matched: ${e.message}`
          )
        }
      }
      if (nrelMatched == null) {
        nrelMatched = weightedMonthlyGhi({
          monthlyGhi: solar.monthlyGhi,
          startDate: nasa.recentWindow.startDate,
          endDate: nasa.recentWindow.endDate,
        })
        if (nrelMatched == null) {
          nrelMatched = solar.ghiAnnual
          nrelSourceLabel = 'annual-fallback'
          dataResolution = '4km - Annual Climatology'
        }
      }

      const nasaExpected = modelYield({
        irradiance: nasaHistorical,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })
      const nasaActual = modelYield({
        irradiance: nasaRecent,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })
      const sgtScoreNasa = calculateSgtScore(nasaActual, nasaExpected)

      const nrelExpected = modelYield({
        irradiance: nrelMatched,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })
      const nrelActual = modelYield({
        irradiance: nasaRecent,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })
      const sgtScoreNrel = calculateSgtScore(nrelActual, nrelExpected)
      const sgtScoreBlended = blendScores({
        nasaScore: sgtScoreNasa,
        nrelScore: sgtScoreNrel,
        nrelWeight,
      })

      const financialApy =
        project.ppaRate != null && project.omAnnualCost != null
          ? modelFinancialApy({
              baselineIrradiance: solar.ghiAnnual,
              systemSizeMw: project.systemSizeMw,
              performanceRatio: project.performanceRatio,
              ppaRate: project.ppaRate,
              omAnnualCost: project.omAnnualCost,
              capexPerMwUsd,
            })
          : null

      const windowLabel = `${toApiDate(nasa.recentWindow.startDate)}..${toApiDate(nasa.recentWindow.endDate)}`

      const { error: updateError } = await client
        .from('projects')
        .update({
          expected_yield: round(nrelExpected, 6),
          sgt_score_nasa: round(sgtScoreNasa, 4),
          sgt_score_nrel: round(sgtScoreNrel, 4),
          sgt_score_blended: round(sgtScoreBlended, 4),
          sgt_score: round(sgtScoreNrel, 4),
          nrel_ghi_kwh_m2_day: round(nrelMatched, 4),
          financial_apy: financialApy == null ? null : round(financialApy, 4),
          data_resolution: dataResolution,
          status: 'SGT Verified',
        })
        .eq('id', project.id)
      if (updateError) {
        throw new Error(`Supabase update failed: ${updateError.message}`)
      }

      logVerified({
        project,
        m: {
          nasaRecent,
          nasaHistorical,
          nrelMatched,
          nrelSourceLabel,
          windowLabel,
          expectedYield: nrelExpected,
          actualYield: nrelActual,
          sgtScoreNasa,
          sgtScoreNrel,
          sgtScoreBlended,
          financialApy,
        },
      })
      summary.verified += 1
      if (sgtScoreNasa != null) summary.nasaVariances.push(sgtScoreNasa)
      if (sgtScoreNrel != null) summary.nrelVariances.push(sgtScoreNrel)
    } catch (err) {
      logError(project, err)
      summary.failed += 1
    }
  }

  const avg = (arr) =>
    arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null
  console.log(
    `[SGT] ${new Date().toISOString()}  COMPLETE  verified=${summary.verified} skipped=${summary.skipped} failed=${summary.failed} total=${summary.total}  ` +
      `AVG  NASA=${pct(avg(summary.nasaVariances))}  NREL=${pct(avg(summary.nrelVariances))}  target<=5%`
  )

  return summary
}

const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('nasa-power.js')
if (isDirectInvocation) {
  runSgtEngine().catch((err) => {
    console.error(`[SGT] ${new Date().toISOString()}  FATAL     ${err.message}`)
    process.exit(1)
  })
}
