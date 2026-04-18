import { createClient } from '@supabase/supabase-js'

const NASA_POWER_BASE_URL =
  'https://power.larc.nasa.gov/api/temporal/daily/point'

const NASA_PARAMETERS = ['ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN', 'T2M']
const COMMUNITY = 'RE'

const NASA_FILL_VALUE = -999

const DEFAULT_PERFORMANCE_RATIO = 0.77

const DEFAULT_CAPEX_PER_MW_USD = 1_000_000

const DAYS_PER_YEAR = 365

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
  return { start: toApiDate(start), end: toApiDate(end) }
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

  return { recent, historical }
}

export function modelExpectedYield({
  nasaHistoricalAvg,
  systemSizeMw,
  performanceRatio = DEFAULT_PERFORMANCE_RATIO,
}) {
  const irr = Number(nasaHistoricalAvg)
  const size = Number(systemSizeMw)
  const pr = Number(performanceRatio)
  if (!Number.isFinite(irr) || !Number.isFinite(size) || !Number.isFinite(pr)) {
    return null
  }
  return irr * size * pr
}

export function modelActualYield({
  nasaRecentAvg,
  systemSizeMw,
  performanceRatio = DEFAULT_PERFORMANCE_RATIO,
}) {
  const irr = Number(nasaRecentAvg)
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
  nasaHistoricalAvg,
  systemSizeMw,
  performanceRatio = DEFAULT_PERFORMANCE_RATIO,
  ppaRate,
  omAnnualCost,
  capexPerMwUsd = DEFAULT_CAPEX_PER_MW_USD,
}) {
  const irr = Number(nasaHistoricalAvg)
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
  const annualMwh = dailyMwh * DAYS_PER_YEAR
  const annualKwh = annualMwh * 1000
  const annualRevenue = annualKwh * ppa
  const netIncome = annualRevenue - om
  const capex = size * capexPerMw

  return (netIncome / capex) * 100
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

function num(value, digits = 2) {
  return value === null || value === undefined ? 'n/a' : value.toFixed(digits)
}

function logVerified({ project, metrics }) {
  const ts = new Date().toISOString()
  const name = project.name ?? project.id
  console.log(
    `[SGT] ${ts}  VERIFIED  ${name}  |  lat=${project.latitude},lng=${project.longitude}  hist=${num(
      metrics.nasaHistoricalAvg,
      3
    )} kWh/m^2/day  recent=${num(metrics.nasaRecentAvg, 3)}  size=${num(
      project.systemSizeMw,
      2
    )} MW  PR=${num(project.performanceRatio, 2)}  expected=${num(
      metrics.expectedYield,
      3
    )} MWh/day  actual=${num(metrics.actualYield, 3)} MWh/day  SGT=${pct(
      metrics.sgtScore
    )}  APY=${pct(metrics.financialApy)}`
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

export async function runSgtEngine({
  supabase,
  recentDays = 30,
  historicalDays = 365,
  capexPerMwUsd = DEFAULT_CAPEX_PER_MW_USD,
} = {}) {
  const client = supabase ?? createSupabaseClient()

  console.log(
    `[SGT] ${new Date().toISOString()}  START     recent=${recentDays}d  historical=${historicalDays}d  capex=$${capexPerMwUsd.toLocaleString()}/MW`
  )

  const { data: rows, error } = await client.from('projects').select('*')
  if (error) throw new Error(`Failed to fetch projects: ${error.message}`)

  const summary = {
    total: rows?.length ?? 0,
    verified: 0,
    skipped: 0,
    failed: 0,
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

      const { recent, historical } = await fetchNasaPower({
        latitude: project.latitude,
        longitude: project.longitude,
        recentDays,
        historicalDays,
      })

      const nasaHistoricalAvg = historical.allSkyIrradiance
      const nasaRecentAvg = recent.allSkyIrradiance
      if (nasaHistoricalAvg == null || nasaRecentAvg == null) {
        logSkip(project, 'no ALLSKY_SFC_SW_DWN data returned from NASA POWER')
        summary.skipped += 1
        continue
      }

      const expectedYield = modelExpectedYield({
        nasaHistoricalAvg,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })

      const actualYield = modelActualYield({
        nasaRecentAvg,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })

      const sgtScore = calculateSgtScore(actualYield, expectedYield)

      const financialApy =
        project.ppaRate != null && project.omAnnualCost != null
          ? modelFinancialApy({
              nasaHistoricalAvg,
              systemSizeMw: project.systemSizeMw,
              performanceRatio: project.performanceRatio,
              ppaRate: project.ppaRate,
              omAnnualCost: project.omAnnualCost,
              capexPerMwUsd,
            })
          : null

      if (sgtScore == null) {
        logSkip(project, 'unable to compute SGT score')
        summary.skipped += 1
        continue
      }

      const { error: updateError } = await client
        .from('projects')
        .update({
          expected_yield: round(expectedYield, 6),
          sgt_score: round(sgtScore, 4),
          financial_apy: financialApy == null ? null : round(financialApy, 4),
          status: 'SGT Verified',
        })
        .eq('id', project.id)

      if (updateError) {
        throw new Error(`Supabase update failed: ${updateError.message}`)
      }

      logVerified({
        project,
        metrics: {
          nasaHistoricalAvg,
          nasaRecentAvg,
          expectedYield,
          actualYield,
          sgtScore,
          financialApy,
        },
      })
      summary.verified += 1
    } catch (err) {
      logError(project, err)
      summary.failed += 1
    }
  }

  console.log(
    `[SGT] ${new Date().toISOString()}  COMPLETE  verified=${summary.verified} skipped=${summary.skipped} failed=${summary.failed} total=${summary.total}`
  )

  return summary
}

function round(value, digits) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null
  }
  const f = 10 ** digits
  return Math.round(value * f) / f
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
