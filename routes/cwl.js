import express from 'express'
import {
  getCWLClansFiltered,
  getClanEligibleMembers
} from '../services/cwlService.js'
import { fetchCWLClansDetailsFromSheet } from '../services/googleSheetsService.js'

const router = express.Router()

// Get filtered CWL clans (merged data with capacity logic applied)
router.get('/clans', async (req, res) => {
  try {
    const clans = await getCWLClansFiltered()
    res.json({
      count: clans.length,
      clans
    })
  } catch (error) {
    console.error('Error fetching filtered CWL clans:', error)
    res.status(500).json({
      error: 'Failed to fetch CWL clans',
      message: error.message
    })
  }
})

// Get eligible members for a specific clan
router.post('/clans/:clanTag/eligible', async (req, res) => {
  try {
    const { clanTag } = req.params
    const { sheetData } = req.body

    if (!sheetData) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'sheetData is required in request body'
      })
    }

    const eligibleInfo = await getClanEligibleMembers(clanTag, sheetData)
    res.json(eligibleInfo)
  } catch (error) {
    console.error('Error calculating eligible members:', error)
    res.status(500).json({
      error: 'Failed to calculate eligible members',
      message: error.message
    })
  }
})

export default router

