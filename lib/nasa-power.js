import { createClient } from '@supabase/supabase-js'

const NASA_POWER_BASE_URL =
  'https://power.larc.nasa.gov/api/temporal/daily/point'

const NASA_PARAMETERS = ['ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN', 'T2M']
const COMMUNITY = 'RE'
const NASA_FILL_VALUE = -999

const NREL_SOLAR_RESOURCE_URL =
  'https://developer.nrel.gov/api/solar/solar_resource/v1.json'

const DEFAULT_PERFORMANCE_RATIO = 0.77
const DEFAULT_CAPEX_PER_MW_USD = 1_000_000
const DAYS_PER_YEAR = 365

const NREL_BLEND_WEIGHT = 0.7
const NASA_BLEND_WEIGHT = 1 - NREL_BLEND_WEIGHT

const DATA_RESOLUTION_HIGH_FIDELITY = '4km - High Fidelity'

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
  const [recent, historical] = await Promise.all([
    fetchNasaRange({ latitude, longitude, ...rangeEndingYesterday(recentDays) }),
    fetchNasaRange({
      latitude,
      longitude,
      ...rangeEndingYesterday(historicalDays),
    }),
  ])
  return { recent, historical }
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
  const ghiMonthly = out?.avg_ghi?.monthly ?? {}

  const monthKey = [
    'jan','feb','mar','apr','may','jun',
    'jul','aug','sep','oct','nov','dec',
  ][new Date().getUTCMonth()]
  const ghiRecent = Number(ghiMonthly?.[monthKey])

  return {
    ghiAnnual: Number.isFinite(ghiAnnual) ? ghiAnnual : null,
    dniAnnual: Number.isFinite(dniAnnual) ? dniAnnual : null,
    latTiltAnnual: Number.isFinite(latTiltAnnual) ? latTiltAnnual : null,
    ghiRecentMonth: Number.isFinite(ghiRecent) ? ghiRecent : null,
    monthlyGhi: ghiMonthly,
    sources: json?.metadata?.sources ?? [],
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

export const modelExpectedYield = ({
  nasaHistoricalAvg,
  systemSizeMw,
  performanceRatio,
}) =>
  modelYield({ irradiance: nasaHistoricalAvg, systemSizeMw, performanceRatio })

export const modelActualYield = ({
  nasaRecentAvg,
  systemSizeMw,
  performanceRatio,
}) => modelYield({ irradiance: nasaRecentAvg, systemSizeMw, performanceRatio })

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

export function blendScores({
  nasaScore,
  nrelScore,
  nrelWeight = NREL_BLEND_WEIGHT,
}) {
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
      `NASA hist=${num(m.nasaHistorical, 3)} recent=${num(m.nasaRecent, 3)}  ` +
      `NREL ghi=${num(m.nrelGhiAnnual, 3)} thisMonth=${num(m.nrelGhiRecent, 3)}  ` +
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
  nrelWeight = NREL_BLEND_WEIGHT,
} = {}) {
  const client = supabase ?? createSupabaseClient()
  const keyLabel = nrelApiKey ? 'configured' : 'DEMO_KEY'

  console.log(
    `[SGT] ${new Date().toISOString()}  START     dual-oracle: NASA POWER + NREL NSRDB  recent=${recentDays}d  historical=${historicalDays}d  nrel_key=${keyLabel}  weight(NREL)=${nrelWeight}`
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

      const [{ recent, historical }, nrel] = await Promise.all([
        fetchNasaPower({
          latitude: project.latitude,
          longitude: project.longitude,
          recentDays,
          historicalDays,
        }),
        fetchNrelSolarResource({
          latitude: project.latitude,
          longitude: project.longitude,
          apiKey: nrelApiKey,
        }),
      ])

      const nasaHistorical = historical.allSkyIrradiance
      const nasaRecent = recent.allSkyIrradiance
      const nrelGhiAnnual = nrel.ghiAnnual
      const nrelGhiRecent = nrel.ghiRecentMonth ?? nrel.ghiAnnual

      if (nasaHistorical == null || nasaRecent == null) {
        logSkip(project, 'no NASA POWER ALLSKY data returned')
        summary.skipped += 1
        continue
      }
      if (nrelGhiAnnual == null) {
        logSkip(project, 'no NREL NSRDB GHI returned')
        summary.skipped += 1
        continue
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
        irradiance: nrelGhiAnnual,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })
      const nrelActualFromNasa = modelYield({
        irradiance: nasaRecent,
        systemSizeMw: project.systemSizeMw,
        performanceRatio: project.performanceRatio,
      })
      const sgtScoreNrel = calculateSgtScore(nrelActualFromNasa, nrelExpected)

      const sgtScoreBlended = blendScores({
        nasaScore: sgtScoreNasa,
        nrelScore: sgtScoreNrel,
        nrelWeight,
      })

      const financialApy =
        project.ppaRate != null && project.omAnnualCost != null
          ? modelFinancialApy({
              baselineIrradiance: nrelGhiAnnual,
              systemSizeMw: project.systemSizeMw,
              performanceRatio: project.performanceRatio,
              ppaRate: project.ppaRate,
              omAnnualCost: project.omAnnualCost,
              capexPerMwUsd,
            })
          : null

      const updatePayload = {
        expected_yield: round(nrelExpected, 6),
        sgt_score_nasa: round(sgtScoreNasa, 4),
        sgt_score_nrel: round(sgtScoreNrel, 4),
        sgt_score_blended: round(sgtScoreBlended, 4),
        sgt_score: round(sgtScoreNrel, 4),
        nrel_ghi_kwh_m2_day: round(nrelGhiAnnual, 4),
        financial_apy: financialApy == null ? null : round(financialApy, 4),
        data_resolution: DATA_RESOLUTION_HIGH_FIDELITY,
        status: 'SGT Verified',
      }

      const { error: updateError } = await client
        .from('projects')
        .update(updatePayload)
        .eq('id', project.id)

      if (updateError) {
        throw new Error(`Supabase update failed: ${updateError.message}`)
      }

      logVerified({
        project,
        m: {
          nasaHistorical,
          nasaRecent,
          nrelGhiAnnual,
          nrelGhiRecent,
          expectedYield: nrelExpected,
          actualYield: nrelActualFromNasa,
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

  const avg = (arr) => (arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : null)
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
