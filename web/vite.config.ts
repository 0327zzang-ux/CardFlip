import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 로컬 Wi-Fi 기기 간(스마트폰 ↔ PC) 명함 실시간 동기화 파일 경로
const sharedCardsFilePath = path.resolve(__dirname, '../CardFlip/data/shared_cards.json')
const appStateFilePath = path.resolve(__dirname, '../CardFlip/data/app_state.json')

function loadSharedCards(): Record<string, any> {
  try {
    if (fs.existsSync(sharedCardsFilePath)) {
      const content = fs.readFileSync(sharedCardsFilePath, 'utf-8')
      return JSON.parse(content || '{}')
    }
  } catch (err) {
    console.warn('Failed to load shared cards:', err)
  }
  return {}
}

function saveSharedCards(cards: Record<string, any>): void {
  try {
    const dir = path.dirname(sharedCardsFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(sharedCardsFilePath, JSON.stringify(cards, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Failed to save shared cards:', err)
  }
}

function loadAppState(): Record<string, any> | null {
  try {
    if (fs.existsSync(appStateFilePath)) {
      const content = fs.readFileSync(appStateFilePath, 'utf-8')
      return JSON.parse(content || '{}')
    }
  } catch (err) {
    console.warn('Failed to load app state:', err)
  }
  return null
}

function saveAppState(state: Record<string, any>): void {
  try {
    const dir = path.dirname(appStateFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(appStateFilePath, JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.warn('Failed to save app state:', err)
  }
}

/**
 * Vite 개발 서버용 로컬 명함 동기화 플러그인 (/api/cards & /api/sync)
 */
function localCardSyncPlugin() {
  const sharedCards = loadSharedCards()

  return {
    name: 'local-card-sync-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: () => void) => {
        const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
        
        // --- 1. 앱 전체 상태(내 명함첩, 교환 명함, 활성 인덱스) 영구 보존 API (/api/sync) ---
        if (parsedUrl.pathname === '/api/sync') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => { body += chunk })
            req.on('end', () => {
              try {
                const payload = JSON.parse(body)
                if (payload && typeof payload === 'object') {
                  const devId = parsedUrl.searchParams.get('dev') || payload.deviceId || 'dev_pc_host'
                  const root = loadAppState() || {}
                  if (!root.devices || typeof root.devices !== 'object') {
                    root.devices = {}
                  }
                  root.devices[devId] = {
                    ...payload,
                    deviceId: devId,
                    updatedAt: new Date().toISOString()
                  }
                  saveAppState(root)

                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ success: true, deviceId: devId }))
                  return
                }
              } catch (e) {
                // invalid json
              }
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid state data' }))
            })
            return
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            const devId = parsedUrl.searchParams.get('dev') || 'dev_pc_host'
            const savedRoot = loadAppState()
            if (savedRoot && savedRoot.devices && savedRoot.devices[devId]) {
              res.end(JSON.stringify(savedRoot.devices[devId]))
            } else {
              res.statusCode = 404
              res.end(JSON.stringify({ empty: true, deviceId: devId }))
            }
            return
          }
        }

        // --- 2. 개별 명함 실시간 동기화/조회 API (/api/cards) ---
        if (parsedUrl.pathname === '/api/cards') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          // 1. 새 명함 등록 (POST)
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk: any) => { body += chunk })
            req.on('end', () => {
              try {
                const card = JSON.parse(body)
                if (card && card.uniqueCode) {
                  const key = String(card.uniqueCode).replace(/^@/, '').toLowerCase().trim()
                  sharedCards[key] = card
                  saveSharedCards(sharedCards)

                  res.setHeader('Content-Type', 'application/json; charset=utf-8')
                  res.end(JSON.stringify({ success: true, code: key }))
                  return
                }
              } catch (e) {
                // invalid json
              }
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid card data' }))
            })
            return
          }

          // 2. 명함 조회 (GET ?code=@my_id)
          if (req.method === 'GET') {
            const codeParam = parsedUrl.searchParams.get('code')
            res.setHeader('Content-Type', 'application/json; charset=utf-8')

            if (codeParam) {
              const key = String(codeParam).replace(/^@/, '').toLowerCase().trim()
              const found = sharedCards[key]
              if (found) {
                res.end(JSON.stringify(found))
              } else {
                res.statusCode = 404
                res.end(JSON.stringify({ error: 'Card not found' }))
              }
              return
            }

            res.end(JSON.stringify(Object.values(sharedCards)))
            return
          }
        }

        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: true, // 로컬 네트워크(Wi-Fi) 내 휴대폰 접속 허용
    port: 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    localCardSyncPlugin(),
  ],
})
