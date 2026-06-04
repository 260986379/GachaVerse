const router = require('express').Router()
const { getVideos } = require('../controllers/concertHallController')

router.get('/videos', getVideos)

module.exports = router
