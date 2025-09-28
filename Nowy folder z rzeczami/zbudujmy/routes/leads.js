const express = require('express');
const Lead = require('../models/Lead');
const LeadDistributionService = require('../services/LeadDistributionService');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Pobierz leady dla pracownika
router.get('/my-lead', authenticateToken, async (req, res) => {
  try {
    const lead = await LeadDistributionService.getLeadForEmployee(req.user.id);
    
    if (!lead) {
      return res.json({
        success: true,
        message: 'Brak dostępnych leadów',
        lead: null
      });
    }

    res.json({
      success: true,
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        notes: lead.notes,
        retryCount: lead.retryCount,
        callHistory: lead.callHistory
      }
    });

  } catch (error) {
    console.error('Błąd pobierania leada:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Rozpocznij rozmowę
router.post('/start-call', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID leada jest wymagane' 
      });
    }

    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead nie znaleziony' 
      });
    }

    if (lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Nie masz uprawnień do tego leada' 
      });
    }

    // Oznacz lead jako w trakcie rozmowy
    lead.status = 'calling';
    lead.lastCallAttempt = new Date();
    await lead.save();

    // Emituj event do frontendu
    req.io.to(`employee-${req.user.id}`).emit('call-started', {
      leadId: lead._id,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Rozmowa rozpoczęta',
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        notes: lead.notes
      }
    });

  } catch (error) {
    console.error('Błąd rozpoczęcia rozmowy:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Zakończ rozmowę
router.post('/end-call', authenticateToken, async (req, res) => {
  try {
    const { leadId, result, notes, recordingUrl, meetingDetails } = req.body;
    
    if (!leadId || !result) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID leada i wynik rozmowy są wymagane' 
      });
    }

    const lead = await Lead.findById(leadId);
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead nie znaleziony' 
      });
    }

    if (lead.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Nie masz uprawnień do tego leada' 
      });
    }

    // Dodaj do historii rozmów
    lead.callHistory.push({
      employee: req.user.id,
      timestamp: new Date(),
      result: result,
      notes: notes || '',
      recordingUrl: recordingUrl || null
    });

    // Zaktualizuj szczegóły spotkania jeśli umówione
    if (result === 'meeting_scheduled' && meetingDetails) {
      lead.meetingDetails = meetingDetails;
    }

    await lead.save();

    // Zwolnij pracownika i zaktualizuj status leada
    const result_data = await LeadDistributionService.releaseEmployee(req.user.id, leadId, result);

    // Emituj event do frontendu
    req.io.to(`employee-${req.user.id}`).emit('call-ended', {
      leadId: lead._id,
      result: result,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Rozmowa zakończona',
      lead: result_data.lead,
      nextLead: await LeadDistributionService.getLeadForEmployee(req.user.id)
    });

  } catch (error) {
    console.error('Błąd zakończenia rozmowy:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Pobierz historię rozmów dla leada
router.get('/:leadId/history', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const lead = await Lead.findById(leadId).populate('callHistory.employee', 'name email');
    
    if (!lead) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead nie znaleziony' 
      });
    }

    res.json({
      success: true,
      history: lead.callHistory
    });

  } catch (error) {
    console.error('Błąd pobierania historii:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
