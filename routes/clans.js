import express from 'express'
import { 
  getClanDetails, 
  getMultipleClans, 
  searchClans,
  getCurrentWar,
  getCWLGroup,
  getWarLog
} from '../services/clashOfClansService.js'

const router = express.Router()

// Get a single clan by tag
router.get('/:clanTag', async (req, res) => {
  try {
    const { clanTag } = req.params
    const clan = await getClanDetails(clanTag)
    res.json(clan)
  } catch (error) {
    console.error('Error fetching clan:', error)
    res.status(500).json({ 
      error: 'Failed to fetch clan data', 
      message: error.message 
    })
  }
})

// Get multiple clans by tags (sent as query params)
router.post('/multiple', async (req, res) => {
  try {
    const { clanTags } = req.body
    
    if (!clanTags || !Array.isArray(clanTags)) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        message: 'clanTags array is required' 
      })
    }

    const clans = await getMultipleClans(clanTags)
    res.json(clans)
  } catch (error) {
    console.error('Error fetching multiple clans:', error)
    res.status(500).json({ 
      error: 'Failed to fetch clans data', 
      message: error.message 
    })
  }
})

// Search clans by name
router.get('/search/:name', async (req, res) => {
  try {
    const { name } = req.params
    const { limit = 10 } = req.query
    
    const clans = await searchClans(name, { limit: parseInt(limit) })
    res.json(clans)
  } catch (error) {
    console.error('Error searching clans:', error)
    res.status(500).json({ 
      error: 'Failed to search clans', 
      message: error.message 
    })
  }
})

// Get current war for a clan
router.get('/:clanTag/war', async (req, res) => {
  try {
    const { clanTag } = req.params
    const war = await getCurrentWar(clanTag)
    res.json(war)
  } catch (error) {
    console.error('Error fetching war data:', error)
    res.status(500).json({ 
      error: 'Failed to fetch war data', 
      message: error.message 
    })
  }
})

// Get CWL group for a clan
router.get('/:clanTag/cwl', async (req, res) => {
  try {
    const { clanTag } = req.params
    const cwlGroup = await getCWLGroup(clanTag)
    res.json(cwlGroup)
  } catch (error) {
    console.error('Error fetching CWL data:', error)
    res.status(500).json({ 
      error: 'Failed to fetch CWL data', 
      message: error.message 
    })
  }
})

// Get war log for a clan
router.get('/:clanTag/warlog', async (req, res) => {
  try {
    const { clanTag } = req.params
    const warLog = await getWarLog(clanTag)
    res.json(warLog)
  } catch (error) {
    console.error('Error fetching war log:', error)
    res.status(500).json({ 
      error: 'Failed to fetch war log', 
      message: error.message 
    })
  }
})

export default router

