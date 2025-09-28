const express = require('express');
const Call = require('../models/Call');
const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const { authenticateToken } = require('./auth');
const router = express.Router();

// Rozpocznij nową rozmowę
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { leadId } = req.body;
    
    if (!leadId) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID leada jest wymagane' 
      });
    }

    const lead = await Lead.findById(leadId);
    const employee = await Employee.findById(req.user.id);
    
    if (!lead || !employee) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lead lub pracownik nie znaleziony' 
      });
    }

    // Sprawdź czy pracownik ma dostęp do tego leada
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

    // Utwórz nową rozmowę
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

    res.json({
      success: true,
      message: 'Rozmowa rozpoczęta',
      call: {
        id: call._id,
        startTime: call.startTime,
        lead: {
          id: lead._id,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          notes: lead.notes
        }
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
router.post('/end', authenticateToken, async (req, res) => {
  try {
    const { callId, status, notes, recordingUrl, meetingDetails, callQuality } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status rozmowy jest wymagany' 
      });
    }

    let call;
    
    // Jeśli nie ma callId, znajdź aktywną rozmowę dla tego pracownika
    if (!callId) {
      call = await Call.findOne({
        employee: req.user.id,
        status: 'in_progress'
      });
      
      if (!call) {
        return res.status(404).json({ 
          success: false, 
          message: 'Brak aktywnej rozmowy' 
        });
      }
    } else {
      call = await Call.findById(callId);
    }
    
    if (!call) {
      return res.status(404).json({ 
        success: false, 
        message: 'Rozmowa nie znaleziona' 
      });
    }

    if (call.employee.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Nie masz uprawnień do tej rozmowy' 
      });
    }

    if (call.status !== 'in_progress') {
      return res.status(400).json({ 
        success: false, 
        message: 'Rozmowa już została zakończona' 
      });
    }

    // Zakończ rozmowę
    await call.endCall(status, notes, meetingDetails);
    
    if (recordingUrl) {
      call.recordingUrl = recordingUrl;
    }
    
    if (callQuality) {
      call.callQuality = callQuality;
    }
    
    await call.save();

    // Aktualizuj statystyki pracownika
    const employee = await Employee.findById(req.user.id);
    await employee.updateStats(status);

    // Pobierz lead i zaktualizuj jego status
    const lead = await Lead.findById(call.lead);
    
    if (status === 'no_answer') {
      lead.retryCount += 1;
      lead.status = 'no_answer';
      
      // Jeśli to trzecia próba, oznacz jako niezainteresowany
      if (lead.retryCount >= 3) {
        lead.status = 'not_interested';
      } else {
        // Zaplanuj następną próbę za 2 godziny
        lead.nextCallTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
        lead.status = 'new'; // Wróć do puli
      }
    } else if (status === 'not_interested') {
      lead.status = 'not_interested';
    } else if (status === 'meeting_scheduled') {
      lead.status = 'meeting_scheduled';
      if (meetingDetails) {
        lead.meetingDetails = meetingDetails;
      }
    } else if (status === 'completed') {
      lead.status = 'completed';
    }

    // Dodaj do historii rozmów leada
    lead.callHistory.push({
      employee: req.user.id,
      timestamp: new Date(),
      result: status,
      notes: notes || '',
      recordingUrl: recordingUrl || null
    });

    await lead.save();

    // Zwolnij pracownika
    employee.isAvailable = true;
    employee.currentLead = null;
    await employee.save();

    res.json({
      success: true,
      message: 'Rozmowa zakończona',
      call: {
        id: call._id,
        duration: call.duration,
        status: call.status,
        endTime: call.endTime
      }
    });

  } catch (error) {
    console.error('Błąd zakończenia rozmowy:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Pobierz historię rozmów pracownika
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const calls = await Call.find({ employee: req.user.id })
      .populate('lead', 'name phone email')
      .sort({ startTime: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Call.countDocuments({ employee: req.user.id });

    res.json({
      success: true,
      calls: calls.map(call => ({
        id: call._id,
        lead: call.lead,
        startTime: call.startTime,
        endTime: call.endTime,
        duration: call.duration,
        status: call.status,
        notes: call.notes,
        recordingUrl: call.recordingUrl,
        callQuality: call.callQuality
      })),
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Błąd pobierania historii rozmów:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Pobierz aktywną rozmowę
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const activeCall = await Call.findOne({
      employee: req.user.id,
      status: 'in_progress'
    }).populate('lead', 'name phone email notes');

    if (!activeCall) {
      return res.json({
        success: true,
        message: 'Brak aktywnej rozmowy',
        call: null
      });
    }

    res.json({
      success: true,
      call: {
        id: activeCall._id,
        lead: activeCall.lead,
        startTime: activeCall.startTime,
        duration: Math.floor((new Date() - activeCall.startTime) / 1000)
      }
    });

  } catch (error) {
    console.error('Błąd pobierania aktywnej rozmowy:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;
