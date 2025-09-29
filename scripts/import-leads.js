const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const Lead = require('../models/Lead');
const Employee = require('../models/Employee');

// Function to clean phone number
function cleanPhoneNumber(phone) {
  if (!phone) return '';
  
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // If it starts with 48, keep it as is
  if (cleaned.startsWith('48')) {
    return '+' + cleaned;
  }
  
  // If it doesn't start with +, add +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

// Function to generate email from company name
function generateEmail(companyName) {
  if (!companyName) return 'brak@email.com';
  
  // Clean company name
  let email = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '') // Remove spaces
    .substring(0, 20); // Limit length
  
  // Add random number to make it unique
  const randomNum = Math.floor(Math.random() * 1000);
  return `${email}${randomNum}@example.com`;
}

// Function to parse CSV line
function parseCSVLine(line) {
  const fields = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }
  
  // Add the last field
  fields.push(currentField.trim());
  
  return fields;
}

async function importLeads() {
  try {
    // Connect to MongoDB
    console.log('🔌 Łączenie z bazą danych...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cold-call-manager', {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      bufferCommands: false,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log('✅ Połączono z MongoDB');

    // Find or create admin employee
    let adminEmployee = await Employee.findOne({ role: 'admin' });
    
    if (!adminEmployee) {
      console.log('👤 Tworzenie admina...');
      adminEmployee = new Employee({
        name: 'Admin System',
        email: 'admin@softsynergy.com',
        password: 'admin123', // You should hash this in production
        role: 'admin',
        isActive: true
      });
      await adminEmployee.save();
      console.log('✅ Admin utworzony');
    } else {
      console.log('✅ Admin już istnieje');
    }

    // Read CSV file
    const csvPath = path.join(__dirname, '..', 'Leady call center.csv');
    console.log('📖 Czytanie pliku CSV...');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error('Plik CSV nie istnieje: ' + csvPath);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    console.log(`📊 Znaleziono ${lines.length} linii w CSV`);

    // Parse and import leads
    const leadsToImport = [];
    let importedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const fields = parseCSVLine(line);
        
        if (fields.length < 4) {
          console.log(`⚠️ Pominięto linię ${i + 1}: za mało pól`);
          skippedCount++;
          continue;
        }

        const companyName = fields[0]?.replace(/"/g, '').trim();
        const city = fields[1]?.replace(/"/g, '').trim();
        const website = fields[2]?.replace(/"/g, '').trim();
        const phone = fields[3]?.replace(/"/g, '').trim();

        if (!companyName || !phone) {
          console.log(`⚠️ Pominięto linię ${i + 1}: brak nazwy firmy lub telefonu`);
          skippedCount++;
          continue;
        }

        // Clean phone number
        const cleanPhone = cleanPhoneNumber(phone);
        if (!cleanPhone) {
          console.log(`⚠️ Pominięto linię ${i + 1}: nieprawidłowy numer telefonu`);
          skippedCount++;
          continue;
        }

        // Generate email
        const email = generateEmail(companyName);

        // Create notes
        let notes = '';
        if (city) notes += `Miasto: ${city}`;
        if (website) notes += (notes ? ' | ' : '') + `Strona: ${website}`;

        // Check if lead already exists
        const existingLead = await Lead.findOne({ 
          $or: [
            { phone: cleanPhone },
            { name: companyName }
          ]
        });

        if (existingLead) {
          console.log(`⚠️ Pominięto linię ${i + 1}: lead już istnieje`);
          skippedCount++;
          continue;
        }

        const lead = new Lead({
          name: companyName,
          phone: cleanPhone,
          email: email,
          notes: notes,
          status: 'new',
          createdBy: adminEmployee._id
        });

        leadsToImport.push(lead);
        importedCount++;

        // Log progress every 50 leads
        if (importedCount % 50 === 0) {
          console.log(`📈 Przetworzono ${importedCount} leadów...`);
        }

      } catch (error) {
        console.log(`❌ Błąd w linii ${i + 1}: ${error.message}`);
        skippedCount++;
      }
    }

    // Bulk insert leads
    if (leadsToImport.length > 0) {
      console.log(`💾 Importowanie ${leadsToImport.length} leadów do bazy...`);
      await Lead.insertMany(leadsToImport);
      console.log(`✅ Pomyślnie zaimportowano ${leadsToImport.length} leadów!`);
    }

    console.log('\n📊 PODSUMOWANIE:');
    console.log(`✅ Zaimportowano: ${importedCount} leadów`);
    console.log(`⚠️ Pominięto: ${skippedCount} leadów`);
    console.log(`📋 Łącznie przetworzono: ${lines.length} linii`);

  } catch (error) {
    console.error('❌ Błąd podczas importu:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Połączenie z bazą zamknięte');
    process.exit(0);
  }
}

// Run the import
importLeads();
