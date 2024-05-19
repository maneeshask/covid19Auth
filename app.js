const express = require('express')
const app = express()
app.use(express.json())
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const dbPath = path.join(__dirname, 'covid19IndiaPortal.db')

let db = null

const initializeDbAndStartServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('server started at localhost:3000')
    })
  } catch (e) {
    console.log('DB eeror: ${e.message}')
    process.exit(1)
  }
}
initializeDbAndStartServer()

app.post('/login/', async (request, response) => {
  let jwtToken
  const {username, password} = request.body
  const getUser = `SELECT * FROM user WHERE username='${username}';`
  const user = await db.get(getUser)
  if (user === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    const isPasswordCorrect = await bcrypt.compare(password, user.password)
    if (isPasswordCorrect === false) {
      response.status(400)
      response.send('Invalid password')
    } else {
      const payload = {username: username}
      const jwtToken = jwt.sign(payload, 'aammmmuu')
      response.send({jwtToken})
    }
  }
})

//token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImNocmlzdG9waGVyX3BoaWxsaXBzIiwiaWF0IjoxNzE1OTI5ODk0fQ.8QRFQbM15wCu1IcFeha1KWmLLuiRScvNIRoqHsSIU5U

const authenticateToken = (request, response, next) => {
  //console.log('AUTHENTICATING')
  let jwtToken
  const authHeader = request.headers['authorization']
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status(401)
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'aammmmuu', (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//api to get all states
app.get('/states/', authenticateToken, async (request, response) => {
  const getAllStatesQ = `SELECT * FROM state`
  const states = await db.all(getAllStatesQ)
  response.send(states)
})

//api to get state based on id
app.get('/states/:stateId/', authenticateToken, async (request, response) => {
  const {stateId} = request.params
  const getStateQ = `SELECT * FROM state WHERE state_id=${stateId};`
  const state = await db.get(getStateQ)
  response.send(state)
})

//api to create a new district in the district table
app.post('/districts/', authenticateToken, async (request, response) => {
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  const newDistrictQ = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
                      VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`
  const newDistrict = await db.run(newDistrictQ)
  response.send('District Successfully Added')
})

//api to return a district based on id
app.get(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const getDistrict = `SELECT * FROM district WHERE district_id=${districtId};`
    const district = await db.get(getDistrict)
    response.send(district)
  },
)

//api to delete a district from district table
app.delete(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const deleteDistrictQuery = `DELETE FROM district WHERE district_id=${districtId};`
    const deletedDistrict = await db.run(deleteDistrictQuery)
    response.send('District Removed')
  },
)

//api to update  the values of a district
app.put(
  '/districts/:districtId/',
  authenticateToken,
  async (request, response) => {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateDistrictQ = `UPDATE district 
                          SET district_name='${districtName}',
                          state_id=${stateId},
                          cases=${cases},
                          cured=${cured},
                          active=${active},
                          deaths=${deaths}
                          WHERE district_id=${districtId};`
    await db.run(updateDistrictQ)
    response.send('District Details Updated')
  },
)

//api to get the stats of a state
app.get(
  '/states/:stateId/stats/',
  authenticateToken,
  async (request, response) => {
    const {stateId} = request.params
    const getStatsQuery = `SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured ,
  SUM(active) AS totalActive, SUM(deaths) AS totalDeaths FROM district
   WHERE state_id=${stateId};`
    const statistics = await db.get(getStatsQuery)
    response.send(statistics)
  },
)

module.exports = app
