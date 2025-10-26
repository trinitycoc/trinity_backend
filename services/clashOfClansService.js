import { Client } from 'clashofclans.js'

// Initialize the Clash of Clans API client
let client = null

/**
 * Initialize the CoC API client with email and password
 */
export const initializeCoCClient = async () => {
  const email = process.env.COC_EMAIL
  const password = process.env.COC_PASSWORD
  
  if (!email || !password) {
    throw new Error('COC_EMAIL and COC_PASSWORD must be set in .env file')
  }

  if (!client) {
    try {
      client = new Client({ 
        timeout: 10000 
      })
      
      // Login with email and password
      await client.login({ email, password })
    } catch (error) {
      console.error('❌ Failed to authenticate with Clash of Clans API:', error.message)
      client = null
      throw error
    }
  }

  return client
}

/**
 * Fetch clan details by clan tag
 * @param {string} clanTag - Clan tag (with or without #)
 * @returns {Promise<Object>} Clan data
 */
export const getClanDetails = async (clanTag) => {
  try {
    const cocClient = await initializeCoCClient()
    
    if (!cocClient) {
      throw new Error('CoC API client not initialized')
    }

    // Ensure clan tag has # prefix
    const formattedTag = clanTag.startsWith('#') ? clanTag : `#${clanTag}`
    
    const clan = await cocClient.getClan(formattedTag)
    
    // Find the leader from the member list
    const leader = clan.members?.find(member => member.role === 'leader')
    
    // Extract badge URLs - Badge class has small, medium, large properties
    const badgeUrls = {
      small: clan.badge?.small || '',
      medium: clan.badge?.medium || '',
      large: clan.badge?.large || '',
    }
    
    // Extract member list with relevant details
    const memberList = clan.members?.map(member => ({
      name: member.name,
      tag: member.tag,
      role: member.role,
      expLevel: member.expLevel || 0,
      townHallLevel: member.townHallLevel || 0,
      trophies: member.trophies || 0,
      clanRank: member.clanRank || 0,
      donations: member.donations || 0,
      donationsReceived: member.donationsReceived || 0,
    })) || []
    
    return {
      tag: clan.tag,
      name: clan.name,
      description: clan.description || 'No description available',
      type: clan.type, // open, inviteOnly, closed
      location: clan.location?.name || 'International',
      badgeUrls: badgeUrls,
      clanLevel: clan.level || 0,
      clanCapitalLevel: clan.clanCapital?.capitalHallLevel || 0,
      clanPoints: clan.points || 0,
      clanVersusPoints: clan.builderBasePoints || 0,
      warWins: clan.warWins || 0,
      warWinStreak: clan.warWinStreak || 0,
      warLeague: clan.warLeague?.name || 'Unranked',
      members: clan.memberCount || 0,
      memberList: memberList,
      leader: leader ? {
        name: leader.name,
        tag: leader.tag,
        trophies: leader.trophies || 0,
        townHallLevel: leader.townHallLevel || 0,
        expLevel: leader.expLevel || 0,
      } : null,
      requiredTrophies: clan.requiredTrophies || 0,
      requiredTownHallLevel: clan.requiredTownHallLevel || 1,
      warFrequency: clan.warFrequency || 'unknown',
      isWarLogPublic: clan.isWarLogPublic || false,
    }
  } catch (error) {
    console.error(`Error fetching clan ${clanTag}:`, error.message)
    throw error
  }
}

/**
 * Fetch multiple clans
 * @param {Array<string>} clanTags - Array of clan tags
 * @returns {Promise<Array<Object>>} Array of clan data
 */
export const getMultipleClans = async (clanTags) => {
  try {
    // Filter out invalid tags
    const validTags = clanTags.filter(tag => tag && tag !== '#YOUR_CLAN_TAG')
    
    if (validTags.length === 0) {
      console.warn('No valid clan tags provided')
      return []
    }

    const clanPromises = validTags.map(tag => 
      getClanDetails(tag).catch(error => {
        console.error(`Failed to fetch clan ${tag}:`, error.message)
        return null
      })
    )
    
    const clans = await Promise.all(clanPromises)
    
    // Remove null values (failed requests)
    return clans.filter(Boolean)
  } catch (error) {
    console.error('Error fetching multiple clans:', error)
    throw error
  }
}

/**
 * Search for clans by name
 * @param {string} name - Clan name to search
 * @param {Object} options - Search options
 * @returns {Promise<Array<Object>>} Array of matching clans
 */
export const searchClans = async (name, options = {}) => {
  try {
    const cocClient = await initializeCoCClient()
    
    if (!cocClient) {
      throw new Error('CoC API client not initialized')
    }

    const clans = await cocClient.searchClans({
      name,
      limit: options.limit || 10,
      ...options
    })
    
    return clans
  } catch (error) {
    console.error('Error searching clans:', error)
    throw error
  }
}

/**
 * Get current war information for a clan
 * @param {string} clanTag - Clan tag
 * @returns {Promise<Object>} Current war data
 */
