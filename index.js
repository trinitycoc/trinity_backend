import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'

// Import routes
import clansRouter from './routes/clans.js'
import sheetsRouter from './routes/sheets.js'
import cwlRouter from './routes/cwl.js'
import statsRouter from './routes/stats.js'
import imagesRouter from './routes/images.js'
import cacheRouter from './routes/cache.js'

// Import services
import { cacheService } from './services/cacheService.js'

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 3001

// Initialize Socket.IO for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Middleware
app.use(cors())
app.use(express.json())

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
  })
  next()
})

// Routes
app.use('/api/clans', clansRouter)
app.use('/api/sheets', sheetsRouter)
app.use('/api/cwl', cwlRouter)
app.use('/api/stats', statsRouter)
app.use('/api/images', imagesRouter)
app.use('/api/cache', cacheRouter)

// Health check endpoint
app.get('/api/health', (req, res) => {
  const cacheStats = cacheService.getStats()
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    cache: cacheStats,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Trinity Backend API',
    version: '2.0.0',
    endpoints: {
      health: '/api/health',
      clans: '/api/clans',
      sheets: '/api/sheets',
      cwl: '/api/cwl',
      stats: '/api/stats',
      images: '/api/images',
      cache: '/api/cache'
    }
  })
})

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id)

  socket.on('subscribe:clan', (clanTag) => {
    socket.join(`clan:${clanTag}`)
    console.log(`📡 Client ${socket.id} subscribed to clan ${clanTag}`)
  })

  socket.on('unsubscribe:clan', (clanTag) => {
    socket.leave(`clan:${clanTag}`)
    console.log(`📡 Client ${socket.id} unsubscribed from clan ${clanTag}`)
  })

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id)
  })
})

// Export io for use in other modules if needed
export { io }

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!', 
    message: err.message 
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log('🚀 Trinity Backend Server Started')
  console.log(`📍 Server running on port ${PORT}`)
  console.log(`🌐 API available at http://localhost:${PORT}`)
  console.log(`🔌 WebSocket available`)
  console.log(`💾 Cache system initialized`)
  console.log('✅ Ready to accept connections')
})

