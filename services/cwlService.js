import { getMultipleClans } from './clashOfClansService.js'
import { fetchCWLClansDetailsFromSheet } from './googleSheetsService.js'
import { cacheService, CACHE_TTL } from './cacheService.js'

/**
 * Calculate eligible members based on TH requirements
 * @param {Object} sheetData - Clan data from Google Sheets
 * @param {Array} memberList - List of clan members
 * @returns {number} Count of eligible members
 */
export const calculateEligibleMembers = (sheetData, memberList) => {
  if (!sheetData?.townHall || !memberList) return 0

  const thRequirement = sheetData.townHall.toLowerCase()
  
  // Parse TH levels from the requirement string
  const thNumbers = []
  const matches = thRequirement.match(/th\s*(\d+)/gi)
  
  if (matches) {
    matches.forEach(match => {
      const num = parseInt(match.replace(/th\s*/i, ''))
      if (!isNaN(num)) thNumbers.push(num)
    })
  }

  if (thNumbers.length === 0) return 0

  // Determine if it's "and below" requirement
  const isAndBelow = thRequirement.includes('and below') || thRequirement.includes('below')
  
  // Get min and max TH from requirements
  const minTH = Math.min(...thNumbers)
  const maxTH = Math.max(...thNumbers)

  // Count members matching the criteria
  let count = 0
  if (isAndBelow) {
    // Count members with TH <= maxTH
    count = memberList.filter(member => member.townHallLevel <= maxTH).length
  } else if (thNumbers.length === 1) {
    // Single TH requirement
    count = memberList.filter(member => member.townHallLevel === thNumbers[0]).length
  } else {
    // Multiple TH requirements (e.g., Th17, Th16, Th15)
    count = memberList.filter(member => 
      member.townHallLevel >= minTH && member.townHallLevel <= maxTH
    ).length
  }
  
  return count
}

/**
 * Filter clans by capacity logic:
 * - Group by Google Sheets league
 * - Sort by "In Use" value within each league (smallest first)
 * - "Serious" format: ALWAYS show (no capacity check)
 * - "Lazy" format: Only show next clan when previous "Lazy" clan is full
 * 
 * Example: Master 2 with In Use: 4 (Lazy), 5 (Lazy), 6 (Lazy)
 * - Show clan 4 (always show first)
 * - Show clan 5 only when clan 4 is full
 * - Show clan 6 only when clan 5 is full
 * 
 * @param {Array} clans - Array of clan objects with sheetData
 * @returns {Array} Filtered array of clans to display
 */
export const filterClansByCapacity = (clans) => {
  // Group clans by Google Sheets league
  const clansByLeague = {}
  
  clans.forEach(clan => {
    const leagueName = clan.sheetData?.league || clan.warLeague?.name || 'Unknown'
    if (!clansByLeague[leagueName]) {
      clansByLeague[leagueName] = []
    }
    clansByLeague[leagueName].push(clan)
  })

  // Process each league group
  const visibleClans = []
  
  Object.keys(clansByLeague).forEach(leagueName => {
    const leagueClans = clansByLeague[leagueName]
    
    // Sort by "In Use" value (ascending) - smallest In Use first
    leagueClans.sort((a, b) => {
      const aInUse = a.sheetData?.inUse || 999
      const bInUse = b.sheetData?.inUse || 999
      return aInUse - bInUse
    })
    
    // Track the last visible "Lazy" clan for capacity checking  
    let lastVisibleLazyClan = null
    
    // Process each clan in order of "In Use"
    for (let i = 0; i < leagueClans.length; i++) {
      const clan = leagueClans[i]
      const currentEligible = calculateEligibleMembers(clan.sheetData, clan.memberList)
      const currentRequired = parseInt(clan.sheetData?.members) || 0
      const currentFormat = (clan.sheetData?.format || 'Unknown').toLowerCase().trim()
      
      // RULE 1: "Serious" format clans are ALWAYS visible (no capacity check)
      if (currentFormat === 'serious') {
        visibleClans.push(clan)
        continue
      }
      
      // RULE 2: First "Lazy" clan in each league is always visible
      if (currentFormat === 'lazy' && lastVisibleLazyClan === null) {
        visibleClans.push(clan)
        lastVisibleLazyClan = clan
        continue
      }
      
      // RULE 3: For "Lazy" clans, check if previous "Lazy" clan is full
      if (currentFormat === 'lazy' && lastVisibleLazyClan !== null) {
        const prevEligible = calculateEligibleMembers(lastVisibleLazyClan.sheetData, lastVisibleLazyClan.memberList)
        const prevRequired = parseInt(lastVisibleLazyClan.sheetData?.members) || 0
        
        if (prevEligible >= prevRequired) {
          visibleClans.push(clan)
          lastVisibleLazyClan = clan // Update to this clan for next comparison
        }
        // If not full, clan is hidden (do nothing)
      } else if (currentFormat !== 'lazy' && currentFormat !== 'serious') {
        // Unknown format - show it by default
        visibleClans.push(clan)
      }
    }
  })

  // Sort final result by "In Use" value globally (smallest first)
  visibleClans.sort((a, b) => {
    const aInUse = a.sheetData?.inUse || 999
    const bInUse = b.sheetData?.inUse || 999
    return aInUse - bInUse
  })

  return visibleClans
}

