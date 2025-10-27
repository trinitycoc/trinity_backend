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
 * - Group by league
 * - Sort by "In Use" value within each league
 * - Only show next clan when previous one is full (eligible >= allowed)
 * @param {Array} clans - Array of clan objects with sheetData
 * @returns {Array} Filtered array of clans to display
 */
export const filterClansByCapacity = (clans) => {
  // Group clans by league
  const clansByLeague = {}
  
  clans.forEach(clan => {
    const leagueName = clan.warLeague?.name || 'Unknown'
    if (!clansByLeague[leagueName]) {
      clansByLeague[leagueName] = []
    }
    clansByLeague[leagueName].push(clan)
  })

  // Process each league group
  const visibleClans = []
  
  Object.keys(clansByLeague).forEach(leagueName => {
    const leagueClans = clansByLeague[leagueName]
    
    // Sort by "In Use" value (ascending)
    leagueClans.sort((a, b) => {
      const aInUse = a.sheetData?.inUse || 999
      const bInUse = b.sheetData?.inUse || 999
      return aInUse - bInUse
    })
    
    // Track visible clans in this league and their formats
    const visibleFormatsInLeague = new Set()
    
    // Determine which clans to show
    for (let i = 0; i < leagueClans.length; i++) {
      const clan = leagueClans[i]
      const clanFormat = clan.sheetData?.format || 'Unknown'
      
      // Always show the first clan in each league
      if (i === 0) {
        visibleClans.push(clan)
        visibleFormatsInLeague.add(clanFormat)
        continue
      }

      // Check if this clan has a different format than all visible clans in this league
      const hasDifferentFormat = !visibleFormatsInLeague.has(clanFormat)
      
      if (hasDifferentFormat) {
        // Always show clans with different formats
        visibleClans.push(clan)
        visibleFormatsInLeague.add(clanFormat)
        continue
      }

      // For same format, check if the previous clan with same format is full
      // Find the last visible clan with the same format
      const previousSameFormatClan = leagueClans
        .slice(0, i)
        .reverse()
        .find(c => {
          const format = c.sheetData?.format || 'Unknown'
          return format === clanFormat && visibleClans.includes(c)
        })

      if (previousSameFormatClan) {
        const prevEligible = calculateEligibleMembers(previousSameFormatClan.sheetData, previousSameFormatClan.memberList)
        const prevRequired = parseInt(previousSameFormatClan.sheetData?.members) || 0

        // Show this clan only if the previous clan with same format is full
        if (prevEligible >= prevRequired) {
          visibleClans.push(clan)
        }
        // If not full, don't show but continue checking other formats
      }
    }
  })

  // Sort final result by "In Use" value globally
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

    console.log(`🎯 Filtered CWL clans: ${filteredClans.length}/${mergedData.length}`)
    
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

