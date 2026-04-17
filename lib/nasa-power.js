import { createClient } from '@supabase/supabase-js'

const NASA_POWER_BASE_URL =
  'https://power.larc.nasa.gov/api/temporal/daily/point'

const NASA_PARAMETERS = ['ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN', 'T2M']
const COMMUNITY = 'RE'

const NASA_FILL_VALUE = -999

function toApiDate(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

function getDateRange(days = 30) {
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

export async function fetchNasaPower({ latitude, longitude, days = 30 }) {
  const { start, end } = getDateRange(days)

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
  const paramBlock = json?.properties?.parameter ?? {}

  const allsky = cleanSeries(paramBlock.ALLSKY_SFC_SW_DWN)
  const clrsky = cleanSeries(paramBlock.CLRSKY_SFC_SW_DWN)
  const t2m = cleanSeries(paramBlock.T2M)

  return {
    range: { start, end },
    raw: paramBlock,
    averages: {
      allSkyIrradiance: mean(allsky),
      clearSkyIrradiance: mean(clrsky),
      temperatureC: mean(t2m),
    },
    counts: {
      allSky: allsky.length,
      clearSky: clrsky.length,
      t2m: t2m.length,
    },
  }
}

export function calculateSgtScore(nasaActual, expectedYield) {
  const actual = Number(nasaActual)
  const expected = Number(expectedYield)

  if (!Number.isFinite(actual) || !Number.isFinite(expected) || expected === 0) {
    return null
  }

  return (Math.abs(actual - expected) / expected) * 100
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

function formatScore(score) {
  return score === null || score === undefined
    ? 'n/a'
    : `${score.toFixed(2)}%`
}

function logVerified({ project, score, nasaActual, expectedYield }) {
  const ts = new Date().toISOString()
  const name = project.name ?? project.id
  console.log(
    `[SGT] ${ts}  VERIFIED  ${name}  |  NASA=${nasaActual.toFixed(
      2
    )} kWh/m^2/day  Expected=${expectedYield}  Variance=${formatScore(score)}`
  )
}

function logSkip(project, reason) {
  const ts = new Date().toISOString()
  const name = project.name ?? project.id
  console.warn(`[SGT] ${ts}  SKIP      ${name}  |  ${reason}`)
}

function logError(project, err) {
  const ts = new Date().toISOString()
  const name = project?.name ?? project?.id ?? 'unknown'
  console.error(`[SGT] ${ts}  ERROR     ${name}  |  ${err.message}`)
}

export async function runSgtEngine({ supabase, days = 30 } = {}) {
  const client = supabase ?? createSupabaseClient()

  console.log(
    `[SGT] ${new Date().toISOString()}  START     Running SGT engine (last ${days} days)`
  )

  const { data: projects, error } = await client
    .from('projects')
    .select('*')

  if (error) {
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  const summary = {
    total: projects?.length ?? 0,
    verified: 0,
    skipped: 0,
    failed: 0,
  }

  for (const project of projects ?? []) {
    try {
      const latitude = project.latitude ?? project.lat
      const longitude = project.longitude ?? project.lng
      const expectedYield = project.expected_yield ?? project.expectedYield

      if (latitude == null || longitude == null) {
        logSkip(project, 'missing latitude/longitude')
        summary.skipped += 1
        continue
      }

      if (expectedYield == null) {
        logSkip(project, 'missing expected_yield')
        summary.skipped += 1
        continue
      }

      const nasa = await fetchNasaPower({
        latitude: Number(latitude),
        longitude: Number(longitude),
        days,
      })

      const nasaActual = nasa.averages.allSkyIrradiance
      if (nasaActual == null) {
        logSkip(project, 'no ALLSKY_SFC_SW_DWN data returned from NASA POWER')
        summary.skipped += 1
        continue
      }

      const sgtScore = calculateSgtScore(nasaActual, Number(expectedYield))
      if (sgtScore == null) {
        logSkip(project, 'unable to compute SGT score (invalid expected_yield)')
        summary.skipped += 1
        continue
      }

      const { error: updateError } = await client
        .from('projects')
        .update({
          sgt_score: sgtScore,
          status: 'SGT Verified',
        })
        .eq('id', project.id)

      if (updateError) {
        throw new Error(`Supabase update failed: ${updateError.message}`)
      }

      logVerified({
        project,
        score: sgtScore,
        nasaActual,
        expectedYield: Number(expectedYield),
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

const isDirectInvocation =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('nasa-power.js')

if (isDirectInvocation) {
  runSgtEngine().catch((err) => {
    console.error(`[SGT] ${new Date().toISOString()}  FATAL     ${err.message}`)
    process.exit(1)
  })
}