/**
 * Get CWL clans with all data merged and filtered
 * @returns {Promise<Array>} Filtered CWL clans with merged data
 */
export const getCWLClansFiltered = async () => {
  const cacheKey = 'cwl:filtered-clans'
  
  // Check cache first
  const cached = cacheService.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    // Fetch clan details from Google Sheets
    const detailsFromSheet = await fetchCWLClansDetailsFromSheet()

    if (detailsFromSheet.length === 0) {
      throw new Error('No CWL clans found in Google Sheets')
    }

    // Extract clan tags for API call
    const clanTags = detailsFromSheet.map(detail => detail.tag)

    // Fetch all CWL clan data from CoC API
    const fetchedClans = await getMultipleClans(clanTags)
    
    if (fetchedClans.length === 0) {
      throw new Error('No clan data could be fetched from CoC API')
    }

    // Merge API data with Google Sheets details
    const mergedData = fetchedClans.map(clan => {
      const sheetInfo = detailsFromSheet.find(detail => detail.tag === clan.tag)
      
      // Calculate eligible members
      const eligibleMembers = calculateEligibleMembers(sheetInfo, clan.memberList)
      
      return {
        ...clan,
        sheetData: sheetInfo || null,
        eligibleMembers
      }
    })

    // Filter clans based on capacity logic
    const filteredClans = filterClansByCapacity(mergedData)
    
    // Cache the result
    cacheService.set(cacheKey, filteredClans, CACHE_TTL.CWL_FILTERED)
    
    return filteredClans
  } catch (error) {
    console.error('Error getting filtered CWL clans:', error)
    throw error
  }
}

/**
 * Get eligible members count for a specific clan
 * @param {string} clanTag - Clan tag
 * @param {Object} sheetData - Sheet data for the clan
 * @returns {Promise<Object>} Eligible members info
 */
export const getClanEligibleMembers = async (clanTag, sheetData) => {
  try {
    const { getClanDetails } = await import('./clashOfClansService.js')
    const clan = await getClanDetails(clanTag)
    
    const eligibleCount = calculateEligibleMembers(sheetData, clan.memberList)
    const required = parseInt(sheetData?.members) || 0
    
    return {
      clanTag: clan.tag,
      clanName: clan.name,
      eligibleMembers: eligibleCount,
      requiredMembers: required,
      isFull: eligibleCount >= required,
      remainingSlots: Math.max(0, required - eligibleCount)
    }
  } catch (error) {
    console.error(`Error calculating eligible members for ${clanTag}:`, error)
    throw error
  }
}

