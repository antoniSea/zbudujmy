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
      // Project manager - zawsze Jakub Czajka
      projectManager: {
        name: "Jakub Czajka",
        position: "Project Manager",
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
      projectManager: project.projectManager,
      modules: project.modules,
      timeline: project.timeline,
      pricing: project.pricing,
      portfolio: portfolio,
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

// Download PDF offer
router.get('/download/:projectId/pdf', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    
    if (!project) {
      return res.status(404).json({ message: 'Projekt nie został znaleziony' });
    }

    if (!project.generatedOfferUrl) {
      return res.status(404).json({ message: 'Oferta nie została jeszcze wygenerowana' });
    }

    // Extract PDF filename from HTML filename
    const htmlFileName = project.generatedOfferUrl.split('/').pop();
    const pdfFileName = htmlFileName.replace('.html', '.pdf');
    const pdfPath = path.join(__dirname, '../generated-offers', pdfFileName);

    // Check if PDF exists
    try {
      await fs.access(pdfPath);
    } catch (error) {
      return res.status(404).json({ 
        message: 'Plik PDF nie został znaleziony. Spróbuj ponownie wygenerować ofertę.',
        error: 'PDF_NOT_FOUND'
      });
    }

    // Send PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="oferta-${project.name}.pdf"`);
    
    const pdfBuffer = await fs.readFile(pdfPath);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({ message: 'Błąd serwera podczas pobierania PDF' });
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
