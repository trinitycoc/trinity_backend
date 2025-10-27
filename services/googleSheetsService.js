import { cacheService, CACHE_TTL } from './cacheService.js'

// Google Sheets CSV URLs
const CWL_CLANS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTv9TiS1-uWKWghHNDyv1WNpZCPUew08SyzE4AwV5zksRHYdHOz_fcWi0FSKdHeL-Z0IpKNa-nMxEiY/pub?gid=1640581717&single=true&output=csv'
const TRINITY_CLANS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTv9TiS1-uWKWghHNDyv1WNpZCPUew08SyzE4AwV5zksRHYdHOz_fcWi0FSKdHeL-Z0IpKNa-nMxEiY/pub?gid=419279330&single=true&output=csv'

/**
 * Parse CSV text to array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  // Parse header line
  const headers = parseCSVLine(lines[0]).map(h => h.trim())
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)

    // Create object from row
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : ''
    })

    result.push(row)
  }

  return result
}

/**
 * Parse a single CSV line handling quotes and commas
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  // Add last field
  values.push(current)
  
  return values
}

/**
 * Fetch Trinity clans from Google Sheets
 * Returns array of clan tags that are "Active"
 */
export async function fetchTrinityClansFromSheet() {
  const cacheKey = 'sheets:trinity-clans'
  
  // Check cache first
  const cached = cacheService.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Add timestamp to prevent caching
    const url = `${TRINITY_CLANS_CSV_URL}&_=${Date.now()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets data')
    }

    const csvText = await response.text()
    const data = parseCSV(csvText)

    // Filter valid clans:
    // - Column B "Clan Tag" should exist and not be empty
    // - Status column should be exactly "Active"
    const validClans = data.filter(row => {
      const clanTag = row['Clan Tag']
      const status = row['Status'] || row['status']
      
      // Check if clan tag is valid
      if (!clanTag || clanTag.trim() === '' || clanTag.includes('//')) return false
      
      // Check if status is exactly "Active" (case-insensitive, exact match)
      if (!status || status.toString().trim().toLowerCase() !== 'active') return false
      
      return true
    })

    // Extract clan tags
    const clanTags = validClans.map(row => {
      let tag = row['Clan Tag'].trim()
      // Ensure tag starts with #
      if (!tag.startsWith('#')) {
        tag = '#' + tag
      }
      return tag
    })

    // Cache the result
    cacheService.set(cacheKey, clanTags, CACHE_TTL.GOOGLE_SHEETS)

    console.log(`📊 Fetched ${clanTags.length} Trinity clans from Google Sheets`)
    return clanTags

  } catch (error) {
    console.error('Error fetching Trinity clans from Google Sheets:', error)
    throw error
  }
}

/**
 * Fetch CWL clans from Google Sheets
 * Returns array of clan tags that are "In Use"
 */
export async function fetchCWLClansFromSheet() {
  const cacheKey = 'sheets:cwl-clans'
  
  // Check cache first
  const cached = cacheService.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Add timestamp to prevent caching
    const url = `${CWL_CLANS_CSV_URL}&_=${Date.now()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets data')
    }

    const csvText = await response.text()
    const data = parseCSV(csvText)

    // Filter valid clans:
    // - "In Use" should be a number (1, 2, 3, etc.)
    // - "Clan Tag" should exist and not be empty or #VALUE!
    const validClans = data.filter(row => {
      const inUse = row['In Use']
      const clanTag = row['Clan Tag']
      
      // Check if "In Use" is a valid number
      if (!inUse || isNaN(parseInt(inUse))) return false
      
      // Check if clan tag is valid
      if (!clanTag || clanTag.includes('#VALUE!') || clanTag.trim() === '') return false
      
      return true
    })

    // Extract clan tags
    const clanTags = validClans.map(row => {
      let tag = row['Clan Tag'].trim()
      // Ensure tag starts with #
      if (!tag.startsWith('#')) {
        tag = '#' + tag
      }
      return tag
    })

    // Cache the result
    cacheService.set(cacheKey, clanTags, CACHE_TTL.GOOGLE_SHEETS)

    console.log(`📊 Fetched ${clanTags.length} CWL clans from Google Sheets`)
    return clanTags

  } catch (error) {
    console.error('Error fetching CWL clans from Google Sheets:', error)
    throw error
  }
}

/**
 * Get full CWL clan details from Google Sheets
 * Returns array of objects with all clan information
 */
export async function fetchCWLClansDetailsFromSheet() {
  const cacheKey = 'sheets:cwl-clans-details'
  
  // Check cache first
  const cached = cacheService.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const url = `${CWL_CLANS_CSV_URL}&_=${Date.now()}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Failed to fetch Google Sheets data')
    }

    const csvText = await response.text()
    const data = parseCSV(csvText)

    // Filter and map valid clans
    const validClans = data
      .filter(row => {
        const inUse = row['In Use']
        const clanTag = row['Clan Tag']
        
        if (!inUse || isNaN(parseInt(inUse))) return false
        if (!clanTag || clanTag.includes('#VALUE!') || clanTag.trim() === '') return false
        
        return true
      })
      .map(row => {
        let tag = row['Clan Tag'].trim()
        if (!tag.startsWith('#')) {
          tag = '#' + tag
        }

        return {
          inUse: parseInt(row['In Use']),
          tag: tag,
          name: row['Clan Name'] || '',
          format: row['Format'] || '',
          members: row['Members'] || '',
          townHall: row['TownHall'] || '',
          weight: row['Weight'] || '',
          league: row['League'] || ''
        }
      })
      .sort((a, b) => a.inUse - b.inUse) // Sort by "In Use" number

    // Cache the result
    cacheService.set(cacheKey, validClans, CACHE_TTL.GOOGLE_SHEETS)

    console.log(`📊 Fetched ${validClans.length} CWL clans details from Google Sheets`)
    return validClans

  } catch (error) {
    console.error('Error fetching CWL clans details from Google Sheets:', error)
    throw error
  }
}

/**
 * Get all sheets data in one call (for efficiency)
 */
export async function fetchAllSheetsData() {
  const [trinityClans, cwlClans, cwlDetails] = await Promise.all([
    fetchTrinityClansFromSheet(),
    fetchCWLClansFromSheet(),
    fetchCWLClansDetailsFromSheet()
  ])

  return {
    trinityClans,
    cwlClans,
    cwlDetails
  }
}

