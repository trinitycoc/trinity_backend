import express from 'express'
import {
  fetchTrinityClansFromSheet,
  fetchCWLClansFromSheet,
  fetchCWLClansDetailsFromSheet,
  fetchAllSheetsData
} from '../services/googleSheetsService.js'

const router = express.Router()

// Get Trinity clan tags
router.get('/trinity-clans', async (req, res) => {
  try {
    const clanTags = await fetchTrinityClansFromSheet()
    res.json({
      count: clanTags.length,
      clanTags
    })
  } catch (error) {
    console.error('Error fetching Trinity clans:', error)
    res.status(500).json({
      error: 'Failed to fetch Trinity clans',
      message: error.message
    })
  }
})

// Get CWL clan tags
router.get('/cwl-clans', async (req, res) => {
  try {
    const clanTags = await fetchCWLClansFromSheet()
    res.json({
      count: clanTags.length,
      clanTags
    })
  } catch (error) {
    console.error('Error fetching CWL clans:', error)
    res.status(500).json({
      error: 'Failed to fetch CWL clans',
      message: error.message
    })
  }
})

// Get CWL clan details from sheet
router.get('/cwl-clans-details', async (req, res) => {
  try {
    const clanDetails = await fetchCWLClansDetailsFromSheet()
    res.json({
      count: clanDetails.length,
      clans: clanDetails
    })
  } catch (error) {
    console.error('Error fetching CWL clan details:', error)
    res.status(500).json({
      error: 'Failed to fetch CWL clan details',
      message: error.message
    })
  }
})

// Get all sheets data in one call
router.get('/all', async (req, res) => {
  try {
    const allData = await fetchAllSheetsData()
    res.json(allData)
  } catch (error) {
    console.error('Error fetching all sheets data:', error)
    res.status(500).json({
      error: 'Failed to fetch sheets data',
      message: error.message
    })
  }
})

export default router

