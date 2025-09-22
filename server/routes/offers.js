const express = require('express');
const jsPDF = require('jspdf');
const fs = require('fs').promises;
const path = require('path');
const handlebars = require('handlebars');
const Project = require('../models/Project');
const Portfolio = require('../models/Portfolio');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Helper function to format date
handlebars.registerHelper('formatDate', function(date) {
  return new Date(date).toLocaleDateString('pl-PL');
});

// Helper function to format currency
handlebars.registerHelper('formatCurrency', function(amount) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN'
  }).format(amount);
});

// Helper function to add numbers
handlebars.registerHelper('add', function(a, b) {
  return a + b;
});

// Helper function to check equality
handlebars.registerHelper('eq', function(a, b) {
  return a === b;
});

// Generate offer HTML
router.post('/generate/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('createdBy', 'firstName lastName email');
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    // Get portfolio items for the offer
    const portfolio = await Portfolio.find({ isActive: true })
      .sort({ order: 1 })
      .limit(2);

    // Read the HTML template
    const templatePath = path.join(__dirname, '../templates/offer-template.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Compile template with Handlebars
    const template = handlebars.compile(templateContent);
    
    // Configure Handlebars to allow prototype properties
    handlebars.allowProtoPropertiesByDefault = true;
    
    // Create template with runtime options
    const templateWithOptions = handlebars.compile(templateContent, {
      allowProtoPropertiesByDefault: true
    });

    // Prepare data for template
    const templateData = {
      // Project details
      projectName: project.name,
      clientName: project.clientName,
      clientContact: project.clientContact,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      description: project.description,
      mainBenefit: project.mainBenefit,
      // Offer details
      offerDate: new Date().toLocaleDateString('pl-PL'),
      offerNumber: project.offerNumber || `SS/${new Date().getFullYear()}/${(new Date().getMonth()+1).toString().padStart(2, '0')}/${project._id.toString().slice(-4)}`,
      offerType: project.offerType || 'final',
      priceRange: project.priceRange,
      // Project manager - zawsze Jakub Czajka
      projectManager: {
        name: "Jakub Czajka",
        position: "Senior Project Manager",
        email: "jakub.czajka@soft-synergy.com",
        phone: "+48 793 868 886",
        avatar: "/generated-offers/jakub czajka.jpeg",
        description: "Nazywam się Jakub Czajka i pełnię rolę menedżera projektów w Soft Synergy. Specjalizuję się w koordynowaniu zespołów oraz zarządzaniu realizacją nowoczesnych projektów IT. Dbam o sprawną komunikację, terminowość oraz najwyższą jakość dostarczanych rozwiązań. Moim celem jest zapewnienie klientom profesjonalnej obsługi i skutecznej realizacji ich celów biznesowych."
      },
      // Modules
      modules: project.modules && project.modules.length > 0 ? 
        project.modules.map(module => ({
          name: module.name,
          description: module.description,
          color: module.color || 'blue'
        })) : 
        [{ name: 'Moduł przykładowy', description: 'Opis przykładowego modułu', color: 'blue' }],
      // Timeline
      timeline: project.timeline,
      // Pricing
      pricing: project.pricing,
      // Portfolio items
      portfolio: portfolio.map(item => ({
        _id: item._id.toString(),
        title: item.title,
        description: item.description,
        image: item.image,
        category: item.category,
        technologies: item.technologies,
        client: item.client,
        duration: item.duration,
        results: item.results,
        isActive: item.isActive,
        order: item.order
      })),
      // Custom reservations
      customReservations: project.customReservations || [],
      // Custom payment terms
      customPaymentTerms: project.customPaymentTerms || '10% zaliczki po podpisaniu umowy.\n90% po odbiorze końcowym projektu.',
      // Company details
      companyEmail: 'jakub.czajka@soft-synergy.com',
      companyPhone: '+48 793 868 886',
      companyNIP: '123-456-78-90'
    };

    // Generate HTML
    const html = templateWithOptions(templateData);

    // Create generated-offers directory if it doesn't exist
    const outputDir = path.join(__dirname, '../generated-offers');
    await fs.mkdir(outputDir, { recursive: true });

    // Clean up old offer files for this project
    try {
      const existingFiles = await fs.readdir(outputDir);
      const projectFiles = existingFiles.filter(file => file.startsWith(`offer-${project._id}-`));
      
      // Delete old files for this project
      for (const oldFile of projectFiles) {
        const oldFilePath = path.join(outputDir, oldFile);
        await fs.unlink(oldFilePath);
        console.log(`Deleted old offer file: ${oldFile}`);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up old offer files:', cleanupError);
      // Continue with generation even if cleanup fails
    }

    // Save HTML file
    const fileName = `offer-${project._id}-${Date.now()}.html`;
    const filePath = path.join(outputDir, fileName);
    await fs.writeFile(filePath, html);

    // Try to generate PDF, but don't fail if it doesn't work
    let pdfFileName = null;
    let pdfUrl = null;
    
    try {
      const { jsPDF } = require('jspdf');
      const doc = new jsPDF();
      
      // Convert HTML to text for simple PDF generation
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Split text into lines that fit the page
      const splitText = doc.splitTextToSize(textContent, 180);
      
      doc.setFontSize(12);
      doc.text(splitText, 15, 20);
      
      const pdfBuffer = doc.output('arraybuffer');

      // Clean up old PDF files for this project
      try {
        const existingFiles = await fs.readdir(outputDir);
        const projectPdfFiles = existingFiles.filter(file => file.startsWith(`offer-${project._id}-`) && file.endsWith('.pdf'));
        
        // Delete old PDF files for this project
        for (const oldPdfFile of projectPdfFiles) {
          const oldPdfFilePath = path.join(outputDir, oldPdfFile);
          await fs.unlink(oldPdfFilePath);
          console.log(`Deleted old PDF file: ${oldPdfFile}`);
        }
      } catch (pdfCleanupError) {
        console.error('Error cleaning up old PDF files:', pdfCleanupError);
        // Continue with PDF generation even if cleanup fails
      }

      // Save PDF file
      pdfFileName = `offer-${project._id}-${Date.now()}.pdf`;
      const pdfPath = path.join(outputDir, pdfFileName);
      await fs.writeFile(pdfPath, pdfBuffer);
      pdfUrl = `/generated-offers/${pdfFileName}`;
      
      console.log('PDF generated successfully');
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      console.log('Continuing with HTML generation only');
    }

    // Update project with generated offer URL
    project.generatedOfferUrl = `/generated-offers/${fileName}`;
    await project.save();

    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      message: pdfUrl ? 'Oferta została wygenerowana pomyślnie' : 'Oferta HTML została wygenerowana pomyślnie (PDF nie udało się wygenerować)',
      htmlUrl: `/generated-offers/${fileName}`,
      professionalUrl: `/oferta-finalna/${project.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      pdfUrl: pdfUrl,
      project: project
    });

  } catch (error) {
    console.error('Generate offer error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas generowania oferty' });
  }
});

// Get offer preview (HTML)
router.get('/preview/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('createdBy', 'firstName lastName email');
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    // Get portfolio items
    const portfolio = await Portfolio.find({ isActive: true })
      .sort({ order: 1 })
      .limit(2);

    // Read template
    const templatePath = path.join(__dirname, '../templates/offer-template.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);

    // Prepare data
    const templateData = {
      projectName: project.name,
      clientName: project.clientName,
      clientContact: project.clientContact,
      clientEmail: project.clientEmail,
      clientPhone: project.clientPhone,
      description: project.description,
      mainBenefit: project.mainBenefit,
      offerDate: new Date().toLocaleDateString('pl-PL'),
      offerNumber: project.offerNumber || 'SS/2024/05/01',
      offerType: project.offerType || 'final',
      priceRange: project.priceRange,
      projectManager: project.projectManager,
      modules: project.modules,
      timeline: project.timeline,
      pricing: project.pricing,
      portfolio: portfolio,
      customReservations: project.customReservations || [],
      customPaymentTerms: project.customPaymentTerms || '10% zaliczki po podpisaniu umowy.\n90% po odbiorze końcowym projektu.',
      companyEmail: 'jakub.czajka@soft-synergy.com',
      companyPhone: '+48 793 868 886',
      companyNIP: '123-456-78-90'
    };

    const html = template(templateData);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error('Preview offer error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas generowania podglądu' });
  }
});



// Generate professional offer URL
router.get('/professional-url/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }
    
    // Generate slug from project name
    const slug = project.name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    
    const professionalUrl = `http://oferty.soft-synergy.com/oferta-finalna/${slug}`;
    
    res.json({
      professionalUrl,
      slug,
      projectName: project.name,
      message: 'Profesjonalny link został wygenerowany'
    });
    
  } catch (error) {
    console.error('Generate professional URL error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas generowania profesjonalnego linku' });
  }
});

