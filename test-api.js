// Test API dla nowych funkcjonalności
const express = require('express');
const app = express();

app.use(express.json());

// Mock endpoint do testowania walidacji
app.post('/api/projects/test', (req, res) => {
  console.log('Received data:', JSON.stringify(req.body, null, 2));
  
  const { offerType, name, clientName, clientContact } = req.body;
  
  // Podstawowa walidacja
  if (!name || name.length < 3) {
    return res.status(400).json({ 
      message: 'Nieprawidłowe dane projektu',
      errors: [{ 
        type: 'field', 
        value: name, 
        msg: 'Nazwa projektu musi mieć co najmniej 3 znaki', 
        path: 'name', 
        location: 'body' 
      }]
    });
  }
  
  if (!clientName || clientName.length < 2) {
    return res.status(400).json({ 
      message: 'Nieprawidłowe dane projektu',
      errors: [{ 
        type: 'field', 
        value: clientName, 
        msg: 'Nazwa klienta musi mieć co najmniej 2 znaki', 
        path: 'clientName', 
        location: 'body' 
      }]
    });
  }
  
  if (!clientContact || clientContact.length < 2) {
    return res.status(400).json({ 
      message: 'Nieprawidłowe dane projektu',
      errors: [{ 
        type: 'field', 
        value: clientContact, 
        msg: 'Osoba kontaktowa musi mieć co najmniej 2 znaki', 
        path: 'clientContact', 
        location: 'body' 
      }]
    });
  }
  
  // Walidacja warunkowa dla ofert finalnych
  if (offerType === 'final') {
    const { description, mainBenefit, projectManager } = req.body;
    
    if (!description || description.length < 3) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane projektu',
        errors: [{ 
          type: 'field', 
          value: description, 
          msg: 'Opis projektu musi mieć co najmniej 3 znaki', 
          path: 'description', 
          location: 'body' 
        }]
      });
    }
    
    if (!mainBenefit || mainBenefit.length < 3) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane projektu',
        errors: [{ 
          type: 'field', 
          value: mainBenefit, 
          msg: 'Główna korzyść musi mieć co najmniej 3 znaki', 
          path: 'mainBenefit', 
          location: 'body' 
        }]
      });
    }
    
    if (!projectManager || !projectManager.name || !projectManager.email || !projectManager.phone) {
      return res.status(400).json({ 
        message: 'Nieprawidłowe dane projektu',
        errors: [{ 
          type: 'field', 
          value: projectManager, 
          msg: 'Dane opiekuna projektu są wymagane dla ofert finalnych', 
          path: 'projectManager', 
          location: 'body' 
        }]
      });
    }
  }
  
  // Sukces
  res.status(201).json({
    message: 'Projekt został utworzony pomyślnie',
    project: {
      ...req.body,
      _id: 'mock-id-' + Date.now(),
      createdAt: new Date().toISOString()
    }
  });
});

app.listen(3001, () => {
  console.log('Test API server running on port 3001');
  console.log('Test with: curl -X POST http://localhost:3001/api/projects/test \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"offerType":"preliminary","name":"Test","clientName":"Test Client","clientContact":"John Doe"}\'');
});