export const getCurrentWar = async (clanTag) => {
  try {
    const cocClient = await initializeCoCClient()
    
    if (!cocClient) {
      throw new Error('CoC API client not initialized')
    }

    const formattedTag = clanTag.startsWith('#') ? clanTag : `#${clanTag}`
    const war = await cocClient.getClanWar(formattedTag)
    
    // If not in war, return minimal data
    if (war.state === 'notInWar') {
      return {
        state: 'notInWar'
      }
    }
    
    // Format the war data to ensure consistent structure
    // According to clashofclans.js WarClan class documentation:
    // - badge (not badgeUrls) with small, medium, large properties
    // - destruction (not destructionPercentage)
    // - attackCount (not attacks)
    // - level (not clanLevel)
    const formattedWar = {
      state: war.state || 'unknown',
      teamSize: war.teamSize || 0,
      preparationStartTime: war.preparationStartTime || null,
      startTime: war.startTime || null,
      endTime: war.endTime || null,
      clan: war.clan ? {
        tag: war.clan.tag || '',
        name: war.clan.name || 'Unknown',
        badgeUrls: {
          small: war.clan.badge?.small || '',
          medium: war.clan.badge?.medium || '',
          large: war.clan.badge?.large || '',
        },
        clanLevel: war.clan.level || 0,
        attacks: war.clan.attackCount || 0,
        stars: war.clan.stars || 0,
        destructionPercentage: war.clan.destruction || 0,
        members: war.clan.members || []
      } : null,
      opponent: war.opponent ? {
        tag: war.opponent.tag || '',
        name: war.opponent.name || 'Unknown',
        badgeUrls: {
          small: war.opponent.badge?.small || '',
          medium: war.opponent.badge?.medium || '',
          large: war.opponent.badge?.large || '',
        },
        clanLevel: war.opponent.level || 0,
        attacks: war.opponent.attackCount || 0,
        stars: war.opponent.stars || 0,
        destructionPercentage: war.opponent.destruction || 0,
        members: war.opponent.members || []
      } : null
    }
    
    return formattedWar
  } catch (error) {
    console.error(`Error fetching war data for clan ${clanTag}:`, error.message)
    throw error
  }
}

/**
 * Get clan war league group information
 * @param {string} clanTag - Clan tag
 * @returns {Promise<Object>} CWL group data
 */
export const getCWLGroup = async (clanTag) => {
  try {
    const cocClient = await initializeCoCClient()
    
    if (!cocClient) {
      throw new Error('CoC API client not initialized')
    }

    const formattedTag = clanTag.startsWith('#') ? clanTag : `#${clanTag}`
    const cwlGroup = await cocClient.getClanWarLeagueGroup(formattedTag)
    
    return cwlGroup
  } catch (error) {
    console.error(`Error fetching CWL data for clan ${clanTag}:`, error.message)
    throw error
  }
}

/**
 * Get clan war log
 * @param {string} clanTag - Clan tag
 * @returns {Promise<Array>} War log data
 */
export const getWarLog = async (clanTag) => {
  try {
    const cocClient = await initializeCoCClient()
    
    if (!cocClient) {
      throw new Error('CoC API client not initialized')
    }

    const formattedTag = clanTag.startsWith('#') ? clanTag : `#${clanTag}`
    const warLog = await cocClient.getClanWarLog(formattedTag)
    
    // Format war log according to WarLogClan structure
    // Properties: name, tag, badge, level, stars, destruction, expEarned, attackCount
    const formattedWarLog = (warLog || []).map(war => ({
      result: war.result || 'unknown',
      endTime: war.endTime || null,
      teamSize: war.teamSize || 0,
      clan: war.clan ? {
        name: war.clan.name || 'Unknown',
        tag: war.clan.tag || '',
        badgeUrls: {
          small: war.clan.badge?.small || '',
          medium: war.clan.badge?.medium || '',
          large: war.clan.badge?.large || '',
        },
        level: war.clan.level || 0,
        stars: war.clan.stars || 0,
        destruction: war.clan.destruction || 0,
        expEarned: war.clan.expEarned || 0,
        attackCount: war.clan.attackCount || 0
      } : null,
      opponent: war.opponent ? {
        name: war.opponent.name || 'Unknown',
        tag: war.opponent.tag || '',
        badgeUrls: {
          small: war.opponent.badge?.small || '',
          medium: war.opponent.badge?.medium || '',
          large: war.opponent.badge?.large || '',
        },
        level: war.opponent.level || 0,
        stars: war.opponent.stars || 0,
        destruction: war.opponent.destruction || 0,
        expEarned: war.opponent.expEarned,
        attackCount: war.opponent.attackCount
      } : null
    }))
    
    return formattedWarLog
  } catch (error) {
    console.error(`Error fetching war log for clan ${clanTag}:`, error.message)
    throw error
  }
}

/**
 * Get capital raid seasons/weekends
 * @param {string} clanTag - Clan tag
 * @returns {Promise<Array>} Capital raid seasons data
 */
export const getCapitalRaidSeasons = async (clanTag) => {
  try {
    const cocClient = await initializeCoCClient()
    
    if (!cocClient) {
      throw new Error('CoC API client not initialized')
    }

    const formattedTag = clanTag.startsWith('#') ? clanTag : `#${clanTag}`
    const raidSeasons = await cocClient.getClanCapitalRaidSeasons(formattedTag)
    
    return raidSeasons || []
  } catch (error) {
    console.error(`Error fetching capital raid seasons for clan ${clanTag}:`, error.message)
    throw error
  }
}