module.exports = router;
 
// Generate contract PDF and mark project as accepted
router.post('/generate-contract/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('createdBy', 'firstName lastName email');
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    // Create generated-offers directory if it doesn't exist
    const outputDir = path.join(__dirname, '../generated-offers');
    await fs.mkdir(outputDir, { recursive: true });

    // Clean old contract PDFs for this project
    try {
      const existingFiles = await fs.readdir(outputDir);
      const projectFiles = existingFiles.filter(file => file.startsWith(`contract-${project._id}-`) && file.endsWith('.pdf'));
      for (const oldFile of projectFiles) {
        await fs.unlink(path.join(outputDir, oldFile));
      }
    } catch (e) {
      console.error('Contract cleanup error:', e);
    }

    // Generate simple contract PDF
    const { jsPDF } = require('jspdf');
    const doc = new jsPDF();

    const lines = [];
    lines.push('Umowa o Wykonanie Usług IT');
    lines.push('');
    lines.push(`Data: ${new Date().toLocaleDateString('pl-PL')}`);
    lines.push(`Numer oferty: ${project.offerNumber || '-'}`);
    lines.push('');
    lines.push('Strony umowy:');
    lines.push(`1) Soft Synergy (Wykonawca)`);
    lines.push(`2) ${project.clientName} (Zamawiający)`);
    lines.push('');
    lines.push('Przedmiot umowy:');
    lines.push(`${project.name} — ${project.mainBenefit || ''}`);
    lines.push('');
    lines.push('Zakres prac:');
    if (Array.isArray(project.modules) && project.modules.length) {
      project.modules.forEach((m, idx) => lines.push(`- ${idx + 1}. ${m.name}: ${m.description}`));
    } else {
      lines.push('- Zakres zgodnie z ofertą');
    }
    lines.push('');
    lines.push('Wynagrodzenie:');
    const total = project?.pricing?.total || 0;
    lines.push(`Łączna kwota netto: ${new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(total)}`);
    lines.push('Warunki płatności:');
    lines.push(project.customPaymentTerms || '10% zaliczki po podpisaniu umowy, 90% po odbiorze.');
    lines.push('');
    lines.push('Postanowienia końcowe:');
    lines.push('Szczegóły współpracy zgodnie z wygenerowaną ofertą finalną.');
    lines.push('Podpisy stron dostępne w dalszej korespondencji.');

    doc.setFontSize(12);
    const split = doc.splitTextToSize(lines.join('\n'), 180);
    doc.text(split, 15, 20);

    const pdfBuffer = doc.output('arraybuffer');
    const pdfFileName = `contract-${project._id}-${Date.now()}.pdf`;
    const pdfPath = path.join(outputDir, pdfFileName);
    await fs.writeFile(pdfPath, Buffer.from(pdfBuffer));

    // Save on project and mark accepted
    project.contractPdfUrl = `/generated-offers/${pdfFileName}`;
    project.status = 'accepted';
    await project.save();

    // Response with URLs
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    return res.json({
      message: 'Umowa została wygenerowana, status ustawiono na zaakceptowany',
      contractPdfUrl: project.contractPdfUrl,
      project
    });
  } catch (error) {
    console.error('Generate contract error:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas generowania umowy' });
  }
});