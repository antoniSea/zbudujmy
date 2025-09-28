const Lead = require('../models/Lead');
const Employee = require('../models/Employee');

class LeadDistributionService {
  
  /**
   * Przypisuje lead do dostępnego pracownika
   */
  static async assignLeadToEmployee(leadId, employeeId) {
    try {
      const lead = await Lead.findById(leadId);
      const employee = await Employee.findById(employeeId);
      
      if (!lead || !employee) {
        throw new Error('Lead lub Employee nie znaleziony');
      }
      
      if (!employee.isAvailable) {
        throw new Error('Pracownik nie jest dostępny');
      }
      
      // Oznacz lead jako przypisany
      lead.status = 'assigned';
      lead.assignedTo = employeeId;
      lead.lastCallAttempt = new Date();
      // Gdy lead jest przypisywany, zeruj ewentualny przyszły czas następnego telefonu
      lead.nextCallTime = null;
      
      // Oznacz pracownika jako zajętego i przypisz mu lead
      employee.isAvailable = false;
      employee.currentLead = leadId;
      
      await Promise.all([lead.save(), employee.save()]);
      
      return { lead, employee };
    } catch (error) {
      throw new Error(`Błąd przypisywania leada: ${error.message}`);
    }
  }
  
  /**
   * Znajduje następnego dostępnego pracownika
   */
  static async findAvailableEmployee() {
    try {
      const availableEmployee = await Employee.findOne({
        isActive: true,
        isAvailable: true
      }).sort({ lastActivity: 1 }); // Najmniej aktywny pracownik
      
      return availableEmployee;
    } catch (error) {
      throw new Error(`Błąd znajdowania dostępnego pracownika: ${error.message}`);
    }
  }
  
  /**
   * Automatycznie dystrybuuje leady między pracownikami
   */
  static async distributeLeads() {
    try {
      // Znajdź leady do przypisania
      const now = new Date();
      const unassignedLeads = await Lead.find({
        status: 'new',
        $or: [
          { nextCallTime: { $exists: false } },
          { nextCallTime: null },
          { nextCallTime: { $lte: now } }
        ]
      }).sort({ createdAt: 1 });
      
      const results = [];
      
      for (const lead of unassignedLeads) {
        const availableEmployee = await this.findAvailableEmployee();
        
        if (availableEmployee) {
          const result = await this.assignLeadToEmployee(lead._id, availableEmployee._id);
          results.push({
            leadId: lead._id,
            employeeId: availableEmployee._id,
            success: true
          });
        } else {
          results.push({
            leadId: lead._id,
            success: false,
            reason: 'Brak dostępnych pracowników'
          });
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Błąd dystrybucji leadów: ${error.message}`);
    }
  }
  
  /**
   * Zwraca lead dla konkretnego pracownika
   */
  static async getLeadForEmployee(employeeId) {
    try {
      const employee = await Employee.findById(employeeId).populate('currentLead');
      
      if (!employee) {
        throw new Error('Pracownik nie znaleziony');
      }
      
      if (employee.currentLead) {
        return employee.currentLead;
      }
      
      // Jeśli pracownik nie ma leada, spróbuj znaleźć nowy, który nie ma przyszłego timeoutu
      const now = new Date();
      const newLead = await Lead.findOne({
        status: 'new',
        $or: [
          { nextCallTime: { $exists: false } },
          { nextCallTime: null },
          { nextCallTime: { $lte: now } }
        ]
      }).sort({ createdAt: 1 });
      
      if (newLead) {
        await this.assignLeadToEmployee(newLead._id, employeeId);
        return newLead;
      }
      
      return null;
    } catch (error) {
      throw new Error(`Błąd pobierania leada: ${error.message}`);
    }
  }
  
  /**
   * Zwalnia pracownika po zakończeniu rozmowy
   */
  static async releaseEmployee(employeeId, leadId, callResult) {
    try {
      const employee = await Employee.findById(employeeId);
      const lead = await Lead.findById(leadId);
      
      if (!employee || !lead) {
        throw new Error('Employee lub Lead nie znaleziony');
      }
      
      // Aktualizuj status leada
      if (callResult === 'no_answer') {
        lead.retryCount += 1;
        lead.status = 'no_answer';
        
        // Jeśli to trzecia próba, oznacz jako niezainteresowany
        if (lead.retryCount >= 3) {
          lead.status = 'not_interested';
          lead.nextCallTime = null;
        } else {
          // Zaplanuj następną próbę za 4 godziny i wróć do puli dopiero po czasie
          const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
          lead.nextCallTime = new Date(Date.now() + FOUR_HOURS_MS);
          lead.status = 'new'; // Wróć do puli, lecz filtr czasu blokuje wcześniejsze przypisanie
        }
      } else if (callResult === 'not_interested') {
        lead.status = 'not_interested';
        lead.nextCallTime = null;
      } else if (callResult === 'meeting_scheduled') {
        lead.status = 'meeting_scheduled';
        lead.nextCallTime = null;
      } else if (callResult === 'call_recorded') {
        lead.status = 'completed';
        lead.nextCallTime = null;
      }
      
      // Zwolnij pracownika
      employee.isAvailable = true;
      employee.currentLead = null;
      
      await Promise.all([lead.save(), employee.save()]);
      
      return { lead, employee };
    } catch (error) {
      throw new Error(`Błąd zwalniania pracownika: ${error.message}`);
    }
  }
  
  /**
   * Pobiera statystyki dystrybucji
   */
  static async getDistributionStats() {
    try {
      const stats = await Lead.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
      
      const employeeStats = await Employee.aggregate([
        {
          $group: {
            _id: '$isAvailable',
            count: { $sum: 1 }
          }
        }
      ]);
      
      return {
        leadStats: stats,
        employeeStats: employeeStats
      };
    } catch (error) {
      throw new Error(`Błąd pobierania statystyk: ${error.message}`);
    }
  }
}

module.exports = LeadDistributionService;
