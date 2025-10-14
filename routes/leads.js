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

    // Sprawdź czy istnieje aktywna rozmowa dla tego leada
    const Call = require('../models/Call');
    const activeCall = await Call.findOne({
      lead: lead._id,
      employee: req.user.id,
      status: 'in_progress'
    });

    res.json({
      success: true,
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        notes: lead.notes,
        retryCount: lead.retryCount,
        callHistory: lead.callHistory,
        status: lead.status,
        hasActiveCall: !!activeCall,
        activeCallId: activeCall ? activeCall._id : null
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
    const Call = require('../models/Call');
    
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

    // Sprawdź czy nie ma już aktywnej rozmowy
    const activeCall = await Call.findOne({
      lead: leadId,
      employee: req.user.id,
      status: 'in_progress'
    });

    if (activeCall) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rozmowa już trwa' 
      });
    }

    // Utwórz nową rozmowę w modelu Call
    const call = new Call({
      lead: leadId,
      employee: req.user.id,
      startTime: new Date(),
      status: 'in_progress'
    });

    await call.save();

    // Oznacz lead jako w trakcie rozmowy
    lead.status = 'calling';
    lead.lastCallAttempt = new Date();
    await lead.save();

    // Emituj event do frontendu (zabezpieczenie gdy brak io)
    if (req.io && typeof req.io.to === 'function') {
      req.io.to(`employee-${req.user.id}`).emit('call-started', {
      leadId: lead._id,
      callId: call._id,
      timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Rozmowa rozpoczęta',
      call: {
        id: call._id,
        startTime: call.startTime
      },
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
    const Call = require('../models/Call');
    
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

    // Znajdź aktywną rozmowę
    const activeCall = await Call.findOne({
      lead: leadId,
      employee: req.user.id,
      status: 'in_progress'
    });

    if (!activeCall) {
      return res.status(400).json({ 
        success: false, 
        message: 'Brak aktywnej rozmowy do zakończenia' 
      });
    }

    // Zakończ rozmowę w modelu Call
    activeCall.endTime = new Date();
    activeCall.duration = Math.floor((activeCall.endTime - activeCall.startTime) / 1000);
    activeCall.status = result;
    activeCall.notes = notes || '';
    activeCall.recordingUrl = recordingUrl || null;
    
    if (result === 'meeting_scheduled' && meetingDetails) {
      activeCall.meetingDetails = meetingDetails;
    }

    await activeCall.save();

    // Dodaj do historii rozmów leada
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

    // Emituj event do frontendu (zabezpieczenie gdy brak io)
    if (req.io && typeof req.io.to === 'function') {
      req.io.to(`employee-${req.user.id}`).emit('call-ended', {
      leadId: lead._id,
      callId: activeCall._id,
      result: result,
      timestamp: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Rozmowa zakończona',
      call: {
        id: activeCall._id,
        duration: activeCall.duration,
        status: activeCall.status
      },
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

// Zaplanuj następny telefon
router.post('/schedule-call', authenticateToken, async (req, res) => {
  try {
    const { leadId, scheduledDateTime, notes } = req.body;
    
    if (!leadId || !scheduledDateTime) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID leada i data/godzina są wymagane' 
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

    // Ustaw zaplanowaną datę i godzinę
    lead.nextCallTime = new Date(scheduledDateTime);
    lead.status = 'new'; // Wróć do puli, ale z zaplanowanym czasem
    
    // Dodaj notatkę o zaplanowaniu
    if (notes) {
      lead.notes = (lead.notes || '') + `\n[${new Date().toLocaleString()}] Zaplanowano telefon na: ${new Date(scheduledDateTime).toLocaleString()} - ${notes}`;
    }

    await lead.save();

    res.json({
      success: true,
      message: 'Telefon zaplanowany',
      lead: {
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        nextCallTime: lead.nextCallTime
      }
    });

  } catch (error) {
    console.error('Błąd planowania telefonu:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Wyszukaj leady po numerze telefonu
router.get('/search-phone', authenticateToken, async (req, res) => {
  try {
    const { phone } = req.query;
    
    if (!phone || phone.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wprowadź co najmniej 3 cyfry numeru telefonu' 
      });
    }

    // Wyszukaj leady zawierające podany numer telefonu
    const leads = await Lead.find({
      phone: { $regex: phone, $options: 'i' }
    }).populate('assignedTo', 'name email').sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      leads: leads.map(lead => ({
        id: lead._id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        assignedTo: lead.assignedTo,
        lastCallAttempt: lead.lastCallAttempt,
        nextCallTime: lead.nextCallTime,
        notes: lead.notes
      }))
    });

  } catch (error) {
    console.error('Błąd wyszukiwania:', error);
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
