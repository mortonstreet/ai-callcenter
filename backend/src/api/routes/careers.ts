import { Router } from 'express'
import cors from 'cors'
import { sendJobApplicationEmail } from '@/clients/email.client'

const router = Router()

// Allow CORS for public careers endpoint
router.use(
  cors({
    origin: '*',
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
)

// POST /api/careers/apply - Submit a job application
router.post('/apply', async (req, res) => {
  try {
    const {
      jobId,
      jobTitle,
      firstName,
      lastName,
      email,
      phone,
      linkedin,
      coverLetter,
      resumeFileName,
      resumeBase64,
    } = req.body

    // Validate required fields
    if (!jobId || !jobTitle || !firstName || !lastName || !email || !linkedin) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      })
    }

    // Send the email notification to hiring team
    await sendJobApplicationEmail({
      jobId,
      jobTitle,
      firstName,
      lastName,
      email,
      phone: phone || 'Not provided',
      linkedin,
      coverLetter: coverLetter || 'No cover letter provided',
      resumeFileName,
      resumeBase64,
    })

    res.json({
      success: true,
      message: 'Application submitted successfully',
    })
  } catch (error) {
    console.error('❌ Error submitting job application:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
    })
  }
})

export default router
